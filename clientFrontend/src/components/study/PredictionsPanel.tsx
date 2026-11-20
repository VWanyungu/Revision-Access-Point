import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleNotch, Info } from "@phosphor-icons/react";
import { supabase } from "@/database/supabase";
import { MixedContentRenderer } from "@/components/study/MixedContentRenderer";
import type { AnswersData } from "@/pages/AnswersPage";
import PracticeExam from "./PracticeExam";
import { callFunction, type ApiError } from "@/lib/callFunction";
import ConfirmAction from "@/components/ui/confirm-action";
import LoadFailed from "@/components/layout/LoadFailed";

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

const fetchForecast = (unitId: number, kind: Kind) => callFunction<Result>("predict-forecast", { unitId, kind });

/** The topic forecast for a unit's next CAT or exam. An estimate from past papers, shown as relative likelihood. */
const PredictionsPanel = ({ unitId, onViewAnswers, onUpgradeAi }: { unitId: number; onViewAnswers?: (data: AnswersData, title: string) => void; onUpgradeAi?: () => void }) => {
  const [kind, setKind] = useState<Kind>("exam");

  const { data, error, isLoading, refetch } = useQuery({
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

      {error && (error as ApiError).aiRequired ? (
        <div className="max-w-[560px]">
          <p className="text-base text-ink-muted">Forecasts and practice papers are part of the AI add-on for your semester pass.</p>
          {onUpgradeAi && (
            <button onClick={onUpgradeAi} className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-base font-medium text-primary-foreground transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-primary-dark active:scale-[0.98]">
              Add AI features
            </button>
          )}
        </div>
      ) : error && (
        <LoadFailed
          className="mx-0"
          title="Couldn't load the forecast"
          message="We could not reach the server. Check your connection and try again."
          onRetry={() => refetch()}
        />
      )}

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

      {data?.status === "ready" && (
        <>
          <Likelihood forecast={data.forecast} />
          <PracticePaper unitId={unitId} kind={kind} topics={data.forecast.topics} onViewAnswers={onViewAnswers} />
        </>
      )}
    </div>
  );
};

const LEVEL_LABEL: Record<ForecastTopic["level"], string> = { high: "High", medium: "Medium", low: "Low", none: "Unlikely" };

/** Which topics the next paper is likely to cover, most likely first, each with the reason from the past papers. */
const Likelihood = ({ forecast }: { forecast: Forecast }) => {
  const topics = [...forecast.topics].sort((a, b) => b.percent - a.percent);
  if (topics.length === 0) return null;
  return (
    <section aria-label="Topic likelihood" className="mb-12 max-w-[720px]">
      <h3 className="font-literata text-xl">Likely topics</h3>
      <p className="mt-2 text-sm text-ink-muted">
        An estimate from {forecast.based_on.length} past {forecast.based_on.length === 1 ? "paper" : "papers"}. It shows what is more likely, not what will come up.
      </p>
      <ul className="mt-4 flex flex-col">
        {topics.map((t) => (
          <li key={t.topic_id} className="border-b border-line py-4 first:border-t">
            <div className="flex items-baseline justify-between gap-4">
              <p className="min-w-0 text-base font-medium">{t.title}</p>
              <p className="shrink-0 text-sm tabular-nums text-ink-muted">{LEVEL_LABEL[t.level]}, {Math.round(t.percent)}%</p>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" role="img" aria-label={`${Math.round(t.percent)} percent likely`}>
              <div className="h-full w-full origin-left rounded-full bg-brand-solid" style={{ transform: `scaleX(${Math.min(1, Math.max(0, t.percent / 100))})` }} />
            </div>
            {t.reason && <p className="mt-2 text-sm text-ink-muted">{t.reason}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
};

interface PracticeQuestion { number: string; text: string; marks: number; topic_id: number | null; type: string; reason: string }
interface Paper { title: string; duration_minutes: number; instructions: string; total_marks: number; questions: PracticeQuestion[] }
type PaperResult =
  | { status: "none" }
  | { status: "needs_forecast" }
  | { status: "ready"; paper: Paper; answers: AnswersData | null; meta: { generated_at: string; generations_left: number; outdated: boolean; serial: number } };

/** The student's own AI-written practice paper for this kind of paper: saved for them, so it never changes while they read it. */
const PracticePaper = ({ unitId, kind, topics, onViewAnswers }: { unitId: number; kind: Kind; topics: ForecastTopic[]; onViewAnswers?: (data: AnswersData, title: string) => void }) => {
  const queryClient = useQueryClient();
  const key = ["practice-paper", unitId, kind];
  const kindLabel = KINDS.find((k) => k.id === kind)!.label;

  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => callFunction<PaperResult>("predict-paper", { unitId, kind, action: "get" }), staleTime: Infinity, retry: false });
  const write = useMutation({
    mutationFn: (action: "generate" | "regenerate") => callFunction<PaperResult>("predict-paper", { unitId, kind, action }),
    onSuccess: (result) => queryClient.setQueryData(key, result),
  });

  const paper = data?.status === "ready" ? data : null;

  // The model answers are written right after the paper, in the background. Ask for them once, as soon as the paper is here.
  const writeAnswers = useMutation({
    mutationFn: () => callFunction<PaperResult>("predict-paper", { unitId, kind, action: "answers" }),
    // Each call writes a few answers; keep asking until the set is complete.
    onSuccess: (result) => {
      queryClient.setQueryData(key, result);
      if (result.status === "ready" && !result.answers) writeAnswers.mutate();
    },
  });
  const asked = useRef("");
  const paperStamp = paper ? paper.meta.generated_at : "";
  useEffect(() => {
    if (paper && !paper.answers && asked.current !== paperStamp) {
      asked.current = paperStamp;
      writeAnswers.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperStamp, paper?.answers]);
  const topicName = (id: number | null) => topics.find((t) => t.topic_id === id)?.title;

  // The student's attempts at this unit's papers (status and score), to label the exam button and list marked papers.
  const { data: attempts = [] } = useQuery({
    queryKey: ["practice-attempts", unitId],
    queryFn: async () => {
      const { data } = await supabase.from("practice_attempts").select("kind, paper_serial, status, marked_at, result").eq("unit_id", unitId).order("paper_serial", { ascending: false });
      return (data ?? []) as { kind: Kind; paper_serial: number; status: string; marked_at: string | null; result: { score: number; total: number } | null }[];
    },
  });
  const [examSerial, setExamSerial] = useState<number | null>(null);
  const top = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  // Opening or leaving the exam changes the page height, so bring the section back into view.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    top.current?.scrollIntoView({ block: "start" });
  }, [examSerial]);
  const serial = paper?.meta.serial;
  const mine = attempts.find((a) => a.kind === kind && a.paper_serial === serial);
  const history = attempts.filter((a) => a.kind === kind && a.status === "marked" && a.result);

  if (examSerial !== null) {
    return (
      <section ref={top} className="max-w-[720px] scroll-mt-32" aria-label="Practice paper">
        <PracticeExam unitId={unitId} kind={kind} serial={examSerial} onClose={() => { setExamSerial(null); queryClient.invalidateQueries({ queryKey: ["practice-attempts", unitId] }); }} onViewAnswers={onViewAnswers} />
      </section>
    );
  }

  const pill = "inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-3 text-sm md:px-5 font-medium transition-[transform,background-color,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";

  return (
    <section ref={top} className="max-w-[720px] scroll-mt-32" aria-label="Practice paper">
      {isLoading && <p className="flex items-center gap-2 text-base text-ink-muted" role="status"><CircleNotch size={18} className="animate-spin" /> Checking for your paper…</p>}

      {!isLoading && !paper && (
        <button
          onClick={() => write.mutate("generate")}
          disabled={write.isPending}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-base font-medium text-primary-foreground transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-primary-dark active:scale-[0.98] disabled:opacity-60"
        >
          {write.isPending ? <><CircleNotch size={18} className="animate-spin" /> Writing your paper…</> : `Generate ${kindLabel}`}
        </button>
      )}

      {write.isError && <p className="mt-3 text-base text-danger" role="alert">{(write.error as Error).message}</p>}

      {paper && (
        <div>
          <p className="flex items-start gap-2 text-sm text-ink-muted">
            <Info size={16} className="mt-0.5 shrink-0" />
            Written by AI from this unit's past-paper patterns. It is practice, not a real past paper.
          </p>
          {paper.meta.outdated && <p className="mt-2 text-sm text-ink-muted">New past papers have been added since this was written. Updating it is free.</p>}

          <ol className="mt-6 flex flex-col">
            {paper.paper.questions.map((q) => (
              <li key={q.number} className="border-t border-line py-5 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-field-soft px-2.5 py-1 font-medium text-ink-soft">Q{q.number}</span>
                  <span className="rounded-full bg-info-bg px-2.5 py-1 font-medium text-info-fg">{q.marks} marks</span>
                  {topicName(q.topic_id) && <span className="rounded-full bg-field-soft px-2.5 py-1 text-ink-muted">{topicName(q.topic_id)}</span>}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-base">{q.text}</p>
                <AnswerDropdown
                  answer={paper.answers?.questions.find((a) => a.question_number === q.number)}
                  writing={!paper.answers && writeAnswers.isPending}
                  failed={!paper.answers && writeAnswers.isError}
                  retry={() => writeAnswers.mutate()}
                />
              </li>
            ))}
          </ol>

          <div className="mt-4 flex flex-wrap items-center gap-2 md:gap-3">
            {serial !== undefined && (
              <button onClick={() => setExamSerial(serial)} className={`${pill} bg-primary text-primary-foreground hover:bg-primary-dark`}>
                {mine?.status === "marked" ? "My marks" : mine ? "Continue" : "Take paper"}
              </button>
            )}
            {onViewAnswers && (
              <button
                onClick={() => paper.answers && onViewAnswers(paper.answers, paper.paper.title)}
                disabled={!paper.answers}
                className={`${pill} bg-field hover:bg-field-strong`}
              >
                {paper.answers ? "Answers" : <><CircleNotch size={16} className="animate-spin" /> Answers</>}
              </button>
            )}
            <ConfirmAction
              skip={paper.meta.outdated}
              title="Write a new practice paper?"
              description="This writes a new practice paper and replaces this one."
              confirmLabel="Write a new paper"
              onConfirm={() => write.mutate("regenerate")}
              trigger={
                <button
                  disabled={write.isPending || (!paper.meta.outdated && paper.meta.generations_left === 0)}
                  className={`${pill} border border-line hover:bg-field`}
                >
                  {write.isPending
                    ? <><CircleNotch size={16} className="animate-spin" /> Writing…</>
                    : paper.meta.outdated ? "Update paper" : `New paper (${paper.meta.generations_left})`}
                </button>
              }
            />
          </div>

          {history.length > 0 && (
            <div className="mt-10">
              <p className="text-sm text-ink-muted">Marked papers</p>
              <ul className="mt-2 flex flex-col">
                {history.map((h) => (
                  <li key={h.paper_serial} className="border-b border-line">
                    <button onClick={() => setExamSerial(h.paper_serial)} className="flex min-h-12 w-full items-center justify-between gap-4 text-left text-base transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:opacity-60">
                      <span>{h.marked_at ? new Date(h.marked_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : kindLabel}</span>
                      <span className="tabular-nums text-ink-muted">{h.result!.score}/{h.result!.total}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

/** One question's model answer, folded away until the student opens it. */
const AnswerDropdown = ({ answer, writing, failed, retry }: { answer?: AnswersData["questions"][number]; writing: boolean; failed: boolean; retry: () => void }) => {
  if (!answer) {
    return (
      <p className="mt-3 text-sm text-ink-muted">
        {failed
          ? <>Could not write the answers. <button onClick={retry} className="font-medium text-brand">Try again</button></>
          : writing ? <span className="inline-flex items-center gap-2"><CircleNotch size={14} className="animate-spin" /> Writing the answer…</span> : null}
      </p>
    );
  }
  const breakdown = answer.marks_allocation?.breakdown ?? [];
  return (
    <details className="group mt-3">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-brand [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">Show the answer</span><span className="hidden group-open:inline">Hide the answer</span>
      </summary>
      <div className="mt-2 rounded-xl bg-field-soft p-4 group-open:animate-in group-open:fade-in-0 group-open:slide-in-from-top-1 group-open:duration-500 motion-reduce:animate-none">
        <p className="text-sm text-ink-muted">Model answer</p>
        <div className="mt-2 text-base text-ink-soft [&_p:last-child]:mb-0 [&_p]:mb-3"><MixedContentRenderer text={answer.answer.final_answer} /></div>
        {breakdown.length > 0 && (
          <>
            <p className="mt-4 text-sm text-ink-muted">How the marks are awarded</p>
            <ul className="mt-2 flex flex-col text-base text-ink-soft">
              {breakdown.map((b, i) => (
                <li key={i} className="flex items-start justify-between gap-4 border-b border-line-soft py-2 first:pt-0 last:border-b-0">
                  <span className="min-w-0">{b.step}</span><span className="shrink-0 tabular-nums text-ink-muted">{b.marks}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </details>
  );
};

export default PredictionsPanel;
