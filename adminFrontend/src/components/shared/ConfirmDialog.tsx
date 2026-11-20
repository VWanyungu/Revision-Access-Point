import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<unknown>;
  variant?: 'default' | 'destructive';
}

/** Inline confirmation banner (no modal). */
export const ConfirmDialog = ({ open, onOpenChange, title, description, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, variant = 'default' }: ConfirmDialogProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // Land on the safe choice, so Enter does not delete by accident.
    cancelRef.current?.focus({ preventScroll: true });
  }, [open]);
  if (!open) return null;
  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  };
  return (
    <div
      ref={ref}
      role="alertdialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      onKeyDown={(e) => { if (e.key === 'Escape' && !busy) onOpenChange(false); }}
      className="my-6 flex flex-col gap-4 rounded-3xl bg-surface p-6 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h2 id="confirm-title" className="text-lg font-semibold">{title}</h2>
        <p id="confirm-desc" className="mt-1 whitespace-pre-line text-sm text-ink-muted">{description}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button ref={cancelRef} variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>{cancelText}</Button>
        <Button variant={variant === 'destructive' ? 'destructive' : 'default'} disabled={busy} aria-busy={busy} onClick={confirm}>{busy ? 'Working…' : confirmText}</Button>
      </div>
    </div>
  );
};
