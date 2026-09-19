import {
  DomainError,
  assertWorld,
  isWord,
  transition,
} from "../domain/world.ts";
import type {
  Effect,
  Entity,
  Location,
  World,
  WordId,
} from "../domain/world.ts";
import { ADVENTURE_VERSION, CRAFTS, WORD_TASKS } from "../content/adventure.ts";
import type {
  ActivityId,
  PracticeMode,
  SceneId,
} from "../content/adventure.ts";
import { AUDIO } from "../content/manifest.ts";
import {
  SENTENCES,
  SENTENCE_AUDIO,
  recapSentence,
} from "../content/sentences.ts";
import type { SentenceTask } from "../content/sentences.ts";
import { assemble, parseSentence, sameMeaning } from "./sentences.ts";
import { initialPicnic } from "./picnic.ts";
export type Mode = "story" | ActivityId;
export type ResultKind =
  | "done"
  | "valid"
  | "incomplete"
  | "structure"
  | "outside"
  | "mismatch"
  | "blocked"
  | "stale";
export interface Support {
  text: boolean;
  hint: boolean;
  demo: boolean;
  request: string;
  audio: string;
  audioSource: string;
  audioVersion: string;
  assetId: string;
  replays: number;
}
export interface Board {
  world: World;
  scene: SceneId;
  bagOpen: boolean;
  facts: string[];
  help: Record<string, Support>;
  variant: number;
  seed: number;
}
export interface Learning {
  id: string;
  mode: Mode;
  task: string;
  type:
    | "spelling"
    | "substitution"
    | "sentence-command"
    | "sentence-description"
    | "listening"
    | "operation"
    | "exploration";
  practice: PracticeMode;
  result: ResultKind;
  language: "correct" | "adjust" | "unassessed";
  evidence:
    | "guided"
    | "assisted"
    | "demonstrated"
    | "independent"
    | "audio-unverified"
    | "exploration";
  submitted: string;
  support: Support;
}
export interface Intent {
  action:
    | "word"
    | "craft"
    | "transform"
    | "place"
    | "bag"
    | "travel"
    | "sentence"
    | "find"
    | "help"
    | "audio"
    | "replay"
    | "activity"
    | "exit"
    | "restart-activity"
    | "finish";
  task?: string;
  word?: string;
  source?: string;
  target?: Location;
  ids?: string[];
  value?: string;
  request?: string;
  audioSource?: string;
  audioVersion?: string;
  assetId?: string;
}
export interface AdventureCommand extends Intent {
  sessionId: string;
  revision: number;
  mode: Mode;
  attemptId: string;
}
export interface Adventure {
  id: string;
  version: string;
  seed: number;
  revision: number;
  mode: Mode;
  story: Board;
  activities: Partial<Record<ActivityId, Board>>;
  journal: AdventureCommand[];
  events: Learning[];
  receipts: {
    id: string;
    fingerprint: string;
    kind: ResultKind;
    message: string;
  }[];
}
export interface AdventureResult {
  session: Adventure;
  kind: ResultKind;
  message: string;
  focus?: string;
}
const stage: Location = { kind: "stage" };
const emptySupport = (): Support => ({
  text: false,
  hint: false,
  demo: false,
  request: "",
  audio: "unplayed",
  audioSource: "unavailable",
  audioVersion: "",
  assetId: "",
  replays: 0,
});
export const board = (s: Adventure): Board =>
  s.mode === "story" ? s.story : s.activities[s.mode]!;
export function initialAdventure(id: string, seed = 1): Adventure {
  return {
    id,
    version: ADVENTURE_VERSION,
    seed: seed >>> 0,
    revision: 0,
    mode: "story",
    story: {
      world: { revision: 0, entities: {}, flags: [] },
      scene: "home",
      bagOpen: false,
      facts: [],
      help: {},
      variant: 0,
      seed: seed >>> 0,
    },
    activities: {},
    journal: [],
    events: [],
    receipts: [],
  };
}
const has = (b: Board, id: string) => b.facts.includes(id);
const fact = (b: Board, id: string) => {
  if (!has(b, id)) b.facts.push(id);
};
export function at(
  b: Board,
  id: string,
  kind: "in" | "on" | "worn",
  targetId?: string,
): boolean {
  const l = b.world.entities[id]?.location;
  return (
    !!l &&
    (kind === "worn"
      ? l.kind === "worn"
      : l.kind === "relation" && l.relation === kind) &&
    (!targetId || ("targetId" in l && l.targetId === targetId))
  );
}
export function occluded(b: Board, id: string): boolean {
  return (
    b.variant === 1 &&
    id === "cat-card" &&
    has(b, "activity-find") &&
    at(b, "bag-main", "on", "picnic-mat") &&
    at(b, id, "on", "picnic-mat")
  );
}
export function accessible(
  b: Board,
  id: string,
  seen = new Set<string>(),
): boolean {
  const e = b.world.entities[id];
  if (!e || seen.has(id) || occluded(b, id)) return false;
  seen.add(id);
  return (
    e.location.kind !== "relation" ||
    ((e.location.relation !== "in" || b.bagOpen) &&
      accessible(b, e.location.targetId, seen))
  );
}
export function availableWords(s: Adventure) {
  const b = board(s),
    e = b.world.entities;
  if (s.mode !== "story") return [];
  return WORD_TASKS.filter(
    (t) =>
      !e[t.entity] &&
      (t.id === "wake" || !!e["cat-companion"]) &&
      (t.id !== "hat" || !!e["bag-main"]) &&
      (t.id !== "mat" || b.scene === "meadow"),
  );
}
export function unlocked(s: Adventure, mode: ActivityId): boolean {
  const b = s.story,
    e = b.world.entities;
  if (mode === "dress") return !!e["hat-main"] && has(b, "morphed-card");
  if (mode === "find")
    return has(b, "sentence:pack-cap") && has(b, "sentence:describe-hat");
  return has(b, "sentence:invite-cat");
}
export function sentenceTasks(s: Adventure): SentenceTask[] {
  const b = board(s),
    e = b.world.entities;
  if (s.mode === "find")
    return [
      b.variant === 0 ? SENTENCES["find-inside"] : SENTENCES["find-behind"],
    ];
  if (s.mode === "helper")
    return b.variant === 0
      ? [SENTENCES["helper-seat"], SENTENCES["helper-pack"]]
      : [SENTENCES["helper-pack"]];
  if (
    s.mode !== "story" ||
    b.scene !== "meadow" ||
    !e["picnic-mat"] ||
    !e["hat-main"] ||
    e["cat-card"]?.word !== "cap"
  )
    return [];
  const tasks: SentenceTask[] = [
    SENTENCES["pack-cap"],
    SENTENCES["describe-hat"],
  ];
  if (has(b, "sentence:pack-cap") && has(b, "sentence:describe-hat"))
    tasks.push(SENTENCES["invite-cat"]);
  if (has(b, "sentence:invite-cat") && has(b, "found-map")) {
    const spare = at(b, "hat-main", "worn")
      ? "cap"
      : at(b, "cat-card", "worn")
        ? "hat"
        : null;
    const id = spare === "hat" ? "hat-main" : "cat-card";
    if (spare && (at(b, id, "in", "bag-main") || at(b, id, "on", "picnic-mat")))
      tasks.push(
        recapSentence(spare, at(b, id, "in", "bag-main") ? "in" : "on"),
      );
  }
  return tasks;
}
export function goals(
  s: Adventure,
): { id: string; label: string; done: boolean }[] {
  const b = board(s),
    e = b.world.entities;
  const g = (id: string, label: string, done: boolean) => ({ id, label, done });
  if (s.mode === "dress")
    return b.variant === 0
      ? [
          g(
            "hat",
            "选一顶喜欢的帽子戴上",
            at(b, "hat-main", "worn") || at(b, "cat-card", "worn"),
          ),
          g(
            "spare",
            "另一顶收好，合上背包",
            !b.bagOpen &&
              ((at(b, "hat-main", "worn") &&
                at(b, "cat-card", "in", "bag-main")) ||
                (at(b, "cat-card", "worn") &&
                  at(b, "hat-main", "in", "bag-main"))),
          ),
        ]
      : [
          g(
            "wind",
            "纸偶变成贴头帽，戴给小猫",
            e["cat-card"].word === "cap" && at(b, "cat-card", "worn"),
          ),
          g("leave", "宽檐帽留在垫子上", at(b, "hat-main", "on", "picnic-mat")),
        ];
  if (s.mode === "find")
    return b.variant === 0
      ? [
          g("observe", "描述藏起来的那顶", has(b, "sentence:find-inside")),
          g(
            "found",
            "把找到的帽子带到垫子上",
            at(b, "hat-main", "on", "picnic-mat"),
          ),
        ]
      : [
          g(
            "reveal",
            "挪开挡住帽檐的背包",
            !at(b, "bag-main", "on", "picnic-mat"),
          ),
          g("observe", "描述露出的帽子", has(b, "sentence:find-behind")),
          g("found", "收好刚找到的帽子", at(b, "cat-card", "in", "bag-main")),
        ];
  if (s.mode === "helper")
    return b.variant === 0
      ? [
          g(
            "seat",
            "给小猫另一处座位",
            e["route-sheet"].word === "mat" &&
              at(b, "cat-companion", "on", "route-sheet") &&
              has(b, "sentence:helper-seat"),
          ),
          g(
            "pack",
            "用一句话收好鸭舌帽",
            at(b, "cat-card", "in", "bag-main") &&
              has(b, "sentence:helper-pack"),
          ),
        ]
      : [
          g("map", "让路线纸空出来并恢复地图", e["route-sheet"].word === "map"),
          g("wear", "小猫戴好宽檐帽", at(b, "hat-main", "worn")),
          g(
            "pack",
            "用一句话收好小帽子",
            at(b, "cat-card", "in", "bag-main") &&
              has(b, "sentence:helper-pack"),
          ),
        ];
  if (b.scene === "home")
    return [
      g("wake", "唤醒旅行伙伴", !!e["cat-companion"]),
      g(
        "supplies",
        "带上能装东西和认路的物品",
        !!e["bag-main"] && e["route-sheet"]?.word === "map",
      ),
    ];
  if (b.scene === "trail")
    return [
      g("cross", "帮小猫安全通过湿墨", b.world.flags.includes("crossed-ink")),
      g(
        "navigate",
        "收回路线，找到下一站",
        b.world.flags.includes("crossed-ink") &&
          e["route-sheet"]?.word === "map",
      ),
    ];
  return [
    g("seat", "准备野餐座位", !!e["picnic-mat"]),
    g(
      "language",
      "试试指令和描述的不同用途",
      has(b, "sentence:pack-cap") && has(b, "sentence:describe-hat"),
    ),
    g(
      "invite",
      "用一句话邀请小猫入座",
      has(b, "sentence:invite-cat") &&
        at(b, "cat-companion", "on", "picnic-mat"),
    ),
    g("map", "听声音，找回家的路线", has(b, "found-map")),
    g(
      "choice",
      "选一顶戴着；另一顶收包或留在垫上",
      e["cat-card"]?.word === "cap" &&
        ((at(b, "hat-main", "worn") &&
          (at(b, "cat-card", "in", "bag-main") ||
            at(b, "cat-card", "on", "picnic-mat"))) ||
          (at(b, "cat-card", "worn") &&
            (at(b, "hat-main", "in", "bag-main") ||
              at(b, "hat-main", "on", "picnic-mat")))),
    ),
    g("recap", "回望并描述自己的布置", has(b, "sentence:recap")),
  ];
}
export const complete = (s: Adventure) => goals(s).every((g) => g.done);
function apply(b: Board, effect: Effect) {
  b.world = transition(b.world, {
    expectedRevision: b.world.revision,
    mode: "picnic",
    effect,
  });
}
function spawn(
  b: Board,
  id: string,
  word: WordId,
  kind: Entity["kind"] = "object",
) {
  apply(b, { type: "spawn", entity: { id, word, kind, location: stage } });
}
function activityBoard(mode: ActivityId, seed: number): Board {
  const variant = seed % 2;
  const b: Board = {
    world: initialPicnic("activity", mode, seed).world,
    scene: "meadow",
    bagOpen: false,
    facts: [`activity-${mode}`],
    help: {},
    variant,
    seed,
  };
  const put = (id: string, target: Location) =>
    apply(b, { type: "place", sourceId: id, target });
  if (mode === "dress" && variant === 1) {
    put("hat-main", { kind: "worn", targetId: "cat-companion" });
    put("cat-card", { kind: "relation", relation: "in", targetId: "bag-main" });
  }
  if (mode === "find") {
    put("cat-card", {
      kind: "relation",
      relation: "on",
      targetId: "picnic-mat",
    });
    if (variant === 1) {
      put("hat-main", stage);
      put("bag-main", {
        kind: "relation",
        relation: "on",
        targetId: "picnic-mat",
      });
      put("hat-main", {
        kind: "relation",
        relation: "in",
        targetId: "bag-main",
      });
    }
  }
  if (mode === "helper" && variant === 1) {
    apply(b, { type: "transform", sourceId: "route-sheet", to: "mat" });
    put("hat-main", {
      kind: "relation",
      relation: "on",
      targetId: "route-sheet",
    });
    put("cat-companion", {
      kind: "relation",
      relation: "on",
      targetId: "picnic-mat",
    });
  }
  return b;
}
function move(
  b: Board,
  source: string,
  target: Location,
  story: boolean,
): string {
  const e = b.world.entities[source];
  if (!e || !accessible(b, source))
    return "先打开背包或移开遮挡，再拿这件物品。";
  if (
    target.kind === "zone" &&
    (!story ||
      b.scene !== "trail" ||
      source !== "route-sheet" ||
      e.word !== "mat")
  )
    return "湿墨需要展开的路线纸来铺路。先看看这张纸的换字魔法。";
  if (
    target.kind === "relation" &&
    (!accessible(b, target.targetId) ||
      (target.relation === "in" && !b.bagOpen))
  )
    return "先把目标拿出来；收进背包前要打开袋口。";
  if (target.kind === "worn") {
    if (!["hat", "cap"].includes(e.word) || target.targetId !== "cat-companion")
      return "这里适合戴帽子；别的东西可以放到地面。";
    const old = Object.values(b.world.entities).find(
      (x) => at(b, x.id, "worn") && x.id !== source,
    );
    if (old) apply(b, { type: "place", sourceId: old.id, target: stage });
  }
  apply(b, { type: "place", sourceId: source, target });
  return "";
}
export function availableTargets(
  s: Adventure,
  source: string,
): { key: string; label: string; target: Location }[] {
  const b = board(s);
  const targets: { key: string; label: string; target: Location }[] = [
    { key: "ground", label: "放回地面 / 取出 / 摘下", target: stage },
  ];
  for (const e of Object.values(b.world.entities)) {
    if (e.word === "bag" && b.bagOpen)
      targets.push({
        key: e.id,
        label: "背包里面 · in",
        target: { kind: "relation", relation: "in", targetId: e.id },
      });
    if (e.word === "mat" && e.location.kind !== "zone")
      targets.push({
        key: e.id,
        label:
          e.id === "route-sheet"
            ? "纸张垫子上 · on"
            : e.id === "craft-mat"
              ? "备用垫上 · on"
              : "野餐垫上 · on",
        target: { kind: "relation", relation: "on", targetId: e.id },
      });
    if (e.kind === "actor")
      targets.push({
        key: e.id,
        label: "戴在小猫头上",
        target: { kind: "worn", targetId: e.id },
      });
  }
  if (b.scene === "trail")
    targets.push({
      key: "ink-road",
      label: "铺过湿墨",
      target: { kind: "zone", id: "ink-road" },
    });
  return targets.filter((t) => {
    if (t.key === source) return false;
    try {
      return !move(structuredClone(b), source, t.target, s.mode === "story");
    } catch {
      return false;
    }
  });
}
export function runAdventure(
  s: Adventure,
  c: AdventureCommand,
): AdventureResult {
  const reply = (
    kind: ResultKind,
    message: string,
    session = s,
    focus?: string,
  ): AdventureResult => ({ kind, message, session, focus });
  const fingerprint = JSON.stringify(c);
  const receipt = s.receipts.find((r) => r.id === c.attemptId);
  if (receipt)
    return receipt.fingerprint === fingerprint
      ? reply(receipt.kind, receipt.message)
      : reply("stale", "这次动作已更新，请重新选择。");
  if (c.sessionId !== s.id || c.revision !== s.revision || c.mode !== s.mode)
    return reply("stale", "场景已更新，请重新选择。");
  if (s.journal.length >= 6000)
    return reply("blocked", "本局记录已满。请先导出记录，再开始新故事。");
  const n = structuredClone(s);
  let b = board(n);
  let kind: ResultKind = "valid",
    message = "",
    focus = c.source;
  let type: Learning["type"] = "operation",
    practice: PracticeMode = "exploration",
    language: Learning["language"] = "unassessed";
  let record = false,
    submitted = c.word ?? c.value ?? c.source ?? c.action;
  const support = c.task ? (b.help[c.task] ?? emptySupport()) : emptySupport();
  try {
    switch (c.action) {
      case "activity": {
        const mode = c.value as ActivityId;
        if (!["dress", "find", "helper"].includes(mode) || !unlocked(n, mode))
          return reply("blocked", "先在故事里学会所需的物品和位置玩法。");
        n.activities[mode] ??= activityBoard(
          mode,
          (n.seed + ["dress", "find", "helper"].indexOf(mode)) >>> 0,
        );
        n.mode = mode;
        message = "来到短活动。故事布置已保留，随时可以回去。";
        break;
      }
      case "exit":
        n.mode = "story";
        message = "回到刚才的故事，物品还在原来的位置。";
        break;
      case "restart-activity": {
        if (n.mode === "story") return reply("blocked", "这里是主线故事。");
        n.activities[n.mode] = activityBoard(n.mode, (b.seed + 1) >>> 0);
        message = "换一个情境，再试试。上一局仍留在操作记录里。";
        break;
      }
      case "help": {
        if (!validTask(n, c.task))
          return reply("stale", "这个练习还没有开放。");
        if (!["text", "hint", "demo"].includes(c.value ?? ""))
          return reply("outside", "请选择提示方式。");
        b.help[c.task!] = { ...support, [c.value!]: true };
        message =
          c.value === "demo"
            ? "看过示范后请亲手尝试；记录会保留示范帮助。"
            : "帮助已开启，本次会如实记录。";
        break;
      }
      case "replay": {
        if (!validTask(n, c.task)) return reply("stale", "这个练习已更新。");
        b.help[c.task!] = { ...support, replays: support.replays + 1 };
        message = "再听一次；重听不算错误。";
        break;
      }
      case "audio": {
        const resource = [...AUDIO, ...SENTENCE_AUDIO].find(
          (a) => a.id === c.assetId,
        );
        const expectedText =
          availableWords(n).find((t) => t.id === c.task)?.word ??
          sentenceTasks(n).find((t) => t.id === c.task)?.example ??
          (c.task === "find-map"
            ? "Find the map."
            : c.task?.startsWith("morph:")
              ? morphTarget(b.world.entities[c.task.slice(6)]?.word)
              : undefined);
        if (
          !resource ||
          resource.version !== c.audioVersion ||
          resource.text !== expectedText ||
          !["recording", "development-speech", "unavailable"].includes(
            c.audioSource ?? "",
          ) ||
          (c.audioSource === "recording" && !resource.path) ||
          (c.audioSource === "development-speech" && resource.path)
        )
          return reply("stale", "忽略不属于本任务的语音。");

        if (
          !validTask(n, c.task) ||
          !c.request ||
          ![
            "loading",
            "playing",
            "completed",
            "failed",
            "cancelled",
            "muted",
          ].includes(c.value ?? "")
        )
          return reply("stale", "忽略旧语音。");
        if (
          c.value !== "loading" &&
          c.value !== "muted" &&
          c.value !== "failed" &&
          support.request !== c.request
        )
          return reply("stale", "忽略旧语音。");
        if (
          c.value !== "loading" &&
          support.request &&
          support.request !== c.request
        )
          return reply("stale", "忽略旧语音。");
        if (
          support.request === c.request &&
          ["completed", "failed", "cancelled", "muted"].includes(support.audio)
        )
          return reply("stale", "忽略已结束语音。");
        b.help[c.task!] = {
          ...support,
          request: c.request,
          audio: c.value!,
          audioSource: c.audioSource!,
          audioVersion: c.audioVersion!,
          assetId: c.assetId!,
        };
        break;
      }
      case "bag":
        if (!b.world.entities["bag-main"])
          return reply("blocked", "先找到旅行背包。");
        b.bagOpen = !b.bagOpen;
        message = b.bagOpen
          ? "小猫探头看：里面的东西可以点选、取出。"
          : "袋口合好了，里面的东西都还在。";
        record = true;
        break;
      case "word": {
        const task = availableWords(n).find((t) => t.id === c.task);
        if (!task)
          return reply("stale", "这件物品已经出现，或还没到需要它的情境。");
        if (!c.word || c.word.length !== task.word.length)
          return reply("incomplete", "先填好每个位置，再施法。");
        type = "spelling";
        practice = task.mode;
        record = true;
        if (c.word.toLowerCase() !== task.word) {
          kind = "mismatch";
          language = "adjust";
          message = isWord(c.word)
            ? "这个词也成立，但和刚才的声音不同。可在自由制作中使用；这里再听一次。"
            : "这个组合还没收录；听一听，调整字母。";
          break;
        }
        spawn(
          b,
          task.entity,
          task.word,
          task.id === "wake" ? "actor" : "object",
        );
        if (task.id === "bag") spawn(b, "cat-card", "cat", "token");
        language = "correct";
        message =
          task.kind === "restore"
            ? "文字回来了，物品也回来了。点它试一试！"
            : "一张新的野餐垫做好了；路线纸仍是原来那一张。";
        focus = task.entity;
        break;
      }
      case "craft": {
        if (b.scene !== "meadow")
          return reply(
            "blocked",
            "先用旅行物品解决眼前的问题；草地上会开放备用物品制作。",
          );
        const rule = CRAFTS.find((r) => r.word === c.word);
        if (!rule)
          return reply(
            "outside",
            "这里能制作一张备用 mat 或一顶备用 hat。伙伴和关键道具不能复制。",
          );
        if (b.world.entities[rule.id])
          return reply(
            "blocked",
            "这件备用物品已经做好了。点选它继续布置，每种只做一件。",
            s,
            rule.id,
          );
        spawn(b, rule.id, rule.word);
        focus = rule.id;
        type = "exploration";
        record = true;
        message = "你拼的词做成了一件真实备用物品。可以摆放、收纳，再取出来。";
        break;
      }
      case "transform": {
        const e = b.world.entities[c.source ?? ""];
        if (!e || !accessible(b, e.id))
          return reply("blocked", "先取出物品或移开遮挡。");
        if (!c.word || !isWord(c.word))
          return reply("outside", "这张纸只认识已学过的两个词尾。");
        if (
          n.mode === "story" &&
          e.id === "route-sheet" &&
          (b.scene === "home" ||
            (e.word === "mat" && !b.world.flags.includes("crossed-ink")))
        )
          return reply(
            "blocked",
            b.scene === "home"
              ? "先带地图走到小径，看看哪里需要它。"
              : "小猫还在这边。先亲自把垫子铺过湿墨，帮助它通过。",
          );
        const firstCard = e.id === "cat-card" && !has(b, "morphed-card");
        apply(b, { type: "transform", sourceId: e.id, to: c.word });
        if (e.id === "cat-card" && c.word === "cap") fact(b, "morphed-card");
        type = "substitution";
        practice =
          (e.id === "route-sheet" && !b.world.flags.includes("crossed-ink")) ||
          firstCard
            ? "teaching"
            : "exploration";
        record = true;
        language = "correct";
        message =
          c.word === "mat"
            ? b.scene === "trail"
              ? "同一张纸变成了垫子。小猫盯着湿墨，等你试着铺过去。"
              : "同一张纸变成了垫子。可以用它安排另一个座位。"
            : c.word === "map"
              ? "同一张纸恢复了路线，小猫又能认路了。"
              : c.word === "cap"
                ? "纸偶变成鸭舌帽！同伴仍在身边，等你试戴。"
                : "帽子变回纸偶；随时可以再变回来。";
        break;
      }
      case "place": {
        if (!c.source || !c.target)
          return reply("incomplete", "先选物品，再选位置。");
        const issue = move(b, c.source, c.target, n.mode === "story");
        if (issue) {
          kind = "blocked";
          message = issue;
          record = true;
          break;
        }
        record = true;
        message =
          c.target.kind === "zone"
            ? "垫子铺稳了！小猫踩着它到了对岸。现在可以收回纸张。"
            : c.target.kind === "worn"
              ? b.world.entities[c.source].word === "hat"
                ? "宽帽檐像一把小伞。小猫抬起头，扶正帽子。"
                : "小猫扶了扶鸭舌帽，开心地点头。"
              : c.target.kind === "stage"
                ? "放回地面了。小猫给你让出位置，可以再摆、再变。"
                : c.target.relation === "in"
                  ? "咚，物品进包里了。打开袋口还可以取出。"
                  : "物品真的摆上去了。小猫看看你的新布置。";
        break;
      }
      case "travel": {
        if (
          n.mode !== "story" ||
          !complete(n) ||
          !["trail", "meadow"].includes(c.value ?? "") ||
          (b.scene === "home"
            ? c.value !== "trail"
            : b.scene !== "trail" || c.value !== "meadow")
        )
          return reply("blocked", "先看看眼前的问题，还有什么需要安排。");
        b.scene = c.value as SceneId;
        message =
          b.scene === "trail"
            ? "糟了，前面是湿墨！小猫缩回爪子。"
            : "来到草地了。先看看物品，决定从哪里开始。";
        record = true;
        break;
      }
      case "sentence": {
        const task = sentenceTasks(n).find((t) => t.id === c.task);
        if (!task) return reply("stale", "这句话的情境已更新，先重新观察。");
        const text = assemble(task, c.ids ?? []);
        if (text === undefined)
          return reply(
            "outside",
            "同一块词只能用一次；两个 the 有各自的词块。",
          );
        submitted = text;
        const parsed = parseSentence(text);
        if (parsed.status === "incomplete")
          return reply("incomplete", parsed.message);
        record = true;
        type =
          task.mapping === "place"
            ? "sentence-command"
            : "sentence-description";
        practice = task.mode;
        if (parsed.status !== "valid") {
          kind = parsed.status;
          message = parsed.message;
          language = kind === "structure" ? "adjust" : "unassessed";
          break;
        }
        language = "correct";
        if (!sameMeaning(parsed.meaning, task.target)) {
          kind = "mismatch";
          message =
            parsed.meaning.kind !== task.target.kind
              ? task.mapping === "place"
                ? "这是一句描述，不会搬动物品。要请它行动，用 Put 开头。"
                : "这是一句指令。这里请观察，用 is 描述，不需要搬动。"
              : "这句话成立；再看看要说的是哪件物品、里面还是上面。";
          break;
        }
        if (
          b.world.entities[task.sourceId]?.word !== task.target.source ||
          b.world.entities[task.targetId]?.word !== task.target.target
        ) {
          kind = "blocked";
          message = "句子成立，但物品形态还不合适。先取出并换字，再试这句话。";
          break;
        }
        if (task.mapping === "observe") {
          if (!accessible(b, task.sourceId)) {
            kind = "blocked";
            message = "句子成立；先打开包或移开遮挡，亲眼确认位置。";
            break;
          }
          if (!at(b, task.sourceId, task.target.relation, task.targetId)) {
            kind = "mismatch";
            message = "句子成立，但眼前不是这样。调整布置，或撤回词块再观察。";
            break;
          }
          message = "描述和眼前一致。小猫顺着你的话看到了它；物品没有被移动。";
        } else {
          const issue = move(
            b,
            task.sourceId,
            {
              kind: "relation",
              relation: task.target.relation,
              targetId: task.targetId,
            },
            n.mode === "story",
          );
          if (issue) {
            kind = "blocked";
            message = `句子成立。${issue}`;
            break;
          }
          message = "句子说通了，物品也行动了！看看它的新位置。";
        }
        fact(b, `sentence:${task.id}`);
        break;
      }
      case "find": {
        if (
          n.mode !== "story" ||
          b.scene !== "meadow" ||
          !has(b, "sentence:invite-cat")
        )
          return reply("blocked", "先邀请小猫入座，再听它想找什么。");
        record = true;
        type = "listening";
        practice = "revisit";
        if (!c.source || !accessible(b, c.source))
          return reply("blocked", "先打开包，或取出挡住的东西。");
        if (
          c.source !== "route-sheet" ||
          b.world.entities[c.source].word !== "map"
        ) {
          kind = "mismatch";
          language = "adjust";
          message =
            "这件物品还不是声音里的路线图。再听一次，或先把纸恢复成地图。";
          break;
        }
        fact(b, "found-map");
        language = "correct";
        message = "路线找到了！小猫看看地图，安心地留下来野餐。";
        break;
      }
      case "finish":
        if (n.mode !== "story" || b.scene !== "meadow" || !complete(n))
          return reply("blocked", "再看看小猫的需要，以及你最后选的布置。");
        fact(b, "ending");
        message = "野餐开始啦！这一次的帽子、座位和收纳都是你的选择。";
        record = true;
        break;
      default:
        return reply("outside", "这个动作不在当前故事里。");
    }
  } catch (error) {
    if (!(error instanceof DomainError)) throw error;
    // An atomic failure discards every tentative effect, including a previous hat removal.
    const failed = structuredClone(s);
    return commit(
      failed,
      c,
      "blocked",
      error.code === "TARGET_IN_USE"
        ? "先移走上面的物品；包里或戴着的物品先取出、摘下，再换字。"
        : error.code === "PROTECTED_ACTOR"
          ? "伙伴不能变形。请选旁边的小猫纸偶。"
          : "这个位置放不下。放回地面，再试别的位置。",
      undefined,
      {
        id: c.attemptId,
        mode: s.mode,
        task: c.task ?? "",
        type: "operation",
        practice: "exploration",
        result: "blocked",
        language: "unassessed",
        evidence: "exploration",
        submitted,
        support,
      },
    );
  }
  b = board(n);
  assertWorld(b.world);
  if (kind === "valid" && complete(n)) kind = "done";
  const evidence: Learning["evidence"] =
    practice === "exploration"
      ? "exploration"
      : support.demo
        ? "demonstrated"
        : practice === "teaching"
          ? "guided"
          : support.text || support.hint || practice === "assisted"
            ? "assisted"
            : type === "spelling" || type === "listening"
              ? ["playing", "completed"].includes(support.audio)
                ? "independent"
                : "audio-unverified"
              : "independent";
  return commit(
    n,
    c,
    kind,
    message,
    focus,
    record
      ? {
          id: c.attemptId,
          mode: s.mode,
          task: c.task ?? "",
          type,
          practice,
          result: kind,
          language,
          evidence,
          submitted,
          support: structuredClone(support),
        }
      : undefined,
  );
}
function commit(
  n: Adventure,
  c: AdventureCommand,
  kind: ResultKind,
  message: string,
  focus?: string,
  event?: Learning,
): AdventureResult {
  n.revision++;
  n.journal.push(structuredClone(c));
  n.receipts.push({
    id: c.attemptId,
    fingerprint: JSON.stringify(c),
    kind,
    message,
  });
  if (event) n.events.push(event);
  return { session: n, kind, message, focus };
}
function validTask(s: Adventure, task?: string): boolean {
  return (
    !!task &&
    (availableWords(s).some((t) => t.id === task) ||
      sentenceTasks(s).some((t) => t.id === task) ||
      (task === "find-map" && board(s).scene === "meadow") ||
      (task.startsWith("morph:") && !!board(s).world.entities[task.slice(6)]))
  );
}

function morphTarget(word?: WordId): string | undefined {
  return word === "map"
    ? "mat"
    : word === "mat"
      ? "map"
      : word === "cat"
        ? "cap"
        : word === "cap"
          ? "cat"
          : undefined;
}
