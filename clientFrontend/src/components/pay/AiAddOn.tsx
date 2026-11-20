import { Sparkle } from "@phosphor-icons/react";
import { ksh } from "@/lib/pricing";

/** What the AI add-on includes, in one line, so the choice is clear before paying. */
export const AI_INCLUDES = "Model answers for past papers, quizzes from your notes, topic forecasts, practice papers and AI marking.";

/** The optional AI add-on: a switch row the student turns on while subscribing. Without it the pass reads and views only. */
const AiAddOn = ({ checked, onChange, price }: { checked: boolean; onChange: (on: boolean) => void; price?: number }) => (
  <button
    type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
    className={`flex w-full items-start gap-4 rounded-2xl p-4 text-left transition-[background-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.99] ${
      checked ? "bg-field ring-2 ring-brand-solid" : "bg-field ring-1 ring-line hover:bg-field-strong"
    }`}
  >
    <Sparkle size={22} weight={checked ? "fill" : "light"} className={`mt-0.5 shrink-0 ${checked ? "text-brand" : "text-ink-muted"}`} />
    <span className="min-w-0 flex-1">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-base font-medium">Add AI features</span>
        <span className="shrink-0 text-base tabular-nums">{price ? `+ ${ksh(price)}` : "…"}</span>
      </span>
      <span className="mt-1 block text-sm text-ink-muted">{AI_INCLUDES}</span>
    </span>
    <span
      aria-hidden
      className={`relative mt-1 h-6 w-10 shrink-0 rounded-full transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${checked ? "bg-brand-solid" : "bg-line-strong"}`}
    >
      <span className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </span>
  </button>
);

export default AiAddOn;
