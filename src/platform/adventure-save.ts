import { ADVENTURE_VERSION } from "../content/adventure.ts";
import {
  board,
  goals,
  initialAdventure,
  runAdventure,
} from "../game/adventure.ts";
import type { Adventure, AdventureCommand } from "../game/adventure.ts";
import { decode as decodeLegacy, SAVE_KEY as LEGACY_KEY } from "./save.ts";
export const ADVENTURE_KEY = "xueli.adventure.v4";
function projection(s: Adventure) {
  return {
    story: s.story,
    activities: s.activities,
    mode: s.mode,
    goals: goals(s),
    events: s.events,
  };
}
export function encodeAdventure(s: Adventure): string {
  return JSON.stringify({
    schema: 4,
    content: ADVENTURE_VERSION,
    id: s.id,
    seed: s.seed,
    journal: s.journal,
    projection: projection(s),
  });
}
function record(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
export function decodeAdventure(raw: string): Adventure {
  if (raw.length > 4_000_000) throw new Error("存档过大，原始记录已保留。");
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    throw new Error("存档损坏，原始记录已保留。");
  }
  if (!record(v) || v.schema !== 4 || v.content !== ADVENTURE_VERSION)
    throw new Error("内容版本不同；不能猜测目标进度。请导出原档或明确重开。");
  if (
    typeof v.id !== "string" ||
    !/^[\w-]{1,100}$/.test(v.id) ||
    !Number.isSafeInteger(v.seed) ||
    Number(v.seed) < 0 ||
    Number(v.seed) > 0xffffffff ||
    !Array.isArray(v.journal) ||
    v.journal.length > 6000
  )
    throw new Error("存档结构损坏，原档已保留。");
  let s = initialAdventure(v.id, Number(v.seed));
  const keys = [
    "sessionId",
    "revision",
    "mode",
    "attemptId",
    "action",
    "task",
    "word",
    "source",
    "target",
    "ids",
    "value",
    "request",
    "audioSource",
    "audioVersion",
    "assetId",
  ];
  for (const item of v.journal) {
    if (
      !record(item) ||
      Object.keys(item).some((k) => !keys.includes(k)) ||
      typeof item.attemptId !== "string" ||
      !/^[\w-]{1,100}$/.test(item.attemptId) ||
      !Number.isSafeInteger(item.revision) ||
      typeof item.action !== "string" ||
      [
        "task",
        "word",
        "source",
        "value",
        "request",
        "sessionId",
        "mode",
        "audioSource",
        "audioVersion",
        "assetId",
      ].some(
        (k) =>
          item[k] !== undefined &&
          (typeof item[k] !== "string" || (item[k] as string).length > 120),
      ) ||
      (item.ids !== undefined &&
        (!Array.isArray(item.ids) ||
          item.ids.length > 20 ||
          item.ids.some((x) => typeof x !== "string" || x.length > 100))) ||
      (item.target !== undefined &&
        (!record(item.target) ||
          Object.keys(item.target).some(
            (k) => !["kind", "id", "relation", "targetId"].includes(k),
          ) ||
          Object.values(item.target).some(
            (x) => typeof x !== "string" || x.length > 80,
          )))
    )
      throw new Error("存档操作损坏，原档已保留。");
    const r = runAdventure(s, item as unknown as AdventureCommand);
    if (r.session === s) throw new Error("存档操作无法重放，原始记录已保留。");
    s = r.session;
  }
  if (JSON.stringify(projection(s)) !== JSON.stringify(v.projection))
    throw new Error("存档世界与真实操作不一致，原档已保留。");
  board(s);
  return s;
}
export function backup(key: string): void {
  const raw = localStorage.getItem(key);
  if (raw === null) return;
  const destination = `${key}.backup.${hashText(raw)}`;
  const previous = localStorage.getItem(destination);
  if (previous !== null && previous !== raw)
    throw new Error("备份位置存在其他记录。请先导出，原档没有覆盖。");
  localStorage.setItem(destination, raw);
  if (localStorage.getItem(destination) !== raw)
    throw new Error("备份未成功，原档没有覆盖。");
}
function hashText(raw: string) {
  let h = 2166136261;
  for (const c of raw) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16);
}
export function loadAdventure(): {
  session?: Adventure;
  warning: string;
  blocked: boolean;
  legacy: boolean;
} {
  let foundExisting = false;
  try {
    const raw = localStorage.getItem(ADVENTURE_KEY);
    foundExisting = raw !== null;
    if (raw) {
      try {
        return {
          session: decodeAdventure(raw),
          warning: "",
          blocked: false,
          legacy: false,
        };
      } catch (e) {
        return { warning: (e as Error).message, blocked: true, legacy: false };
      }
    }
    const old = localStorage.getItem(LEGACY_KEY);
    if (old) {
      foundExisting = true;
      backup(LEGACY_KEY);
      let known = false;
      try {
        decodeLegacy(old);
        known = true;
      } catch {
        /* Preserve unknown bytes too. */
      }
      return {
        warning: `${known ? "已识别旧版线性故事并备份" : "发现其他版本记录，已原样备份"}。新故事的目标不同，不能把旧步数当作新目标。可导出旧记录，再明确开始新冒险。`,
        blocked: true,
        legacy: true,
      };
    }
    return { warning: "", blocked: false, legacy: false };
  } catch (e) {
    return {
      warning: `本次进度可能不保留：${(e as Error).message}`,
      blocked: foundExisting,
      legacy: false,
    };
  }
}
export function saveAdventure(s: Adventure): string {
  try {
    localStorage.setItem(ADVENTURE_KEY, encodeAdventure(s));
    return "";
  } catch {
    return "本次进度可能不保留：保存失败。请导出本局记录。";
  }
}
export function exportRecords(s: Adventure): string {
  const stored: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (key.startsWith("wordspell.") || key.startsWith("xueli.adventure."))
        stored[key] = localStorage.getItem(key)!;
    }
  } catch {
    /* In-memory export remains possible when storage is unavailable. */
  }
  return JSON.stringify(
    { current: JSON.parse(encodeAdventure(s)), stored },
    null,
    2,
  );
}
