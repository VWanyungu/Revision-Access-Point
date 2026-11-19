import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type TimerMode = "focus" | "break";

interface TimerState {
  /** The timer chip shows in the nav only while this is true. */
  visible: boolean;
  setVisible: (v: boolean) => void;
  mode: TimerMode;
  running: boolean;
  left: number;
  total: number;
  done: number;
  minutes: Record<TimerMode, number>;
  setMinutes: (m: TimerMode, v: number) => void;
  toggle: () => void;
  reset: () => void;
  skip: () => void;
  chooseMode: (m: TimerMode) => void;
}

const Ctx = createContext<TimerState | null>(null);
const KEY = "rap-timer";
const LIMITS: Record<TimerMode, [number, number]> = { focus: [1, 90], break: [1, 30] };

const load = () => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { visible: !!s.visible, minutes: { focus: s.focus ?? 25, break: s.break ?? 5 } as Record<TimerMode, number> };
  } catch {
    return { visible: false, minutes: { focus: 25, break: 5 } as Record<TimerMode, number> };
  }
};

/** One timer for the whole app, so it keeps running as the user moves between pages. */
export const TimerProvider = ({ children }: { children: React.ReactNode }) => {
  const initial = useRef(load()).current;
  const [visible, setVisible] = useState(initial.visible);
  const [minutes, setMinutesState] = useState(initial.minutes);
  const [mode, setMode] = useState<TimerMode>("focus");
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(initial.minutes.focus * 60);
  const [done, setDone] = useState(0);
  const endAt = useRef(0);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ visible, focus: minutes.focus, break: minutes.break })); } catch { /* storage unavailable */ }
  }, [visible, minutes]);

  const chooseMode = useCallback((m: TimerMode) => {
    setMode(m); setLeft(minutes[m] * 60); setRunning(false);
  }, [minutes]);

  // Finishing a focus session counts it, then moves to the other mode, paused so the user decides when to go on.
  const skip = useCallback(() => {
    if (mode === "focus") setDone((n) => n + 1);
    chooseMode(mode === "focus" ? "break" : "focus");
  }, [mode, chooseMode]);

  // Counts against the clock, not the tick count, so a throttled background tab stays accurate.
  useEffect(() => {
    if (!running) return;
    endAt.current = Date.now() + left * 1000;
    const id = setInterval(() => {
      const s = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) skip();
    }, 250);
    return () => clearInterval(id);
    // `left` is deliberately omitted: endAt is fixed when the run starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, skip]);

  const setMinutes = useCallback((m: TimerMode, v: number) => {
    const [lo, hi] = LIMITS[m];
    const n = Math.min(hi, Math.max(lo, Math.round(v)));
    setMinutesState((p) => ({ ...p, [m]: n }));
    // Editing the mode on screen while idle updates the clock straight away.
    if (m === mode && !running) setLeft(n * 60);
  }, [mode, running]);

  const value = useMemo<TimerState>(() => ({
    visible, setVisible, mode, running, left, total: minutes[mode] * 60, done, minutes, setMinutes,
    toggle: () => setRunning((r) => !r),
    reset: () => chooseMode(mode),
    skip, chooseMode,
  }), [visible, mode, running, left, done, minutes, setMinutes, skip, chooseMode]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useTimer = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTimer must be used inside TimerProvider");
  return c;
};
