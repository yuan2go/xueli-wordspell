import { isWord } from "../domain/world.ts";
import type { Meaning, SentenceTask } from "../content/sentences.ts";
export type Parsed =
  | { status: "valid"; meaning: Meaning }
  | { status: "incomplete" | "structure" | "outside"; message: string };
/** Finite authored grammar; no unique-answer string comparison and no world effects here. */
export function parseSentence(text: string): Parsed {
  const words = text
    .toLowerCase()
    .replace(/[.,!?，。！？]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length < 6)
    return {
      status: "incomplete",
      message: "这句话还没说完：需要物品、位置和地点。",
    };
  if (
    words.some(
      (w) =>
        ![
          "put",
          "the",
          "is",
          "in",
          "on",
          "cat",
          "bag",
          "map",
          "mat",
          "hat",
          "cap",
        ].includes(w),
    )
  )
    return {
      status: "outside",
      message: "这可能是另一种表达；本次词块只练习 Put… 和 The…is…。",
    };
  const line = words.join(" ");
  let kind: Meaning["kind"], source: string, relation: string, target: string;
  let match = /^put the (\w+) (in|on) the (\w+)$/.exec(line);
  if (match) {
    kind = "command";
    [, source, relation, target] = match;
  } else if ((match = /^(in|on) the (\w+) put the (\w+)$/.exec(line))) {
    kind = "command";
    [, relation, target, source] = match;
  } else if ((match = /^the (\w+) is (in|on) the (\w+)$/.exec(line))) {
    kind = "description";
    [, source, relation, target] = match;
  } else if ((match = /^(in|on) the (\w+) is the (\w+)$/.exec(line))) {
    kind = "description";
    [, relation, target, source] = match;
  } else
    return {
      status: "structure",
      message:
        "调整一下语序：Put + 物品 + 位置；描述用 The + 物品 + is + 位置。",
    };
  if (!isWord(source) || !isWord(target))
    return { status: "outside", message: "这个表达超出了本活动的物品范围。" };
  return {
    status: "valid",
    meaning: { kind, source, relation: relation as "in" | "on", target },
  };
}
export function assemble(
  task: SentenceTask,
  ids: string[],
): string | undefined {
  if (new Set(ids).size !== ids.length) return;
  const selected = ids.map((id) => task.tokens.find((t) => t.id === id));
  if (selected.some((t) => !t)) return;
  return selected.map((t) => t!.text).join(" ");
}
export function sameMeaning(a: Meaning, b: Meaning): boolean {
  return (
    a.kind === b.kind &&
    a.source === b.source &&
    a.relation === b.relation &&
    a.target === b.target
  );
}
