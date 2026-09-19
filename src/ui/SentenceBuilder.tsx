import { useState } from "react";
import type { SentenceTask } from "../content/sentences.ts";
export function SentenceBuilder({
  task,
  submit,
}: {
  task: SentenceTask;
  submit: (ids: string[]) => void;
}) {
  const [ids, setIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const shift = (offset: number) => {
    if (!selected) return;
    setIds((old) => {
      const i = old.indexOf(selected),
        j = i + offset;
      if (i < 0 || j < 0 || j >= old.length) return old;
      const next = [...old];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  return (
    <div className="sentence-builder" aria-label="选词组句">
      <div className="sentence-line" aria-label="我的句子">
        {ids.length === 0 ? (
          <span>点词块，把意思说出来…</span>
        ) : (
          ids.map((id, i) => (
            <button
              key={id}
              aria-label={`句子第${i + 1}块 ${task.tokens.find((t) => t.id === id)!.text}`}
              aria-pressed={selected === id}
              onClick={() => setSelected(selected === id ? null : id)}
            >
              {task.tokens.find((t) => t.id === id)!.text}
            </button>
          ))
        )}
      </div>
      <div className="sentence-edit">
        <button
          disabled={!selected}
          onClick={() => shift(-1)}
          aria-label="词块左移"
        >
          ←
        </button>
        <button
          disabled={!selected}
          onClick={() => shift(1)}
          aria-label="词块右移"
        >
          →
        </button>
        <button
          disabled={!selected}
          onClick={() => {
            setIds(ids.filter((id) => id !== selected));
            setSelected(null);
          }}
        >
          撤回词块
        </button>
        <button
          disabled={!ids.length}
          onClick={() => {
            setIds([]);
            setSelected(null);
          }}
        >
          重新组句
        </button>
      </div>
      <div className="word-blocks" aria-label="可用词块">
        {task.tokens.map((t) => (
          <button
            key={t.id}
            lang="en"
            data-token={t.id}
            disabled={ids.includes(t.id)}
            onClick={() => setIds([...ids, t.id])}
          >
            {t.text}
          </button>
        ))}
      </div>
      <button className="primary" onClick={() => submit(ids)}>
        说出这句话
      </button>
    </div>
  );
}
