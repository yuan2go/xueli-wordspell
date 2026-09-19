import { test, expect } from "@playwright/test";
import {
  start,
  button,
  move,
  morph,
  bag,
  sentence,
  toMeadow,
  picnicLanguage,
  snapshot,
  shot,
  object,
} from "./helpers.mjs";
async function solve(p, mode) {
  const state = await snapshot(p),
    variant = state.projection.activities[mode].variant;
  if (mode === "dress") {
    if (variant === 1) {
      await bag(p);
      await move(p, "cat-card", "放回地面 / 取出 / 摘下");
      await move(p, "hat-main", "野餐垫上 · on");
    }
    await morph(p, "cat-card", "p");
    await move(p, "cat-card", "戴在小猫头上");
    if (variant === 0) {
      await bag(p);
      await move(p, "hat-main", "背包里面 · in");
      await bag(p, false);
    }
  } else if (mode === "find") {
    if (variant === 1) {
      await expect(object(p, "cat-card")).toHaveCount(0);
      await move(p, "bag-main", "放回地面 / 取出 / 摘下");
      await sentence(p, "描述露出的帽子", "The cap is on the mat");
      await bag(p);
      await move(p, "cat-card", "背包里面 · in");
    } else {
      await bag(p);
      await sentence(p, "描述藏起来的帽子", "The hat is in the bag");
      await move(p, "hat-main", "野餐垫上 · on");
    }
  } else {
    await bag(p);
    await sentence(p, "用一句话收好小帽子", "Put the cap in the bag");
    if (variant === 0) {
      await morph(p, "route-sheet", "t");
      await sentence(p, "请小猫换个座位", "Put the cat on the mat");
    } else {
      await move(p, "hat-main", "戴在小猫头上");
      await morph(p, "route-sheet", "p");
    }
  }
  await expect(p.locator(".activity-success")).toBeVisible();
  return variant;
}
test("normal story unlocks activities; each of six authored variants played through HTTP, resumed and isolated", async ({
  page: p,
}) => {
  await p.setViewportSize({ width: 1024, height: 768 });
  await start(p);
  await toMeadow(p);
  await picnicLanguage(p);
  const original = (await snapshot(p)).projection.story;
  for (const [mode, name] of [
    ["dress", "帽子搭配"],
    ["find", "背包找物"],
    ["helper", "野餐小帮手"],
  ]) {
    await button(p, name).click();
    const variant = await solve(p, mode);
    await shot(p, `activity-${mode}`);
    await p.reload();
    await button(p, "继续冒险").click();
    expect((await snapshot(p)).projection.mode).toBe(mode);
    await expect(p.locator(".activity-success")).toBeVisible();
    await button(p, "返回故事").click();
    expect((await snapshot(p)).projection.story).toEqual(original);
    await button(p, name).click();
    await expect(p.locator(".activity-success")).toBeVisible();
    await button(p, "换个情境重玩").click();
    expect((await snapshot(p)).projection.activities[mode].variant).not.toBe(
      variant,
    );
    await solve(p, mode);
    await button(p, "返回故事").click();
  }
  expect((await snapshot(p)).projection.story).toEqual(original);
});
