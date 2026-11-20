import { ArrowCounterClockwise, Gear, Minus, Pause, Play, Plus, SkipForward, X } from "@phosphor-icons/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimerMode, useTimer } from "@/context/TimerContext";

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const LABEL: Record<TimerMode, string> = { focus: "Focus", break: "Break" };
const STEP_BTN =
  "flex size-11 items-center justify-center rounded-full bg-field text-ink transition-[transform,background-color] duration-300 md:size-8 hover:bg-field-strong active:scale-95 disabled:pointer-events-none disabled:opacity-40";

const Stepper = ({ label, mode }: { label: string; mode: TimerMode }) => {
  const { minutes, setMinutes } = useTimer();
  const max = mode === "focus" ? 90 : 30;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-ink-muted">{label}</span>
      <div className="flex items-center gap-2">
        <button className={STEP_BTN} aria-label={`Shorten ${label.toLowerCase()}`} disabled={minutes[mode] <= 1} onClick={() => setMinutes(mode, minutes[mode] - 1)}><Minus size={14} /></button>
        <span className="min-w-[3.5rem] text-center font-geist-mono text-sm tabular-nums">{minutes[mode]} min</span>
        <button className={STEP_BTN} aria-label={`Lengthen ${label.toLowerCase()}`} disabled={minutes[mode] >= max} onClick={() => setMinutes(mode, minutes[mode] + 1)}><Plus size={14} /></button>
      </div>
    </div>
  );
};

/** Compact timer that lives in the navbar. Renders nothing until the user turns the timer on. */
const NavTimer = () => {
  const t = useTimer();
  if (!t.visible) return null;
  const progress = ((t.total - t.left) / t.total) * 100;

  return (
    <div className="relative flex items-center gap-0.5 overflow-hidden rounded-full bg-field py-0.5 pl-3 pr-0.5">
      <span className="hidden text-xs font-medium text-ink-muted sm:inline">{LABEL[t.mode]}</span>
      <span role="timer" aria-label={`${LABEL[t.mode]}, ${Math.floor(t.left / 60)} minutes ${t.left % 60} seconds left`} className="mx-1.5 font-geist-mono text-sm tabular-nums">
        {clock(t.left)}
      </span>
      <button
        onClick={t.toggle}
        aria-label={t.running ? "Pause timer" : "Start timer"}
        className="flex size-11 items-center justify-center rounded-full bg-primary md:size-8 text-primary-foreground transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-primary-dark active:scale-95"
      >
        {t.running ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
      </button>

      <Popover>
        <PopoverTrigger asChild>
          <button aria-label="Timer settings" className="flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors md:size-8 duration-300 hover:text-ink">
            <Gear size={16} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={12} className="w-72 rounded-2xl p-4 font-geist">
          <div role="tablist" aria-label="Timer mode" className="mb-4 flex rounded-full bg-field p-1">
            {(["focus", "break"] as TimerMode[]).map((m) => (
              <button
                key={m} role="tab" aria-selected={t.mode === m} onClick={() => t.chooseMode(m)}
                className={`h-11 flex-1 rounded-full text-sm md:h-8 transition-colors duration-300 ${t.mode === m ? "bg-surface font-medium shadow-sm ring-1 ring-line" : "text-ink-muted hover:text-ink"}`}
              >
                {LABEL[m]}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <Stepper label="Focus length" mode="focus" />
            <Stepper label="Break length" mode="break" />
          </div>
          <p className="mt-3 text-xs text-ink-muted">{t.done} {t.done === 1 ? "session" : "sessions"} done today</p>
          <div className="mt-4 flex items-center gap-1 border-t border-line pt-3">
            <button onClick={t.reset} className="flex h-11 items-center gap-1.5 rounded-full px-3 md:h-9 text-sm text-ink-muted transition-colors duration-300 hover:bg-field hover:text-ink"><ArrowCounterClockwise size={16} /> Reset</button>
            <button onClick={t.skip} className="flex h-11 items-center gap-1.5 rounded-full px-3 md:h-9 text-sm text-ink-muted transition-colors duration-300 hover:bg-field hover:text-ink"><SkipForward size={16} /> Skip</button>
            <button onClick={() => t.setVisible(false)} className="ml-auto flex h-11 items-center gap-1.5 rounded-full px-3 md:h-9 text-sm text-ink-muted transition-colors duration-300 hover:bg-field hover:text-ink"><X size={16} /> Hide</button>
          </div>
        </PopoverContent>
      </Popover>

      <div aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-line">
        <div className="h-full origin-left bg-primary transition-transform duration-1000 ease-linear motion-reduce:transition-none" style={{ transform: `scaleX(${progress / 100})` }} />
      </div>
    </div>
  );
};

export default NavTimer;
