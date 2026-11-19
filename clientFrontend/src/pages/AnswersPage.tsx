import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight, ArrowsClockwise, ArrowUpRight, ArrowUp, CaretDown, CircleHalf, DownloadSimple, Info, ListChecks, X,
} from "@phosphor-icons/react";
import { StepRenderer } from "@/components/study/StepRenderer";
import { MixedContentRenderer } from "@/components/study/MixedContentRenderer";
import PageCrumbs from "@/components/layout/PageCrumbs";
import { QuestionMobile } from "@/components/study/AnswersMobile";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile(); // phones get their own, full-width question layout
  const reduce = useReducedMotion();
  const [sheet, setSheet] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [pastHeader, setPastHeader] = useState(false);
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
  }, [data, isMobile]);

  // The scroll-to-top button appears once the page header has scrolled out of view.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setPastHeader(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
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
        <header ref={headerRef}>
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
              <button onClick={onOpenPaper} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-primary-dark active:scale-[0.98]">
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
          <div ref={mainRef} className={isMobile ? "flex flex-col" : "flex max-w-[780px] flex-col gap-5 md:gap-6"}>
            {data.questions.map((q, i) => isMobile
              ? <QuestionMobile key={i} q={q} index={i} last={i === count - 1} onQuiz={onQuiz} onNext={() => jump(i + 1)} />
              : <QuestionSection key={i} q={q} index={i} last={i === count - 1} onQuiz={onQuiz} onNext={() => jump(i + 1)} />)}
          </div>
        </div>
      </div>

      {/* Phones: a floating button (bottom right) that opens the question list in a sheet, so a 20-question paper is not a long hunt. */}
      <div className="md:hidden">
        <div className="fixed bottom-5 right-4 z-40 flex items-center gap-2">
          <button
            onClick={() => setSheet(true)}
            aria-haspopup="dialog" aria-expanded={sheet}
            aria-label={`Questions: viewing ${active + 1} of ${count}. Open the question list`}
            className="flex h-14 items-center gap-2.5 rounded-full bg-primary pl-5 pr-6 text-base font-medium text-primary-foreground shadow-[0_12px_32px_-12px_hsl(var(--ink)/0.5)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95"
          >
            <ListChecks size={20} />
            <span className="tabular-nums">{active + 1} / {count}</span>
          </button>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })}
            aria-label="Scroll to top"
            tabIndex={pastHeader ? 0 : -1}
            className={`flex h-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface/80 text-ink shadow-[0_12px_32px_-12px_hsl(var(--ink)/0.4)] ring-1 ring-line backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 ${pastHeader ? "w-14 opacity-100" : "pointer-events-none -ml-2 w-0 opacity-0 ring-0"}`}
          >
            <ArrowUp size={20} />
          </button>
        </div>

        {sheet && (
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Jump to a question" onKeyDown={(e) => e.key === "Escape" && setSheet(false)}>
            <button aria-label="Close question list" className="absolute inset-0 bg-ink/40" onClick={() => setSheet(false)} />
            <div className="absolute inset-x-0 bottom-0 flex max-h-[75dvh] flex-col rounded-t-3xl bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-16px_48px_-16px_rgba(14,21,37,0.3)]">
              <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" aria-hidden />
              <div className="flex items-center justify-between px-5 pb-2 pt-3">
                <p className="text-base font-medium">Questions <span className="ml-1 text-sm font-normal text-ink-muted">{count}</span></p>
                <button onClick={() => setSheet(false)} aria-label="Close" className="flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-field"><X size={20} /></button>
              </div>
              <ul className="overflow-y-auto px-3 pb-4">
                {data.questions.map((q, i) => (
                  <li key={i}>
                    <button
                      ref={i === active ? (el) => el?.scrollIntoView({ block: "center" }) : undefined}
                      onClick={() => jump(i)}
                      aria-current={active === i ? "true" : undefined}
                      className={`flex min-h-12 w-full items-center gap-4 rounded-2xl px-3 py-2 text-left text-base transition-colors duration-300 ${active === i ? "bg-field font-medium text-ink" : "text-ink-muted active:bg-field"}`}
                    >
                      <span className="w-10 shrink-0 tabular-nums text-ink">{q.question_number}</span>
                      <span className="line-clamp-2 min-w-0 flex-1">{q.question_text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
