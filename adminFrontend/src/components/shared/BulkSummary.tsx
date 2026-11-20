import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Props {
  running: boolean;
  verb: string; // "Uploading" / "Adding"
  doneVerb: string; // "uploaded" / "added"
  progress: number;
  succeeded: number;
  failed: number;
  onRetry: () => void;
}

/** Progress while a batch runs; afterwards "12 uploaded, 3 failed" with a way to retry only the failures. */
export const BulkSummary = ({ running, verb, doneVerb, progress, succeeded, failed, onRetry }: Props) => {
  if (running) {
    return (
      <div className="mb-4 space-y-2" role="status">
        <div className="flex justify-between text-xs text-ink-muted"><span>{verb}…</span><span className="tabular-nums">{progress}%</span></div>
        <Progress value={progress} className="h-1" />
      </div>
    );
  }
  if (!succeeded && !failed) return null;
  return (
    <div className="mb-4 flex items-center justify-between gap-3" role="status">
      <p className="text-sm text-ink">{succeeded} {doneVerb}{failed ? <>, <span className="text-danger">{failed} failed</span></> : null}</p>
      {failed > 0 && <Button variant="outline" size="sm" onClick={onRetry}>Retry failed</Button>}
    </div>
  );
};
