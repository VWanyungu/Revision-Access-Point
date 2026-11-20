import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownItem {
  id: string;
  name: string;
}

/**
 * The option list: a search box (the combobox), arrow keys to move, Enter to choose, a check on the active option.
 * Focus stays in the search box; the highlighted option is announced through aria-activedescendant.
 */
export function DropdownList({ items, selectedId, onSelect, wrap }: { items: DropdownItem[]; selectedId: string; onSelect: (id: string) => void; wrap?: boolean }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const uid = useId();
  const shown = items.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()));
  const optId = (i: number) => `${uid}-opt-${i}`;

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => { document.getElementById(`${uid}-opt-${active}`)?.scrollIntoView({ block: 'nearest' }); }, [active, uid]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, shown.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(shown.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[active]) onSelect(shown[active].id); }
  };

  return (
    <>
      <label className="mb-1 flex items-center gap-2 rounded-full bg-field px-3 py-1.5">
        <Search className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
        <input
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls={`${uid}-list`}
          aria-activedescendant={shown.length ? optId(active) : undefined}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search"
          aria-label="Search options"
          className="w-full min-w-28 bg-transparent text-sm outline-none placeholder:text-ink-subtle"
        />
      </label>
      <ul id={`${uid}-list`} role="listbox" className="max-h-60 overflow-y-auto">
        {shown.length === 0 && <li role="presentation" className="px-3 py-1.5 text-sm text-ink-muted">No matches</li>}
        {shown.map((item, i) => (
          <li
            key={item.id}
            id={optId(i)}
            role="option"
            aria-selected={item.id === selectedId}
            onClick={() => onSelect(item.id)}
            onMouseMove={() => active !== i && setActive(i)}
            className={cn(wrap ? 'flex cursor-pointer items-start gap-3 rounded-2xl px-3 py-1.5 text-sm' : 'flex cursor-pointer items-center gap-3 whitespace-nowrap rounded-full px-3 py-1.5 text-sm', i === active && 'bg-field', item.id === selectedId && 'font-medium')}
          >
            {item.name}
            {item.id === selectedId && <Check className="ml-auto size-4 shrink-0 text-brand" />}
          </li>
        ))}
      </ul>
    </>
  );
}

/** Pill trigger with an optional muted label and a popover list. `block` makes it fill its container (forms). Pass `id` so a <Label htmlFor> reaches the trigger. */
export function Dropdown({ id, label, items, selectedId, onSelect, align = 'left', placeholder = '', block, disabled, className }: {
  id?: string;
  label?: string;
  items: DropdownItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  align?: 'left' | 'right';
  placeholder?: string;
  block?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const close = (refocus = false) => { setOpen(false); if (refocus) triggerRef.current?.focus(); };
  // The list is portalled out of `ref`, so a press inside either box is not "outside".
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !popRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  const selected = items.find((i) => i.id === selectedId);

  // Portalled to <body> so the side panel's overflow can never clip it; placed from the trigger's box, flipped above when low on room.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom;
      const flip = below < 300 && r.top > below;
      setPos({ left: r.left, width: r.width, ...(flip ? { bottom: window.innerHeight - r.top + 8 } : { top: r.bottom + 8 }) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); setPos(null); };
  }, [open]);

  return (
    <div ref={ref} className={cn('relative max-w-full', block ? 'w-full' : 'w-max')}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); setOpen(true); }
          if (open && e.key === 'Escape') { e.stopPropagation(); close(); }
        }}
        className={cn('flex max-w-full cursor-pointer items-center gap-2 rounded-full border border-input bg-surface py-2 pl-4 pr-3 text-sm max-md:min-h-11 disabled:cursor-not-allowed disabled:opacity-50', block ? 'w-full justify-between' : 'w-max', className)}
      >
        {label && <span className="shrink-0 border-r border-input pr-3 text-ink-muted">{label.replace(/:$/, '')}</span>}
        <span className={cn('truncate whitespace-nowrap', selected ? 'font-medium' : 'text-ink-subtle')}>{selected?.name ?? placeholder}</span>
        <ChevronDown className={cn('size-4 shrink-0 transition-transform duration-fast ease-house', open && 'rotate-180')} />
      </button>

      {open && pos && createPortal(
        <div
          ref={popRef}
          style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, ...(align === 'right' ? { right: window.innerWidth - pos.left - pos.width } : { left: pos.left }), ...(block ? { width: pos.width } : { minWidth: pos.width }) }}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); close(true); } }}
          className={cn('z-50 animate-fade-in rounded-3xl border border-line bg-surface p-1.5 shadow-float', !block && 'w-max max-w-[90vw]')}
        >
          {/* In forms the list is exactly as wide as the field (it sits in a narrow side panel), so long names wrap instead of overflowing. */}
          <DropdownList wrap={block} items={items} selectedId={selectedId} onSelect={(sel) => { onSelect(sel); close(true); }} />
        </div>,
        document.body,
      )}
    </div>
  );
}
