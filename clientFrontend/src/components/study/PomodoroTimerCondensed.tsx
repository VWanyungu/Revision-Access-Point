import { useCallback, useEffect, useState } from "react";
import { ArrowCounterClockwise, Pause, Play, SkipForward } from "@phosphor-icons/react";

type Mode = "focus" | "break";

const MODES: Record<Mode, { label: string; seconds: number; bar: string }> = {
  focus: { label: "Focus", seconds: 25 * 60, bar: "bg-brand-solid" },
  break: { label: "Break", seconds: 5 * 60, bar: "bg-positive-solid" },
};

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const quiet =
  "flex size-11 items-center justify-center rounded-full text-ink-muted transition-[background-color,color,transform] duration-300 hover:bg-field hover:text-ink active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40";

/**
 * Pomodoro timer. One dominant number (the time), one primary action (start / pause),
 * quiet secondary actions, and progress that is shown as a bar and also exposed to assistive tech.
 */
const PomodoroTimerCondensed = () => {
  const [mode, setMode] = useState<Mode>("focus");
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(MODES.focus.seconds);
  const [done, setDone] = useState(0);

  const total = MODES[mode].seconds;
  const progress = ((total - left) / total) * 100;

  const choose = useCallback((m: Mode) => { setMode(m); setLeft(MODES[m].seconds); setRunning(false); }, []);

  // Finishing a focus session counts it, then moves to the other mode, paused so the user decides when to go on.
  const next = useCallback(() => {
    if (mode === "focus") setDone((n) => n + 1);
    choose(mode === "focus" ? "break" : "focus");
  }, [mode, choose]);

  useEffect(() => {
    if (!running) return;
    if (left <= 0) { next(); return; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, left, next]);

  return (
    <section aria-label="Pomodoro timer" className="rounded-2xl border border-line bg-surface p-4 font-geist text-ink md:p-5">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div role="tablist" aria-label="Timer mode" className="flex rounded-full bg-field p-1">
          {(Object.keys(MODES) as Mode[]).map((m) => (
            <button
              key={m} role="tab" aria-selected={mode === m} onClick={() => choose(m)}
              className={`h-9 rounded-full px-4 text-sm transition-colors duration-300 ${mode === m ? "bg-surface font-medium shadow-sm ring-1 ring-line" : "text-ink-muted hover:text-ink"}`}
            >
              {MODES[m].label} <span className="ml-1 font-geist-mono text-ink-muted">{MODES[m].seconds / 60}</span>
            </button>
          ))}
        </div>

        <div className="flex items-baseline gap-3">
          <span role="timer" aria-label={`${Math.floor(left / 60)} minutes ${left % 60} seconds left`} className="font-geist-mono text-3xl font-normal tracking-tight tabular-nums">
            {clock(left)}
          </span>
          <span className="text-sm text-ink-muted">{done} {done === 1 ? "session" : "sessions"} done</span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button className={quiet} aria-label="Reset" onClick={() => choose(mode)}><ArrowCounterClockwise size={20} /></button>
          <button
            onClick={() => setRunning((r) => !r)}
            className="flex h-11 min-w-[7rem] items-center justify-center gap-2 rounded-full bg-ink px-5 text-base font-medium text-ink-fg transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-ink-hover active:scale-[0.98]"
          >
            {running ? <><Pause size={18} weight="fill" /> Pause</> : <><Play size={18} weight="fill" /> {left === total ? "Start" : "Resume"}</>}
          </button>
          <button className={quiet} aria-label={mode === "focus" ? "Skip to break" : "Skip to focus"} onClick={next}><SkipForward size={20} /></button>
        </div>
      </div>

      <div role="progressbar" aria-label={`${MODES[mode].label} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} className="mt-4 h-1 overflow-hidden rounded-full bg-line">
        <div className={`h-full origin-left rounded-full transition-transform duration-1000 ease-linear motion-reduce:transition-none ${MODES[mode].bar}`} style={{ transform: `scaleX(${progress / 100})` }} />
      </div>
      <p className="sr-only" aria-live="polite">{MODES[mode].label} {running ? "running" : "paused"}</p>
    </section>
  );
};

export default PomodoroTimerCondensed;
