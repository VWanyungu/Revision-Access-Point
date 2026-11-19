import { useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useOutsideClick } from '@/hooks/useOutsideClick';
import { cn } from '@/lib/utils';

export interface DropdownItem {
  id: string;
  name: string;
}

/** The option list: a search box for longer lists, a check on the active option. */
export function DropdownList({ items, selectedId, onSelect, wrap }: { items: DropdownItem[]; selectedId: string; onSelect: (id: string) => void; wrap?: boolean }) {
  const [query, setQuery] = useState('');
  const searchable = true; // every admin dropdown has a search box, however short the list
  const shown = items.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <>
      {searchable && (
        <label className="mb-1 flex items-center gap-2 rounded-full bg-field px-3 py-1.5">
          <Search className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search options" className="w-full min-w-28 bg-transparent text-sm outline-none placeholder:text-ink-subtle" />
        </label>
      )}
      <ul role="listbox" className="max-h-60 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {shown.length === 0 && <li className="px-3 py-1.5 text-sm text-ink-muted">No matches</li>}
        {shown.map((item) => (
          <li
            key={item.id}
            role="option"
            aria-selected={item.id === selectedId}
            onClick={() => onSelect(item.id)}
            className={cn(wrap ? 'flex cursor-pointer items-start gap-3 rounded-2xl px-3 py-1.5 text-sm hover:bg-field' : 'flex cursor-pointer items-center gap-3 whitespace-nowrap rounded-full px-3 py-1.5 text-sm hover:bg-field', item.id === selectedId && 'bg-field font-medium')}
          >
            {item.name}
            {item.id === selectedId && <Check className="ml-auto size-4 shrink-0 text-brand" />}
          </li>
        ))}
      </ul>
    </>
  );
}

/** Pill trigger with an optional muted label and a popover list. `block` makes it fill its container (forms). */
export function Dropdown({ label, items, selectedId, onSelect, align = 'left', placeholder = '', block, disabled, className }: {
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
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useOutsideClick(ref, close);
  const selected = items.find((i) => i.id === selectedId);

  return (
    <div ref={ref} className={cn('relative max-w-full', block ? 'w-full' : 'w-max')} onKeyDown={(e) => e.key === 'Escape' && close()}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        className={cn('flex max-w-full cursor-pointer items-center gap-2 rounded-full border border-input bg-surface py-2 pl-4 pr-3 text-sm max-md:min-h-11 disabled:cursor-not-allowed disabled:opacity-50', block ? 'w-full justify-between' : 'w-max', className)}
      >
        {label && <span className="shrink-0 border-r border-input pr-3 text-ink-muted">{label.replace(/:$/, '')}</span>}
        <span className={cn('truncate whitespace-nowrap', selected ? 'font-medium' : 'text-ink-subtle')}>{selected?.name ?? placeholder}</span>
        <ChevronDown className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className={cn('absolute top-full z-50 mt-2 rounded-3xl border border-line bg-surface p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.08)]', block ? 'w-full' : 'w-max min-w-full max-w-[90vw]', align === 'right' ? 'right-0' : 'left-0')}>
          {/* In forms the list is exactly as wide as the field (it sits in a narrow side panel), so long names wrap instead of overflowing. */}
          <DropdownList wrap={block} items={items} selectedId={selectedId} onSelect={(id) => { onSelect(id); close(); }} />
        </div>
      )}
    </div>
  );
}
