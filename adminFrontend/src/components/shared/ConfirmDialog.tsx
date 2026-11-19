import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: 'default' | 'destructive';
}

/** Inline confirmation banner (no modal). */
export const ConfirmDialog = ({ open, onOpenChange, title, description, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, variant = 'default' }: ConfirmDialogProps) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [open]);
  if (!open) return null;
  return (
    <div ref={ref} role="alert" className="my-6 flex flex-col gap-4 rounded-3xl bg-surface p-6 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 whitespace-pre-line text-sm text-ink-muted">{description}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>{cancelText}</Button>
        <Button variant={variant === 'destructive' ? 'destructive' : 'default'} onClick={onConfirm}>{confirmText}</Button>
      </div>
    </div>
  );
};
