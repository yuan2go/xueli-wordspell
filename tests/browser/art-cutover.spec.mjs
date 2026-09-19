import { test, expect } from "@playwright/test";
import { start, button, word, snapshot, KEY } from "./helpers.mjs";
test("asset/audio fallback, retries and corrupt/legacy save protection retain real progress", async ({
  browser,
}) => {
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  await c.addInitScript(() => {
    Object.defineProperty(crypto, "randomUUID", { value: undefined });
    Object.defineProperty(crypto, "subtle", { value: undefined });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        cancel() {},
        speak(u) {
          u.onerror?.();
        },
      },
    });
  });
  const p = await c.newPage();
  await p.route("**/assets/game/tabby/cat-idle.webp", (r) => r.abort());
  await start(p);
  await word(p, "wake", "cat");
  await expect(p.getByRole("alert").filter({ hasText: "插画" })).toBeVisible();
  await word(p, "map", "map", true);
  await p.unroute("**/assets/game/tabby/cat-idle.webp");
  await button(p, "重试资源").click();
  await expect(p.locator(".art-fallback")).toHaveCount(0);
  expect(
    (await snapshot(p)).projection.events.find((e) => e.task === "map")
      .evidence,
  ).toBe("assisted");
  await p.evaluate((key) => localStorage.setItem(key, "{broken"), KEY);
  await p.reload();
  await button(p, "开始冒险").click();
  await expect(p.getByRole("dialog")).toBeVisible();
  await button(p, "返回").click();
  expect(await p.evaluate((key) => localStorage.getItem(key), KEY)).toBe(
    "{broken",
  );
  await button(p, "开始冒险").click();
  await button(p, "确认开始新冒险").click();
  await word(p, "wake", "cat");
  expect(
    await p.evaluate(
      (key) =>
        Object.keys(localStorage).some(
          (k) =>
            k.startsWith(`${key}.backup.`) && localStorage[k] === "{broken",
        ),
      KEY,
    ),
  ).toBe(true);
  await c.close();
  const denied = await browser.newContext();
  await denied.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("denied");
    };
    Storage.prototype.setItem = () => {
      throw new Error("denied");
    };
  });
  const q = await denied.newPage();
  await start(q);
  await word(q, "wake", "cat");
  await expect(q.getByRole("alert")).toContainText("进度可能不保留");
  await denied.close();
});
