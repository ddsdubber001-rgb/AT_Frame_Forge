import { useCallback, useState } from "react";

interface H<T> { past: T[]; present: T | null; future: T[] }
const LIMIT = 80;

export function useHistory<T>() {
  const [h, setH] = useState<H<T>>({ past: [], present: null, future: [] });
  const reset = useCallback((v: T) => setH({ past: [], present: v, future: [] }), []);
  const set = useCallback((fn: (p: T) => T, transient = false) => {
    setH((s) => {
      if (s.present === null) return s;
      const next = fn(s.present);
      if (transient) return { ...s, present: next };
      return { past: [...s.past, s.present].slice(-LIMIT), present: next, future: [] };
    });
  }, []);
  const checkpoint = useCallback(() => setH((s) => (s.present === null ? s : { past: [...s.past, s.present].slice(-LIMIT), present: s.present, future: [] })), []);
  const undo = useCallback(() => setH((s) => (s.past.length && s.present !== null ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1]!, future: [s.present, ...s.future] } : s)), []);
  const redo = useCallback(() => setH((s) => (s.future.length && s.present !== null ? { past: [...s.past, s.present], present: s.future[0]!, future: s.future.slice(1) } : s)), []);
  return { state: h.present, set, reset, checkpoint, undo, redo, canUndo: h.past.length > 0, canRedo: h.future.length > 0 };
}
