import type { World } from "../domain/world.ts";
import type { Step } from "../content/story.ts";
export function letterLayout(step: Step) {
  const editable =
    step.editable ??
    (step.type === "transform"
      ? [step.word.length - 1]
      : Array.from({ length: step.word.length }, (_, i) => i));
  return {
    editable,
    tokens: [...step.letters].map((letter, i) => ({
      id: `letter-${i}`,
      letter,
    })),
    fixed: (i: number) => !editable.includes(i),
  };
}
// Regions belong to physical scene semantics, never to the expected answer.
export function sceneTargets(world: World, act: number) {
  const regions: {
    id: string;
    entityId: string;
    relation: string;
    label: string;
  }[] = [];
  if (act === 2 && !world.flags.includes("crossed-ink"))
    regions.push({
      id: "ink-road:across",
      entityId: "ink-road",
      relation: "across",
      label: "湿墨小径",
    });
  for (const e of Object.values(world.entities)) {
    if (e.location.kind !== "stage") continue;
    if (e.word === "bag")
      regions.push({
        id: `${e.id}:in`,
        entityId: e.id,
        relation: "in",
        label: "背包里面",
      });
    if (e.word === "mat")
      regions.push({
        id: `${e.id}:on`,
        entityId: e.id,
        relation: "on",
        label: "垫子上面",
      });
  }
  return regions;
}
