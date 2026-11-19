import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, CaretDown, Info, X as XIcon } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { recordQuiz } from "@/database/progress";
import PageCrumbs from "@/components/layout/PageCrumbs";
import { EASE, InkButton, PayBottomBar, QuietButton } from "@/components/pay/PayKit";

/** A page, not an overlay: it renders inside the app layout and `onClose` returns to where the quiz was started. */
interface QuizSystemProps {
  onClose: () => void;
  resourcePublicAccessUrl: string;
  resourceTitle: string;
}

type Stage = "setup" | "playing" | "results" | "error";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  topic: string;
  /** Needs adding to the generate-quiz function's output; shown on the results screen when present. */
  explanation?: string;
}

const COUNTS = [5, 10, 15];
const LEVELS = ["easy", "medium", "hard"] as const;
const EXAM_SECONDS = 90;
const letter = (i: number) => String.fromCharCode(65 + i);

const Chip = ({ active, children, ...rest }: { active: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    aria-pressed={active}
    className={`h-10 rounded-full px-5 text-base capitalize transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] ${
      active ? "bg-field font-medium text-ink" : "text-ink-muted hover:text-ink"
    }`}
    {...rest}
  >
    {children}
  </button>
);

const Switch = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button
    type="button" role="switch" aria-checked={on} aria-label={label}
    onClick={() => onChange(!on)}
    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 ${on ? "bg-brand-solid" : "bg-line-strong"}`}
  >
    <span className={`absolute left-1 top-1 size-5 rounded-full bg-surface transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${on ? "translate-x-5" : ""}`} />
  </button>
);

const QuizSystem = ({ onClose, resourcePublicAccessUrl, resourceTitle }: QuizSystemProps) => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<Stage>("setup");
  const [count, setCount] = useState(10);
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("medium");
  const [examPace, setExamPace] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [left, setLeft] = useState(EXAM_SECONDS);
  const [open, setOpen] = useState<number | null>(null);

  // Exam pace: a real 90 second countdown per question. When it ends, an unanswered question counts as wrong.
  useEffect(() => {
    if (stage !== "playing" || !examPace) return;
    if (left <= 0) { advance(); return; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  });

  const title = `Quiz on ${resourceTitle || "this note"}`;

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ fileUrl: resourcePublicAccessUrl, numberOfQuestions: count, difficulty: level }),
      });
      const data = await res.json();
      if (!res.ok || data.error || !Array.isArray(data.data) || data.data.length === 0) {
        setErrorText(typeof data.error === "string" ? data.error : "");
        setStage("error");
        return;
      }
      setQuestions(data.data);
      setAnswers({}); setCurrent(0); setLeft(EXAM_SECONDS);
      setStage("playing");
    } catch {
      setErrorText("");
      setStage("error");
    } finally {
      setLoading(false);
    }
  };

  const advance = () => {
    if (current < questions.length - 1) { setCurrent(current + 1); setLeft(EXAM_SECONDS); }
    else { setOpen(null); setStage("results"); }
  };

  const missed = useMemo(
    () => questions.map((q, i) => ({ q, i })).filter(({ q, i }) => answers[i] !== q.correctAnswer),
    [questions, answers],
  );
  const correct = questions.length - missed.length;
  const weakTopics = useMemo(() => [...new Set(missed.map(({ q }) => q.topic).filter(Boolean))], [missed]);

  // Save each finished quiz so the unit page can show best score and attempts.
  useEffect(() => {
    const userId = session?.user?.id;
    if (stage !== "results" || !questions.length || !userId) return;
    recordQuiz(userId, resourcePublicAccessUrl, correct, questions.length)
      .then(() => queryClient.invalidateQueries({ queryKey: ["progress"] }))
      .catch((e) => console.error("Could not save quiz score", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- record once per results screen
  }, [stage]);

  const retryMissed = () => {
    setQuestions(missed.map(({ q }) => q));
    setAnswers({}); setCurrent(0); setLeft(EXAM_SECONDS); setStage("playing");
  };

  const q = questions[current];

  // Home > note / (Quiz /) current page. `quiz` adds the Quiz crumb; `toQuiz` makes it clickable (only where leaving is safe).
  const bar = (page: string, opts: { quiz?: boolean; toQuiz?: () => void; right?: React.ReactNode } = {}) => (
    <PageCrumbs
      onHome={onClose}
      current={page}
      trail={[{ label: resourceTitle || "This note", onClick: onClose }, ...(opts.quiz ? [{ label: "Quiz", onClick: opts.toQuiz }] : [])]}
      right={opts.right}
    />
  );

  const screens: Record<Stage, JSX.Element> = {
    setup: (
      <>
        {bar("Quiz")}
        <Frame>
          <h1 className="font-literata text-xl md:text-2xl">{title}</h1>
          <p className="mt-2 text-sm text-ink-muted">Made from this note by AI.</p>

          <p className="mt-8 text-base font-medium">Questions</p>
          <div className="mt-3 flex gap-1">{COUNTS.map((n) => <Chip key={n} active={count === n} onClick={() => setCount(n)}>{n}</Chip>)}</div>

          <p className="mt-8 text-base font-medium">Difficulty</p>
          <div className="mt-3 flex gap-1">{LEVELS.map((l) => <Chip key={l} active={level === l} onClick={() => setLevel(l)}>{l}</Chip>)}</div>

          <div className="mt-8 flex items-start justify-between gap-4 border-t border-line pt-6">
            <div>
              <p className="text-base font-medium">Exam pace</p>
              <p className="mt-1 text-sm text-ink-muted">{EXAM_SECONDS} seconds per question. Unanswered questions count as wrong when time runs out.</p>
            </div>
            <Switch on={examPace} onChange={setExamPace} label="Exam pace" />
          </div>

          <PayBottomBar>
            <InkButton className="w-full" disabled={loading} onClick={generate}>
              {loading ? "Making your quiz…" : `Generate ${count} questions`}
            </InkButton>
            <p className="text-sm text-ink-muted">Questions are AI-generated from this note.</p>
          </PayBottomBar>
        </Frame>
      </>
    ),

    playing: q ? (
      <>
        {bar(`Question ${current + 1} of ${questions.length}`, {
          quiz: true,
          right: examPace && (
            <span className={`shrink-0 font-geist-mono text-sm tabular-nums ${left <= 10 ? "text-danger" : "text-ink-muted"}`}>
              {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
            </span>
          ),
        })}
        <div className="flex gap-1 px-5 pt-0 md:mx-auto md:max-w-[480px] md:px-0 md:pt-6" aria-hidden>
          {questions.map((_, i) => (
            <span key={i} className={`h-[3px] flex-1 rounded-full transition-colors duration-500 ${i < current ? "bg-ink" : i === current ? "bg-brand-solid" : "bg-line"}`} />
          ))}
        </div>
        <Frame keyed={current}>
          <h1 className="font-literata text-xl md:text-2xl">{q.question}</h1>
          <div role="radiogroup" aria-label="Answers" className="mt-6 flex flex-col gap-1">
            {q.options.map((opt, i) => {
              const on = answers[current] === i;
              return (
                <button
                  key={i} role="radio" aria-checked={on}
                  onClick={() => setAnswers({ ...answers, [current]: i })}
                  className={`flex items-center gap-4 rounded-[10px] px-3 py-3.5 text-left text-base transition-colors duration-300 ${on ? "bg-field-strong font-medium" : "hover:bg-field"}`}
                >
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-sm transition-colors duration-300 ${on ? "border-brand bg-brand-solid text-white" : "border-line-strong"}`}>{letter(i)}</span>
                  {opt}
                </button>
              );
            })}
          </div>
          <PayBottomBar>
            <div className="flex w-full items-center justify-between">
              <QuietButton disabled={current === 0} onClick={() => setCurrent(current - 1)}>Previous</QuietButton>
              <InkButton disabled={!examPace && answers[current] === undefined} onClick={advance}>
                {current === questions.length - 1 ? "Finish" : "Next"}
              </InkButton>
            </div>
          </PayBottomBar>
        </Frame>
      </>
    ) : <></>,

    results: (
      <>
        {bar("Results", { quiz: true, toQuiz: () => setStage("setup") })}
        <Frame>
          <h1 className="font-literata text-2xl md:text-3xl">{correct} of {questions.length} correct</h1>
          <p className="mt-2 text-base text-ink-muted">
            {missed.length ? `Review the ${missed.length} you missed, then retry just those.` : "You got every question right."}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {missed.length > 0 && <InkButton onClick={retryMissed}>Retry these {missed.length}</InkButton>}
            <QuietButton tone="soft" onClick={() => setStage("setup")}>New quiz</QuietButton>
          </div>

          {weakTopics.length > 0 && (
            <div className="mt-8">
              <p className="text-base font-medium">Topics to review</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {weakTopics.map((t) => <span key={t} className="rounded-full bg-field px-4 py-2.5 text-base font-medium">{t}</span>)}
              </div>
            </div>
          )}

          {missed.length > 0 && (
            <ul className="mt-10 border-t border-line">
              {missed.map(({ q: mq, i }, n) => {
                const isOpen = open === i || (open === null && n === 0);
                const mine = answers[i];
                return (
                  <li key={i} className="border-b border-line py-5">
                    <button className="flex w-full items-center justify-between font-geist-mono text-sm text-ink-muted" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)}>
                      <span>Question {i + 1}</span>
                      {isOpen ? <span className="font-geist text-sm font-medium text-danger">Missed</span> : <CaretDown size={16} />}
                    </button>
                    <p className={`mt-2 ${isOpen ? "font-literata text-xl" : "text-base font-medium"}`}>{mq.question}</p>
                    {isOpen && (
                      <div className="mt-4 flex flex-col gap-1">
                        {mine !== undefined && <Answer label="Your answer" tone="wrong" i={mine} text={mq.options[mine]} />}
                        {mine === undefined && <p className="text-sm text-ink-muted">You did not answer this one.</p>}
                        <Answer label="Correct answer" tone="right" i={mq.correctAnswer} text={mq.options[mq.correctAnswer]} />
                        {mq.explanation && <p className="mt-3 text-base text-ink-muted">{mq.explanation}</p>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Frame>
      </>
    ),

    error: (
      <>
        {bar("Couldn’t make a quiz", { quiz: true, toQuiz: () => setStage("setup") })}
        <div className="px-5 pb-24 pt-24 md:mx-auto md:max-w-[480px] md:px-0">
          <Info size={28} className="text-ink-muted" />
          <h1 className="mt-4 font-literata text-xl md:text-2xl">We couldn’t make a quiz from this note</h1>
          <p className="mt-3 text-base text-ink-muted">
            {errorText || "Something went wrong while reading it. This can happen when a PDF is a scan with no text to read. Try another note from this unit, or the past papers."}
          </p>
          <div className="mt-6 flex items-center gap-2">
            <InkButton onClick={onClose}>Choose another note</InkButton>
            <QuietButton onClick={() => setStage("setup")}>Back</QuietButton>
          </div>
        </div>
      </>
    ),
  };

  return (
    <div className="-mt-[60px] min-h-dvh bg-surface pt-[60px] font-geist text-ink md:-mt-16 md:pt-16">
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          {screens[stage]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const Frame = ({ children, keyed }: { children: React.ReactNode; keyed?: number }) => (
  <div key={keyed} className="px-5 pb-44 pt-8 md:mx-auto md:max-w-[480px] md:px-0 md:pb-24 md:pt-10">{children}</div>
);

const Answer = ({ label, tone, i, text }: { label: string; tone: "right" | "wrong"; i: number; text: string }) => {
  const c = tone === "right" ? "hsl(var(--positive))" : "hsl(var(--danger))";
  return (
    <>
      <p className="mt-2 text-sm text-ink-muted">{label}</p>
      <div className="flex items-center gap-4 px-3 py-2.5 text-base">
        <span style={{ borderColor: c, color: c }} className="flex size-8 shrink-0 items-center justify-center rounded-full border text-sm">{letter(i)}</span>
        <span className="flex-1">{text}</span>
        {tone === "right" ? <Check size={16} style={{ color: c }} /> : <XIcon size={16} style={{ color: c }} />}
      </div>
    </>
  );
};

export default QuizSystem;
