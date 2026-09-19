import { expect } from "@playwright/test";
export const KEY = "xueli.adventure.v4";
export const button = (p, name) => p.getByRole("button", { name, exact: true });
export const object = (p, id) => p.locator(`[data-entity="${id}"]`);
export async function start(p) {
  await p.goto("/");
  await p.waitForLoadState("networkidle");
  await button(p, "开始冒险").click();
}
export async function snapshot(p) {
  return p.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY);
}
export async function closeTool(p) {
  if (await button(p, "收起工具").isVisible())
    await button(p, "收起工具").click();
}
export async function select(p, id) {
  await closeTool(p);
  if ((await object(p, id).getAttribute("aria-pressed")) !== "true")
    await object(p, id).click();
}
export async function word(p, task, word, help = false) {
  const labels = {
    wake: "唤醒伙伴",
    bag: "找回旅行背包",
    map: "找回路线",
    hat: "找回遮阳物品",
    mat: "制作野餐座位",
  };
  await button(p, labels[task]).click();
  if (help) await button(p, "文字辅助").click();
  for (const letter of word) await button(p, `字母 ${letter}`).click();
  await p.getByRole("button", { name: /^施法/ }).click();
  await expect(button(p, "收起工具")).toHaveCount(0);
}
export async function move(p, id, target) {
  await select(p, id);
  await p
    .locator(".context-actions")
    .getByRole("button", { name: target, exact: true })
    .click();
}
export async function bag(p, open = true) {
  await select(p, "bag-main");
  await button(p, open ? "打开背包" : "合上背包").click();
}
export async function morph(p, id, to) {
  await select(p, id);
  await button(p, "试试换字").click();
  const from = (await button(p, "第3格 p").count()) ? "p" : "t";
  await button(p, `第3格 ${from}`).click();
  await button(p, `字母 ${to}`).click();
  await p.getByRole("button", { name: /^施法/ }).click();
  await expect(button(p, "收起工具")).toHaveCount(0);
}
export async function sentence(p, title, text, help = false) {
  await closeTool(p);
  await p.getByRole("button", { name: new RegExp(`^${title}`) }).click();
  if (help) await button(p, "文字辅助").click();
  for (const part of text.split(" ")) {
    await p
      .locator(".word-blocks button:enabled")
      .filter({ hasText: new RegExp(`^${part}$`, "i") })
      .first()
      .click();
  }
  await button(p, "说出这句话").click();
  await expect(button(p, "收起工具")).toHaveCount(0);
}
export async function toMeadow(p, { reverse = false, drag = false } = {}) {
  await word(p, "wake", "cat");
  if (reverse) await word(p, "map", "map", true);
  await word(p, "bag", "bag");
  await bag(p);
  await word(p, "hat", "hat");
  await move(p, "hat-main", "戴在小猫头上");
  await morph(p, "cat-card", "p");
  await move(p, "cat-card", "背包里面 · in");
  await bag(p, false);
  await bag(p);
  await move(p, "cat-card", "放回地面 / 取出 / 摘下");
  if (!reverse) await word(p, "map", "map", true);
  await button(p, "沿小径出发 →").click();
  await expect(p.locator(".quest-scene")).toHaveAttribute(
    "data-scene",
    "trail",
  );
  await morph(p, "route-sheet", "t");
  if (drag) await dragTo(p, object(p, "route-sheet"), button(p, "湿墨小径"));
  else await move(p, "route-sheet", "铺过湿墨");
  await expect(p.locator(".quest-scene")).toHaveAttribute(
    "data-crossed",
    "true",
  );
  await move(p, "route-sheet", "放回地面 / 取出 / 摘下");
  await morph(p, "route-sheet", "p");
  await button(p, "跟着地图去草地 →").click();
  await word(p, "mat", "mat", true);
}
export async function picnicLanguage(p) {
  await sentence(p, "帮背包收一件东西", "Put the cap in the bag");
  await move(p, "hat-main", "野餐垫上 · on");
  await sentence(p, "告诉小猫你看见了什么", "The hat is on the mat", true);
  await sentence(p, "邀请朋友入座", "Put the cat on the mat");
}
export async function finish(p, cap = false) {
  await p
    .getByRole("button", { name: "听听小猫想找什么 →", exact: true })
    .click();
  await button(p, "文字辅助").click();
  await object(p, "route-sheet").click();
  await move(p, cap ? "cat-card" : "hat-main", "戴在小猫头上");
  await move(
    p,
    cap ? "hat-main" : "cat-card",
    cap ? "背包里面 · in" : "野餐垫上 · on",
  );
  await sentence(
    p,
    "回望我们的布置",
    cap ? "The hat is in the bag" : "The cap is on the mat",
  );
  await button(p, "开始我们的野餐").click();
  await expect(p.getByRole("heading", { name: "野餐开始啦！" })).toBeVisible();
}
export async function dragTo(p, source, target, cancel = false) {
  const a = await source.boundingBox(),
    b = await target.boundingBox();
  await p.mouse.move(a.x + a.width / 2, a.y + a.height * 0.7);
  await p.mouse.down();
  await p.mouse.move(b.x + b.width / 2, b.y + b.height * 0.7, { steps: 12 });
  if (cancel) await source.dispatchEvent("pointercancel", { pointerId: 1 });
  await p.mouse.up();
}
export async function shot(p, name) {
  await p.evaluate(async () =>
    Promise.all([...document.images].map((i) => i.decode().catch(() => {}))),
  );
  await p.screenshot({
    path: `docs/evidence/gameplay-core-04/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
export async function viewportOK(p) {
  expect(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  const b = await p.locator(".quest-scene").boundingBox();
  expect(b.height).toBeGreaterThan(200);
  expect(b.y + b.height).toBeLessThan((await p.viewportSize()).height);
}
