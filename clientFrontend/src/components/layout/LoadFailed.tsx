import { InkButton, QuietButton } from "@/components/pay/PayKit";

interface Props {
  /** What could not be loaded, in the student's words. */
  title?: string;
  message?: string;
  onRetry: () => void;
  /** Optional second way out (e.g. back to the paper). */
  onBack?: { label: string; onClick: () => void };
  className?: string;
}

/**
 * One calm "could not load, try again" state for every query. A failed request must never read as "you have nothing":
 * an empty list, a missing pass and a dropped connection are different situations.
 */
const LoadFailed = ({
  title = "Couldn't load this",
  message = "Check your connection and try again. Nothing was lost.",
  onRetry, onBack, className = "",
}: Props) => (
  <div role="alert" className={`mx-auto flex w-full max-w-md flex-col items-center gap-5 rounded-3xl bg-surface p-8 text-center ring-1 ring-line ${className}`}>
    <div className="flex flex-col gap-1.5">
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="text-base text-ink-muted">{message}</p>
    </div>
    <div className="flex flex-wrap items-center justify-center gap-2">
      <InkButton type="button" onClick={onRetry}>Try again</InkButton>
      {onBack && <QuietButton type="button" tone="soft" onClick={onBack.onClick}>{onBack.label}</QuietButton>}
    </div>
  </div>
);

export default LoadFailed;
