import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import {
  start,
  button,
  word,
  bag,
  move,
  morph,
  sentence,
  object,
  toMeadow,
  picnicLanguage,
  finish,
  snapshot,
  shot,
  viewportOK,
  KEY,
} from "./helpers.mjs";
test("phone normal HTTP entrance: early reversible exploration, all acts, real crossing, sentences, choices and restore", async ({
  browser,
}) => {
  await mkdir("docs/evidence/gameplay-core-04", { recursive: true });
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const p = await c.newPage();
  const errors = [],
    failed = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  p.on("response", (r) => {
    if (r.status() >= 400) failed.push(r.url());
  });
  await start(p);
  await toMeadow(p, { drag: true });
  await viewportOK(p);
  await button(p, "暂停").click();
  await expect(p.getByRole("dialog")).toBeVisible();
  await button(p, "静音").click();
  await button(p, "继续冒险").click();
  await p.reload();
  await button(p, "继续冒险").click();
  expect((await snapshot(p)).projection.story.scene).toBe("meadow");
  await p.getByRole("button", { name: /^帮背包收一件东西/ }).click();
  await shot(p, "phone-sentence");
  await button(p, "收起工具").click();
  await picnicLanguage(p);
  await finish(p, true);
  await shot(p, "phone-ending");
  const saved = await snapshot(p);
  expect(saved.projection.story.world.entities["cat-card"].location.kind).toBe(
    "worn",
  );
  expect(
    saved.projection.story.world.entities["hat-main"].location.targetId,
  ).toBe("bag-main");
  expect(saved.projection.story.world.flags).toContain("crossed-ink");
  await p.reload();
  await button(p, "继续冒险").click();
  await expect(p.getByRole("heading", { name: "野餐开始啦！" })).toBeVisible();
  await button(p, "回顾这次冒险").click();
  await expect(p.locator(".quest-records")).toContainText("使用了帮助");
  await expect(p.locator(".quest-records")).toContainText("观察描述");
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
  await c.close();
});
test("desktop alternative preparation order, sentence reversal and actual world feedback", async ({
  page: p,
}) => {
  await p.setViewportSize({ width: 1440, height: 1000 });
  await start(p);
  await toMeadow(p, { reverse: true });
  await p.getByRole("button", { name: /^帮背包收一件东西/ }).click();
  for (const part of ["the", "Put", "cap", "in", "the", "bag", "."])
    await p
      .locator(".word-blocks button:enabled")
      .filter({ hasText: new RegExp(`^${part === "." ? "\\." : part}$`, "i") })
      .first()
      .click();
  await button(p, "句子第1块 the").click();
  await button(p, "词块右移").click();
  await button(p, "句子第7块 .").click();
  await button(p, "撤回词块").click();
  await expect(p.locator(".sentence-line")).toHaveText("Putthecapinthebag");
  await button(p, "说出这句话").click();
  await expect(button(p, "收起工具")).toHaveCount(0);
  await move(p, "hat-main", "野餐垫上 · on");
  await sentence(p, "告诉小猫你看见了什么", "on the mat is the hat");
  await sentence(p, "邀请朋友入座", "Put the cat on the mat");
  await finish(p);
  await shot(p, "desktop-ending");
  await viewportOK(p);
  await p.getByRole("button", { name: /^自由制作/ }).click();
  for (const letter of "mat") await button(p, `字母 ${letter}`).click();
  await p.getByRole("button", { name: /^施法/ }).click();
  await expect(object(p, "craft-mat")).toBeVisible();
  await move(p, "route-sheet", "备用垫上 · on");
  expect(
    (await snapshot(p)).projection.story.world.entities["route-sheet"].location
      .targetId,
  ).toBe("craft-mat");
  const saved = await snapshot(p);
  expect(saved.projection.story.world.entities["route-sheet"].word).toBe("map");
  expect(
    saved.projection.events.filter((e) => e.task === "pack-cap").at(-1)
      .language,
  ).toBe("correct");
});
test("true touch, cancellation, missed drop, background, keyboard and small/Pad layouts preserve input", async ({
  browser,
}) => {
  for (const viewport of [
    { width: 360, height: 640 },
    { width: 1024, height: 768 },
  ]) {
    const c = await browser.newContext({ viewport, hasTouch: true });
    const p = await c.newPage();
    await start(p);
    await button(p, "唤醒伙伴").click();
    const source = button(p, "字母 c"),
      target = button(p, "第1格 空");
    const a = await source.boundingBox(),
      b = await target.boundingBox();
    const cdp = await c.newCDPSession(p);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: a.x + a.width / 2, y: a.y + a.height / 2, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchCancel",
      touchPoints: [],
    });
    await expect(button(p, "第1格 空")).toBeVisible();
    await p.waitForTimeout(360);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: a.x + a.width / 2, y: a.y + a.height / 2, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(button(p, "第1格 c")).toBeVisible();
    await p.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await expect(p.getByRole("dialog")).toBeVisible();
    for (let i = 0; i < 9; i++) {
      await p.keyboard.press("Tab");
      expect(
        await p.evaluate(() => !!document.activeElement.closest("dialog")),
      ).toBe(true);
    }
    await button(p, "继续冒险").click();
    await expect(button(p, "第1格 c")).toBeVisible();
    const a2 = await button(p, "字母 a").boundingBox();
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: a2.x + a2.width / 2, y: a2.y + a2.height / 2, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 6, y: 6, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(button(p, "第2格 空")).toBeVisible();
    await p.waitForTimeout(360);
    await button(p, "字母 a").focus();
    await p.keyboard.press("Enter");
    await button(p, "字母 t").click();
    await p.getByRole("button", { name: /^施法/ }).click();
    await word(p, "map", "map", true);
    await word(p, "bag", "bag");
    await button(p, "沿小径出发 →").click();
    await morph(p, "route-sheet", "t");
    await viewportOK(p);
    await shot(
      p,
      viewport.width === 1024 ? "pad-crossing" : "small-phone-crossing",
    );
    const before = await snapshot(p);
    await object(p, "route-sheet").dispatchEvent("pointerdown", {
      pointerId: 4,
      isPrimary: true,
      button: 0,
      clientX: 40,
      clientY: 200,
    });
    await p.setViewportSize({ width: viewport.height, height: viewport.width });
    await object(p, "route-sheet").dispatchEvent("pointercancel", {
      pointerId: 4,
    });
    expect((await snapshot(p)).projection.story.world).toEqual(
      before.projection.story.world,
    );
    await cdp.detach();
    await c.close();
  }
});
