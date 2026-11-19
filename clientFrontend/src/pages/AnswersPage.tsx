import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight, ArrowsClockwise, ArrowUpRight, CaretDown, CircleHalf, DownloadSimple, Info, ListChecks,
} from "@phosphor-icons/react";
import { StepRenderer } from "@/components/study/StepRenderer";
import { MixedContentRenderer } from "@/components/study/MixedContentRenderer";
import PageCrumbs from "@/components/layout/PageCrumbs";
import { EASE, QuietButton, formatDate } from "@/components/pay/PayKit";

interface MarksBreakdown {
  step: string;
  marks: string;
}

interface MarksAllocation {
  total_marks: string;
  breakdown: MarksBreakdown[];
}

interface Step {
  text: string;
  latex?: string;
  code?: string;
  language?: string;
}

interface Answer {
  final_answer: string;
  working_steps: Step[];
  explanation: string;
}

export interface AnswerQuestion {
  question_number: string;
  question_text: string;
  answer_type: "calculation" | "theory" | "definition" | "essay";
  marks_allocation: MarksAllocation;
  answer: Answer;
  key_points: string[];
}

export interface AnswersData {
  document_title: string;
  /** ISO time the answers were generated and saved on this device. */
  savedAt?: string;
  questions: AnswerQuestion[];
}

interface AnswersPageProps {
  data: AnswersData | null;
  generating?: boolean;
  /** The paper's title, e.g. "CAT 2, 2025/26". */
  title: string;
  onBack: () => void;
  onOpenPaper?: () => void;
  onRegenerate?: () => void;
  onQuiz?: () => void;
  downloadUrl?: string;
}

/*
 * Flat, warm-monochrome page: hairline #EAEAEA borders, charcoal text, muted #787774 for secondary text,
 * no shadows. Rank comes from size and weight: title 56 / question 28 / answer 18 / body 15 / labels 12.
 */
const label = "text-xs font-medium uppercase tracking-[0.08em] text-ink-muted";
const badge = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";
const outline = "inline-flex items-center gap-2 rounded-full border border-line-soft bg-surface px-4 text-sm font-medium text-ink transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-field-soft active:scale-[0.98]";

const Generating = ({ title, onBack }: { title: string; onBack: () => void }) => (
  <div className="mx-auto max-w-[560px] px-5 pb-24 pt-10 md:pt-14 font-geist text-ink">
    <h1 className="text-2xl font-medium">Writing model answers</h1>
    <p className="mt-3 text-base text-ink-muted">
      {title ? `${title}. ` : ""}This usually takes under a minute. You can go back to the paper; we will keep working and save the answers for next time.
    </p>
    <div className="mt-8 flex items-start gap-3" role="status">
      <CircleHalf size={20} weight="fill" className="mt-0.5 shrink-0 animate-pulse text-info-fg" />
      <p className="text-base font-medium">Writing answers</p>
    </div>
    <div className="mt-8 flex flex-col gap-3 pt-8" aria-hidden>
      {[35, 100, 92, 100, 70].map((w, i) => (
        <div key={i} style={{ width: `${w}%` }} className="h-2.5 animate-pulse rounded-full bg-field-soft" />
      ))}
    </div>
    <QuietButton tone="soft" className="mt-8" onClick={onBack}>Back to the paper</QuietButton>
  </div>
);

const QuestionSection = ({ q, index, last, onNext, onQuiz }: {
  q: AnswerQuestion; index: number; last: boolean; onNext: () => void; onQuiz?: () => void;
}) => {
  const reduce = useReducedMotion();
  const breakdown = q.marks_allocation?.breakdown ?? [];
  const steps = q.answer.working_steps ?? [];
  const keyPoints = q.key_points ?? [];
  return (
    <motion.section
      id={`q-${index}`}
      data-index={index}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="scroll-mt-28 rounded-xl border border-line-soft bg-surface p-6 md:p-10"
    >
      {/* Where you are */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${badge} bg-field-soft text-ink-soft`}>Q{q.question_number}</span>
        <span className={`${badge} bg-info-bg text-info-fg`}>{q.marks_allocation?.total_marks} marks</span>
        {q.answer_type && <span className={`${badge} bg-field-soft capitalize text-ink-muted`}>{q.answer_type}</span>}
      </div>

      {/* The question: largest text in the card */}
      <h2 className="mt-5 text-balance text-xl font-medium text-ink md:text-2xl">{q.question_text}</h2>

      {/* The answer: set apart on a flat warm panel */}
      <div className="mt-8 rounded-lg bg-field-soft p-5 md:p-7">
        <p className={label}>Model answer</p>
        <div className="mt-3 text-lg text-ink-soft md:text-lg [&_p:last-child]:mb-0 [&_p]:mb-4">
          <MixedContentRenderer text={q.answer.final_answer} />
        </div>
      </div>

      {/* Supporting detail, quieter */}
      {steps.length > 0 && (
        <div className="mt-8">
          <p className={label}>Working</p>
          <ol className="mt-3 flex flex-col gap-3 text-base text-ink-soft">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="w-5 shrink-0 text-sm text-ink-muted">{i + 1}.</span>
                <div className="min-w-0 flex-1"><StepRenderer step={step} /></div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {q.answer.explanation && (
        <div className="mt-8">
          <p className={label}>Explanation</p>
          <p className="mt-3 max-w-[62ch] text-base text-ink-muted">{q.answer.explanation}</p>
        </div>
      )}

      {(keyPoints.length > 0 || breakdown.length > 0) && (
        <div className="mt-8 grid gap-8 border-t border-line-soft pt-8 md:grid-cols-2 md:gap-12">
          {keyPoints.length > 0 && (
            <div>
              <p className={label}>How to answer it</p>
              <ol className="mt-3 flex flex-col gap-2.5 text-base text-ink-soft">
                {keyPoints.map((p, i) => (
                  <li key={i} className="flex gap-3"><span className="w-5 shrink-0 text-sm text-ink-muted">{i + 1}.</span>{p}</li>
                ))}
              </ol>
            </div>
          )}
          {breakdown.length > 0 && (
            <div>
              <p className={label}>How the marks are awarded</p>
              <ul className="mt-3 flex flex-col text-base text-ink-soft">
                {breakdown.map((b, i) => (
                  <li key={i} className="flex items-start justify-between gap-4 border-b border-line-soft py-2.5 first:pt-0 last:border-b-0">
                    <span>{b.step}</span>
                    <span className="shrink-0 tabular-nums text-ink-muted">{b.marks}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {(!last || onQuiz) && (
        <div className="mt-8 flex flex-wrap items-center gap-2">
          {onQuiz && (
            <button onClick={onQuiz} className={`${badge} h-10 gap-2 bg-info-bg px-4 text-sm text-info-fg transition-[opacity,transform] duration-300 hover:opacity-80 active:scale-[0.98]`}>
              Quiz yourself <ArrowRight size={14} />
            </button>
          )}
          {!last && (
            <button onClick={onNext} className={`${outline} h-10`}>
              Next: Question {index + 2} <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}
    </motion.section>
  );
};

export default function AnswersPage({ data, generating, title, onBack, onOpenPaper, onRegenerate, onQuiz, downloadUrl }: AnswersPageProps) {
  const [active, setActive] = useState(0);
  const [sheet, setSheet] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !mainRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(Number((e.target as HTMLElement).dataset.index))),
      { rootMargin: "-30% 0px -60% 0px" },
    );
    mainRef.current.querySelectorAll("section[data-index]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [data]);

  // Keep the current question in view inside the index without moving the page.
  useEffect(() => {
    const tray = trayRef.current;
    const el = tray?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!tray || !el) return;
    if (el.offsetTop < tray.scrollTop || el.offsetTop + el.offsetHeight > tray.scrollTop + tray.clientHeight) {
      tray.scrollTo({ top: el.offsetTop - tray.clientHeight / 2, behavior: "smooth" });
    }
  }, [active]);

  if (generating) return <Generating title={title} onBack={onBack} />;

  if (!data) {
    return (
      <div className="mx-auto max-w-[560px] px-5 pb-24 pt-10 md:pt-14 font-geist text-ink">
        <h1 className="text-2xl font-medium">No answers yet</h1>
        <p className="mt-3 text-base text-ink-muted">Open a past paper and choose Model answers.</p>
        <QuietButton tone="soft" className="mt-6" onClick={onBack}>Back</QuietButton>
      </div>
    );
  }

  const count = data.questions.length;
  const jump = (i: number) => { setSheet(false); document.getElementById(`q-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const heading = title || data.document_title;

  const list = (
    <ul className="flex flex-col gap-0.5">
      {data.questions.map((q, i) => (
        <li key={i}>
          <button
            onClick={() => jump(i)}
            aria-current={active === i ? "true" : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-300 ${active === i ? "bg-field-soft font-medium text-ink" : "text-ink-muted hover:bg-field-soft/70 hover:text-ink"}`}
          >
            <span className="w-9 shrink-0 text-sm text-ink-muted">{q.question_number}</span>
            <span className="min-w-0 flex-1 truncate">{q.question_text}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  // Number of questions and when they were written; nothing else.
  const stats = [
    { n: count, l: count === 1 ? "question" : "questions" },
    ...(data.savedAt ? [{ n: formatDate(new Date(data.savedAt)), l: "uploaded" }] : []),
  ];

  return (
    <div className="font-geist text-ink">
      <PageCrumbs onHome={onBack} trail={[{ label: heading, onClick: onOpenPaper }]} current="Model answers" />

      <div className="mx-auto max-w-[1200px] px-4 pb-28 pt-8 md:px-8 md:pb-32 md:pt-10">
        <header>
          <h1 className="max-w-[18ch] text-balance text-3xl font-medium md:text-4xl">{heading}</h1>

          <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-4">
            {stats.map((s) => (
              <div key={s.l}>
                <dd className="text-xl font-medium tabular-nums">{s.n}</dd>
                <dt className="mt-0.5 text-sm text-ink-muted">{s.l}</dt>
              </div>
            ))}
          </dl>

          <div className="mt-7 flex flex-wrap items-center gap-2">
            {onOpenPaper && (
              <button onClick={onOpenPaper} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-ink-fg transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-ink-hover active:scale-[0.98]">
                Open the paper <ArrowUpRight size={14} />
              </button>
            )}
            {downloadUrl && <a href={downloadUrl} target="_blank" rel="noreferrer" className={`${outline} hidden h-10 md:inline-flex`}>Download <DownloadSimple size={14} /></a>}
            {onRegenerate && <button onClick={onRegenerate} className={`${outline} h-10 text-ink-muted`}>Regenerate <ArrowsClockwise size={14} /></button>}
          </div>

          <p className="mt-6 flex max-w-[60ch] items-start gap-2 text-sm text-ink-muted">
            <Info size={16} className="mt-0.5 shrink-0" />
            Written by AI from the paper. Use these to check your method, then confirm facts against your lecture notes.
          </p>
        </header>

        {/* Phones: the question list opens inline, in the page flow */}
        <div className="mt-10 md:hidden">
          <button
            onClick={() => setSheet((v) => !v)} aria-expanded={sheet}
            className="flex h-12 w-full items-center gap-2 rounded-full border border-line-soft bg-surface px-5 text-base font-medium"
          >
            <ListChecks size={18} /> Questions
            <span className="ml-auto text-sm font-normal text-ink-muted">{count}</span>
            <CaretDown size={16} className={`transition-transform duration-300 ${sheet ? "rotate-180" : ""}`} />
          </button>
          {sheet && <div className="mt-2 rounded-xl border border-line-soft bg-surface p-2">{list}</div>}
        </div>

        {/* Split: a sticky index on the left, the cards on the right */}
        <div className="mt-10 grid gap-0 md:mt-16 md:grid-cols-[280px_minmax(0,1fr)] md:gap-12 lg:gap-16">
          <aside className="hidden md:block">
            <div className="sticky top-28">
              <div className="flex items-center justify-between px-3 pb-3">
                <p className={label}>Questions</p>
                <span className="text-sm tabular-nums text-ink-muted">{active + 1} / {count}</span>
              </div>
              <div ref={trayRef} className="relative max-h-[calc(100dvh-14rem)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{list}</div>
            </div>
          </aside>
          <div ref={mainRef} className="flex max-w-[780px] flex-col gap-5 md:gap-6">
            {data.questions.map((q, i) => (
              <QuestionSection key={i} q={q} index={i} last={i === count - 1} onQuiz={onQuiz} onNext={() => jump(i + 1)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
