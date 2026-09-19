import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";

export function usePointerDrop(
  drop: (source: string, target: string | null) => void,
  disabled = false,
) {
  const active = useRef<{
    id: number;
    source: string;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const suppressed = useRef(0);
  const handler = useRef(drop);
  handler.current = drop;
  const [ghost, setGhost] = useState<{
    x: number;
    y: number;
    label: string;
  } | null>(null);
  useEffect(() => {
    if (disabled) {
      active.current = null;
      setGhost(null);
    }
  }, [disabled]);
  useEffect(() => {
    const cancel = () => {
      if (active.current) suppressed.current = Date.now() + 350;
      active.current = null;
      setGhost(null);
    };
    const move = (e: globalThis.PointerEvent) => {
      const a = active.current;
      if (!a || a.id !== e.pointerId) return;
      if (Math.hypot(e.clientX - a.x, e.clientY - a.y) > 8) a.moved = true;
      if (a.moved) setGhost({ x: e.clientX, y: e.clientY, label: a.source });
    };
    const up = (e: globalThis.PointerEvent) => {
      const a = active.current;
      if (!a || a.id !== e.pointerId) return;
      active.current = null;
      setGhost(null);
      if (a.moved) {
        suppressed.current = Date.now() + 350;
        const target = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest<HTMLElement>("[data-drop]");
        handler.current(a.source, target?.dataset.drop ?? null);
      }
    };
    const pointerCancel = (e: globalThis.PointerEvent) => {
      if (active.current?.id === e.pointerId) cancel();
    };
    const otherPointer = (e: globalThis.PointerEvent) => {
      if (active.current && active.current.id !== e.pointerId) cancel();
    };
    window.addEventListener("pointerdown", otherPointer);
    document.addEventListener("visibilitychange", cancel);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", pointerCancel);
    window.addEventListener("resize", cancel);
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("pointerdown", otherPointer);
      document.removeEventListener("visibilitychange", cancel);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", pointerCancel);
      window.removeEventListener("resize", cancel);
      window.removeEventListener("blur", cancel);
    };
  }, []);
  return {
    ghost,
    start: (e: PointerEvent<HTMLElement>, source: string) => {
      if (disabled || active.current || !e.isPrimary || e.button !== 0) return;
      // A new physical press is intentional; only suppress the synthetic click from the finished drag.
      suppressed.current = 0;
      active.current = {
        id: e.pointerId,
        source,
        x: e.clientX,
        y: e.clientY,
        moved: false,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    click: (action: () => void) => {
      if (Date.now() >= suppressed.current) action();
    },
  };
}
