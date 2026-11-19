import { StepRenderer } from "@/components/study/StepRenderer";
import { MixedContentRenderer } from "@/components/study/MixedContentRenderer";
import type { AnswerQuestion } from "@/pages/AnswersPage";

const badge = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";
const label = "text-sm font-medium text-ink-muted";
const action = "inline-flex min-h-11 items-center text-sm font-medium transition-opacity duration-300 active:opacity-60";

/**
 * One question of a paper's model answers, laid out for phones: no card and no border, so the text uses the
 * full width (16px gutters). Questions are separated by a hairline, and the model answer is a full-bleed tinted band.
 * The desktop layout (cards, two columns) stays in AnswersPage.
 */
export const QuestionMobile = ({ q, index, last, onNext, onQuiz }: {
  q: AnswerQuestion; index: number; last: boolean; onNext: () => void; onQuiz?: () => void;
}) => {
  const breakdown = q.marks_allocation?.breakdown ?? [];
  const steps = q.answer.working_steps ?? [];
  const keyPoints = q.key_points ?? [];

  return (
    <section id={`q-${index}`} data-index={index} className="scroll-mt-24 border-t border-line-soft py-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${badge} bg-field-soft text-ink-soft`}>Q{q.question_number}</span>
        {q.marks_allocation?.total_marks && <span className={`${badge} bg-info-bg text-info-fg`}>{q.marks_allocation.total_marks} marks</span>}
        {q.answer_type && <span className={`${badge} bg-field-soft capitalize text-ink-muted`}>{q.answer_type}</span>}
      </div>

      <h2 className="mt-3 text-lg font-medium leading-snug text-ink">{q.question_text}</h2>

      {/* Edge to edge: cancels the page gutter so the answer is not boxed in. */}
      <div className="-mx-4 mt-4 bg-field-soft px-4 py-4">
        <p className={label}>Model answer</p>
        <div className="mt-2 text-base leading-relaxed text-ink-soft [&_p:last-child]:mb-0 [&_p]:mb-3">
          <MixedContentRenderer text={q.answer.final_answer} />
        </div>
      </div>

      {steps.length > 0 && (
        <div className="mt-5">
          <p className={label}>Working</p>
          <ol className="mt-2 flex flex-col gap-2.5 text-base text-ink-soft">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-4 shrink-0 text-sm text-ink-muted">{i + 1}.</span>
                <div className="min-w-0 flex-1"><StepRenderer step={step} /></div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {q.answer.explanation && (
        <div className="mt-5">
          <p className={label}>Explanation</p>
          <p className="mt-2 text-base text-ink-muted">{q.answer.explanation}</p>
        </div>
      )}

      {keyPoints.length > 0 && (
        <div className="mt-5">
          <p className={label}>How to answer it</p>
          <ol className="mt-2 flex flex-col gap-2 text-base text-ink-soft">
            {keyPoints.map((p, i) => (
              <li key={i} className="flex gap-3"><span className="w-4 shrink-0 text-sm text-ink-muted">{i + 1}.</span>{p}</li>
            ))}
          </ol>
        </div>
      )}

      {breakdown.length > 0 && (
        <div className="mt-5">
          <p className={label}>How the marks are awarded</p>
          <ul className="mt-2 flex flex-col text-base text-ink-soft">
            {breakdown.map((b, i) => (
              <li key={i} className="flex items-start justify-between gap-4 border-b border-line-soft py-2 first:pt-0 last:border-b-0">
                <span className="min-w-0">{b.step}</span>
                <span className="shrink-0 tabular-nums text-ink-muted">{b.marks}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(!last || onQuiz) && (
        <div className="mt-3 flex items-center gap-6">
          {onQuiz && <button onClick={onQuiz} className={`${action} text-brand`}>Quiz yourself</button>}
          {!last && <button onClick={onNext} className={`${action} text-ink-muted`}>Next question</button>}
        </div>
      )}
    </section>
  );
};
