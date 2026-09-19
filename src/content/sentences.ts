import type { WordId } from "../domain/world.ts";
import type { PracticeMode } from "./adventure.ts";
export interface Meaning {
  kind: "command" | "description";
  source: WordId;
  relation: "in" | "on";
  target: WordId;
}
export interface SentenceTask {
  id: string;
  title: string;
  context: string;
  mode: PracticeMode;
  target: Meaning;
  sourceId: string;
  targetId: string;
  example: string;
  tokens: { id: string; text: string }[];
  accepted: readonly string[];
  mapping: "place" | "observe";
}
function sentence(
  id: string,
  title: string,
  context: string,
  mode: PracticeMode,
  target: Meaning,
  sourceId: string,
  targetId: string,
): SentenceTask {
  const example =
    target.kind === "command"
      ? `Put the ${target.source} ${target.relation} the ${target.target}.`
      : `The ${target.source} is ${target.relation} the ${target.target}.`;
  const words = [
    "the",
    "hat",
    "in",
    "Put",
    "bag",
    "the",
    "on",
    "cap",
    "mat",
    "is",
    "cat",
    "map",
    ".",
  ];
  return {
    id,
    title,
    context,
    mode,
    target,
    sourceId,
    targetId,
    example,
    tokens: words.map((text, i) => ({ id: `${id}-${i}`, text })),
    accepted:
      target.kind === "command"
        ? ["Put the <object> <place>.", "<place>, put the <object>."]
        : ["The <object> is <place>.", "<place> is the <object>."],
    mapping: target.kind === "command" ? "place" : "observe",
  };
}
const command = (
  source: WordId,
  relation: "in" | "on",
  target: WordId,
): Meaning => ({ kind: "command", source, relation, target });
const describe = (
  source: WordId,
  relation: "in" | "on",
  target: WordId,
): Meaning => ({ kind: "description", source, relation, target });
export const SENTENCES = {
  "pack-cap": sentence(
    "pack-cap",
    "帮背包收一件东西",
    "Put 是请物品行动；in 是里面。先打开背包，试着用一句话把鸭舌帽收进去。",
    "teaching",
    command("cap", "in", "bag"),
    "cat-card",
    "bag-main",
  ),
  "describe-hat": sentence(
    "describe-hat",
    "告诉小猫你看见了什么",
    "on 是在上面。把宽檐帽摆到野餐垫上，再说说看到的布置。描述句不会搬动物品。",
    "assisted",
    describe("hat", "on", "mat"),
    "hat-main",
    "picnic-mat",
  ),
  "invite-cat": sentence(
    "invite-cat",
    "邀请朋友入座",
    "朋友还站着。用一句指令邀请它坐到野餐垫上。",
    "independent",
    command("cat", "on", "mat"),
    "cat-companion",
    "picnic-mat",
  ),
  "find-inside": sentence(
    "find-inside",
    "描述藏起来的帽子",
    "观察两顶帽子。说出藏着的那顶在哪里，然后拿到垫子上。",
    "revisit",
    describe("hat", "in", "bag"),
    "hat-main",
    "bag-main",
  ),
  "find-behind": sentence(
    "find-behind",
    "描述露出的帽子",
    "移开遮挡后，看看刚露出的帽子在哪里。",
    "revisit",
    describe("cap", "on", "mat"),
    "cat-card",
    "picnic-mat",
  ),
  "helper-seat": sentence(
    "helper-seat",
    "请小猫换个座位",
    "用指令让小猫坐到路线纸变成的新垫子上。",
    "revisit",
    command("cat", "on", "mat"),
    "cat-companion",
    "route-sheet",
  ),
  "helper-pack": sentence(
    "helper-pack",
    "用一句话收好小帽子",
    "用指令把鸭舌帽放进背包；也可以先准备新座位。",
    "revisit",
    command("cap", "in", "bag"),
    "cat-card",
    "bag-main",
  ),
} satisfies Record<string, SentenceTask>;
export function recapSentence(
  source: "hat" | "cap",
  relation: "in" | "on",
): SentenceTask {
  return sentence(
    "recap",
    "回望我们的布置",
    "离开教学一会儿了。观察没有戴着的那顶帽子，用描述句告诉小猫它在哪里。",
    "revisit",
    describe(source, relation, relation === "in" ? "bag" : "mat"),
    source === "hat" ? "hat-main" : "cat-card",
    relation === "in" ? "bag-main" : "picnic-mat",
  );
}
// Explicit development speech entries; never labelled reviewed recordings.
export const SENTENCE_AUDIO = [
  ...new Set([
    ...Object.values(SENTENCES).map((t) => t.example),
    ...(["hat", "cap"] as const).flatMap((word) =>
      (["in", "on"] as const).map(
        (relation) => recapSentence(word, relation).example,
      ),
    ),
  ]),
].map((text, i) => ({
  id: `quest-voice-${i}`,
  text,
  path: null,
  sha256: null,
  bytes: null,
  review: "PENDING" as const,
  locale: "en-US",
  version: "quest-speech-dev-v1",
  source: "Browser development speech; teaching and recording review pending",
  type: "audio/mpeg" as const,
  durationMs: null,
}));
