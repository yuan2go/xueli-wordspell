import { useState } from "react";
import type { Step } from "../content/story.ts";
import { usePointerDrop } from "./pointer.ts";
import { letterLayout } from "../game/interaction.ts";

export function Letters({
  step,
  submit,
  disabled = false,
}: {
  step: Step;
  disabled?: boolean;
  submit: (word: string) => void;
}) {
  const { tokens, fixed } = letterLayout(step);
  const initial =
    step.type === "transform"
      ? Array.from({ length: step.word.length }, (_, i) =>
          fixed(i) ? null : tokens.find((t) => t.letter === step.from?.[i])!.id,
        )
      : Array.from({ length: step.word.length }, () => null);
  const [slots, setSlots] = useState<(string | null)[]>(initial);
  const [selected, setSelected] = useState<number | null>(null);
  const [lesson, setLesson] = useState(0);
  function move(token: string, destination: number | null) {
    setLesson((n) =>
      destination === null ? Math.max(n, 2) : n === 0 ? 1 : n >= 2 ? 3 : n,
    );
    setSlots((old) => {
      const next = [...old];
      const origin = next.indexOf(token);
      if (destination === null) {
        if (origin >= 0) next[origin] = null;
        return next;
      }
      if (fixed(destination)) return old;
      const replaced = next[destination];
      next[destination] = token;
      if (origin >= 0 && origin !== destination) next[origin] = replaced;
      return next;
    });
    setSelected(null);
  }
  const pointer = usePointerDrop((source, target) => {
    if (target?.startsWith("slot-")) move(source, Number(target.slice(5)));
    else if (target === "bank") move(source, null);
  }, disabled);
  function choose(token: string) {
    const empty = selected ?? slots.findIndex((v, i) => !v && !fixed(i));
    if (empty >= 0) move(token, empty);
  }
  const word = slots
    .map((id, i) =>
      fixed(i)
        ? step.from![i]
        : (tokens.find((t) => t.id === id)?.letter ?? ""),
    )
    .join("");
  return (
    <div className="letter-workshop" aria-label="字母操作区">
      <div className="slots">
        {slots.map((id, i) => {
          const letter = fixed(i)
            ? step.from![i]
            : tokens.find((t) => t.id === id)?.letter;
          return (
            <button
              key={i}
              className={`letter slot ${fixed(i) ? "fixed" : ""} ${selected === i ? "selected" : ""}`}
              aria-label={`第${i + 1}格${letter ? ` ${letter}` : " 空"}`}
              aria-pressed={selected === i}
              disabled={fixed(i)}
              data-drop={`slot-${i}`}
              onPointerDown={(e) => {
                if (id && !fixed(i)) pointer.start(e, id);
              }}
              onClick={() =>
                pointer.click(() => {
                  if (id) move(id, null);
                  else setSelected(i);
                })
              }
            >
              <span lang="en">{letter ?? "·"}</span>
              {fixed(i) && <small>固定</small>}
            </button>
          );
        })}
      </div>
      <div className="letter-bank" data-drop="bank" aria-label="可用字母">
        {tokens.map((t) => (
          <button
            key={t.id}
            className="letter stamp"
            disabled={slots.includes(t.id)}
            aria-label={`字母 ${t.letter}`}
            onPointerDown={(e) => pointer.start(e, t.id)}
            onClick={() => pointer.click(() => choose(t.id))}
            lang="en"
          >
            {t.letter}
          </button>
        ))}
      </div>
      <p className="micro">点字母填入 · 点格子取回 · 拖动可交换</p>
      {step.mode === "teaching" && (
        <p className="tutorial-live" role="status">
          {
            [
              "先点一个字母，把印块放进格子。",
              "放进去了！试着点刚才的格子，把字母取回来。",
              "取回来了。现在选择格子，再点字母，就能重新放入或替换。",
              "你会调整字母了。按 c、a、t 排好，点「施法」叫醒小猫。",
            ][lesson]
          }
        </p>
      )}
      <button
        className="primary spell"
        disabled={word.length !== step.word.length}
        onClick={() => submit(word)}
      >
        施法 <span aria-hidden="true">✧</span>
      </button>
      {pointer.ghost && (
        <div
          className="drag-ghost"
          style={{ left: pointer.ghost.x, top: pointer.ghost.y }}
        >
          {tokens.find((t) => t.id === pointer.ghost?.label)?.letter ?? "字母"}
        </div>
      )}
    </div>
  );
}
