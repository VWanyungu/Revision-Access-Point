import type { ReactNode } from "react";
import { trayCore, trayShell } from "@/components/pay/PayKit";

const line = (pct: number) =>
  pct >= 80 ? "Strong result. Keep it fresh with a quick retry next week."
  : pct >= 50 ? "Good progress. The missed ones are the quickest marks to win back."
  : "A solid start. Read the answers you missed, then try again.";

/** The moment after a quiz or a marked paper: one big figure, how it compares, and one next action. */
const ResultFigure = ({ percent, detail, previous, note, action }: {
  percent: number;
  /** e.g. "7 of 10 correct" */
  detail: string;
  /** The best result stored before this one, as a percentage, or null when there is none. */
  previous?: number | null;
  /** Replaces the default encouraging line, e.g. to name the weakest topic. */
  note?: string;
  action: ReactNode;
}) => {
  const pct = Math.round(percent);
  return (
    <div className={trayShell}>
      <div className={`p-6 md:p-7 ${trayCore}`}>
        <p className="text-4xl font-semibold tabular-nums text-ink">{pct}<span className="text-2xl text-ink-muted">%</span></p>
        <p className="mt-2 text-lg text-ink">{detail}</p>
        {previous != null && (
          <p className="mt-1 text-sm text-ink-muted">
            {pct > previous ? `Up from your previous best of ${previous}%.` : pct === previous ? `Level with your best of ${previous}%.` : `Your best so far is ${previous}%.`}
          </p>
        )}
        <p className="mt-4 text-base text-ink-soft">{note ?? line(pct)}</p>
        <div className="mt-6 flex flex-wrap gap-2">{action}</div>
      </div>
    </div>
  );
};

export default ResultFigure;
