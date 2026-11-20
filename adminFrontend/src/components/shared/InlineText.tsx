import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Click the pencil to edit a single value in place; save with the check or Enter, cancel with X or Escape. */
export const InlineText = ({ value, onSave, type = 'text', className, children, validate }: {
  value: string;
  onSave: (next: string) => Promise<unknown> | void;
  type?: string;
  className?: string;
  /** Shown instead of the plain value when not editing. */
  children?: React.ReactNode;
  validate?: (v: string) => boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const next = draft.trim();
  const valid = !!next && next !== value && (validate ? validate(next) : true);

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    try { await onSave(next); setEditing(false); } finally { setBusy(false); }
  };

  if (!editing)
    return (
      <span className={cn('group inline-flex items-center gap-2', className)}>
        <span>{children ?? value}</span>
        <button type="button" aria-label="Edit" onClick={() => { setDraft(value); setEditing(true); }} className="relative text-ink-muted opacity-0 transition-opacity duration-fast hover:text-ink focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-60 before:absolute before:-inset-3 before:content-['']">
          <Pencil className="size-3.5" />
        </button>
      </span>
    );

  const btn = 'flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface disabled:opacity-40';
  return (
    <span className={cn('flex items-center gap-1.5', className)}>
      <Input autoFocus type={type} value={draft} onChange={(e) => setDraft(e.target.value)} className="h-8 min-w-32"
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} />
      <button type="button" aria-label="Save" disabled={busy || !valid} onClick={save} className={cn(btn, 'text-brand hover:bg-field')}><Check className="size-4" /></button>
      <button type="button" aria-label="Cancel" disabled={busy} onClick={() => setEditing(false)} className={cn(btn, 'hover:bg-field')}><X className="size-4" /></button>
    </span>
  );
};
