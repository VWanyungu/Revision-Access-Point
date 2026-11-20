import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleNotch, Info } from "@phosphor-icons/react";
import { supabase } from "@/database/supabase";

type Kind = "cat1" | "cat2" | "exam";

interface ForecastTopic {
  topic_id: number;
  title: string;
  percent: number;
  level: "high" | "medium" | "low" | "none";
  reason: string;
}

interface Forecast {
  kind: Kind;
  topics: ForecastTopic[];
  structure: { questions: number; total_marks: number; types: { type: string; percent: number }[] };
  based_on: { kind: string; year: string }[];
}

type Result =
  | { status: "ready"; forecast: Forecast; generated_at: string; skipped?: number }
  | { status: "preparing"; pending: number; total: number }
  | { status: "not_enough"; need: string }
  | { status: "no_syllabus" };

const KINDS: { id: Kind; label: string }[] = [
  { id: "cat1", label: "CAT 1" },
  { id: "cat2", label: "CAT 2" },
  { id: "exam", label: "Exam" },
];
const PAPER_LABEL: Record<string, string> = { cat1: "CAT 1", cat2: "CAT 2", exam: "exam", supplementary: "supplementary" };
const LEVEL: Record<string, { label: string; bar: string; text: string }> = {
  high: { label: "High", bar: "bg-primary", text: "text-brand" },
  medium: { label: "Medium", bar: "bg-brand-light", text: "text-ink" },
  low: { label: "Low", bar: "bg-line-strong", text: "text-ink-muted" },
};

/**
 * Calls the predict-forecast edge function with a plain request (the same way the answers page does), so only the headers the
 * function allows are sent. Errors come back as a message, not a thrown object.
 */
const fetchForecast = async (unitId: number, kind: Kind): Promise<Result> => {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/predict-forecast`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
    body: JSON.stringify({ unitId, kind }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error((body as { error?: string } | null)?.error ?? "Could not load the forecast.");
  return body as Result;
};

/** The topic forecast for a unit's next CAT or exam. An estimate from past papers, shown as relative likelihood. */
const PredictionsPanel = ({ unitId }: { unitId: number }) => {
  const [kind, setKind] = useState<Kind>("exam");

  const { data, error, isLoading } = useQuery({
    queryKey: ["forecast", unitId, kind],
    queryFn: () => fetchForecast(unitId, kind),
    // While the past papers are still being read, ask again until they are done.
    refetchInterval: (q) => (q.state.data?.status === "preparing" ? 8000 : false),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return (
    <div>
      <div role="tablist" aria-label="Which paper to forecast" className="mb-8 inline-flex rounded-full bg-field p-1">
        {KINDS.map((k) => (
          <button
            key={k.id} role="tab" aria-selected={kind === k.id} onClick={() => setKind(k.id)}
            className={`h-10 rounded-full px-5 text-base transition-colors duration-300 ${kind === k.id ? "bg-surface font-medium shadow-sm ring-1 ring-line" : "text-ink-muted hover:text-ink"}`}
          >
            {k.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="flex items-center gap-2 text-base text-ink-muted" role="status"><CircleNotch size={18} className="animate-spin" /> Reading the past papers…</p>}

      {error && <p className="text-base text-danger" role="alert">{(error as Error).message}</p>}

      {data?.status === "preparing" && (
        <p className="flex items-center gap-2 text-base text-ink-muted" role="status">
          <CircleNotch size={18} className="animate-spin" /> Analysing past papers ({data.total - data.pending} of {data.total} done). This happens once for the unit.
        </p>
      )}

      {data?.status === "not_enough" && (
        <p className="max-w-[560px] text-base text-ink-muted">Not enough past papers yet to forecast this. It needs {data.need}.</p>
      )}

      {data?.status === "no_syllabus" && (
        <p className="max-w-[560px] text-base text-ink-muted">This unit has no syllabus yet, so topics cannot be forecast.</p>
      )}

      {data?.status === "ready" && <ForecastView forecast={data.forecast} skipped={data.skipped ?? 0} />}
    </div>
  );
};

const ForecastView = ({ forecast, skipped }: { forecast: Forecast; skipped: number }) => {
  const seen = forecast.topics.filter((t) => t.level !== "none");
  const unseen = forecast.topics.filter((t) => t.level === "none");
  const years = [...new Set(forecast.based_on.map((b) => b.year))];
  const kinds = [...new Set(forecast.based_on.map((b) => PAPER_LABEL[b.kind] ?? b.kind))];
  const mix = forecast.structure.types.slice(0, 3).map((t) => `${t.type} ${t.percent}%`).join(", ");

  return (
    <div className="max-w-[720px]">
      <p className="flex items-start gap-2 text-sm text-ink-muted">
        <Info size={16} className="mt-0.5 shrink-0" />
        An estimate from {forecast.based_on.length} past papers ({kinds.join(", ")}; {years.join(", ")}). It shows which topics have been
        asked most, not what will be asked.{skipped > 0 ? ` ${skipped} paper${skipped === 1 ? "" : "s"} could not be read and ${skipped === 1 ? "is" : "are"} left out.` : ""}
      </p>

      <ul className="mt-8 flex flex-col">
        {seen.map((t) => {
          const l = LEVEL[t.level];
          return (
            <li key={t.topic_id} className="border-b border-line py-4 first:pt-0">
              <div className="flex items-baseline justify-between gap-4">
                <p className="min-w-0 text-base font-medium">{t.title}</p>
                <span className={`shrink-0 text-sm font-medium ${l.text}`}>{l.label}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-field" role="img" aria-label={`${l.label} likelihood`}>
                <div className={`h-full rounded-full ${l.bar}`} style={{ width: `${Math.max(4, t.percent)}%` }} />
              </div>
              <p className="mt-2 text-sm text-ink-muted">{t.reason}</p>
            </li>
          );
        })}
      </ul>

      {unseen.length > 0 && (
        <details className="mt-6">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-ink-muted">
            {unseen.length} topic{unseen.length === 1 ? "" : "s"} never asked in these papers
          </summary>
          <ul className="mt-2 flex flex-col gap-1 text-base text-ink-muted">{unseen.map((t) => <li key={t.topic_id}>{t.title}</li>)}</ul>
        </details>
      )}

      <p className="mt-8 text-sm text-ink-muted">
        Usually about {forecast.structure.questions} questions and {forecast.structure.total_marks} marks{mix ? `, mostly ${mix}` : ""}.
      </p>
    </div>
  );
};

export default PredictionsPanel;
