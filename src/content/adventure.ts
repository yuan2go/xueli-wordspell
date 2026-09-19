import type { WordId } from "../domain/world.ts";
export const ADVENTURE_VERSION = "4.0.0-dev.1";
export type PracticeMode =
  | "teaching"
  | "assisted"
  | "independent"
  | "exploration"
  | "revisit";
export type ActivityId = "dress" | "find" | "helper";
export type SceneId = "home" | "trail" | "meadow";
export const SCENES = {
  home: {
    act: 1,
    title: "家门口",
    problem: "小猫想出门野餐。旅行需要装东西，也需要认路。",
  },
  trail: {
    act: 2,
    title: "湿墨小径",
    problem: "小猫停住了：爪子不能踩进湿墨。身边什么东西能帮忙？",
  },
  meadow: {
    act: 3,
    title: "野餐草地",
    problem: "给朋友一个座位，把带来的东西安排好。你想怎样布置？",
  },
} as const;
export interface WordTask {
  id: string;
  word: WordId;
  entity: string;
  meaning: string;
  purpose: string;
  mode: PracticeMode;
  letters: string;
  kind: "restore" | "make";
}
export const WORD_TASKS: WordTask[] = [
  {
    id: "wake",
    word: "cat",
    entity: "cat-companion",
    meaning: "这只小猫等着和你一起旅行。cat。",
    purpose: "唤醒伙伴",
    mode: "teaching",
    letters: "tac",
    kind: "restore",
  },
  {
    id: "bag",
    word: "bag",
    entity: "bag-main",
    meaning: "能装东西、也能打开取出：bag。",
    purpose: "找回旅行背包",
    mode: "teaching",
    letters: "gabt",
    kind: "restore",
  },
  {
    id: "map",
    word: "map",
    entity: "route-sheet",
    meaning: "折起的小纸张上画着路线。先听，再把它找回来。",
    purpose: "找回路线",
    mode: "independent",
    letters: "tamp",
    kind: "restore",
  },
  {
    id: "hat",
    word: "hat",
    entity: "hat-main",
    meaning: "宽宽的帽檐可以挡太阳：hat。",
    purpose: "找回遮阳物品",
    mode: "teaching",
    letters: "athc",
    kind: "restore",
  },
  {
    id: "mat",
    word: "mat",
    entity: "picnic-mat",
    meaning: "还记得铺开后可以坐的物品吗？听声音，制作一张新的。",
    purpose: "制作野餐座位",
    mode: "revisit",
    letters: "pamt",
    kind: "make",
  },
];
export const ACTIVITIES: Record<
  ActivityId,
  { title: string; variants: { title: string; problem: string }[] }
> = {
  dress: {
    title: "帽子搭配",
    variants: [
      {
        title: "树荫试衣间",
        problem: "小猫想试试两种帽檐。任选一顶戴上，另一顶收好，合上背包。",
      },
      {
        title: "起风了",
        problem:
          "宽帽檐被风吹得摇晃。包里的纸偶能做一顶贴头的小帽子；宽帽子留在垫上。",
      },
    ],
  },
  find: {
    title: "背包找物",
    variants: [
      {
        title: "藏在里面",
        problem:
          "一顶帽子在垫子上。另一顶藏起来了；观察包里和包外，描述藏着的那顶，再拿到垫子上。",
      },
      {
        title: "谁挡住了帽檐",
        problem:
          "包里的帽子不是要找的那顶。小猫看着包后露出的帽檐；先挪开挡住它的东西，再描述位置并收好。",
      },
    ],
  },
  helper: {
    title: "野餐小帮手",
    variants: [
      {
        title: "多一个座位",
        problem:
          "小猫想坐在另一边。路线纸能做新座位。请它过去，再收好鸭舌帽；顺序由你定。",
      },
      {
        title: "出发收拾",
        problem:
          "座位上还压着帽子，小猫要看回家的路线。先让纸张空出来，恢复地图，再给小猫换上帽子并收好另一顶。",
      },
    ],
  },
};
export const CRAFTS = [
  { word: "mat", id: "craft-mat", label: "制作一张备用垫", quota: 1 },
  { word: "hat", id: "craft-hat", label: "制作一顶备用宽檐帽", quota: 1 },
] as const;
