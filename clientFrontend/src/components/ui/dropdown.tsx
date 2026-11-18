import { useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { cn } from "@/lib/utils";

// Ported from the Enterprise frontend's ui/dropdown.tsx; its design tokens are mapped to this app's hex values.
// Unlike the original, the menu stays anchored under its trigger on phones (no bottom-sheet overlay).

export interface DropdownItem {
  id: string;
  name: string;
}

/** The option list on its own: a search box (for longer lists) over the options, with a check on the active one. */
export function DropdownList({ items, selectedId, onSelect }: { items: DropdownItem[]; selectedId: string; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  // Short lists are quicker to scan than to search.
  const searchable = items.length > 5;
  const shown = items.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <>
      {searchable && (
        <label className="mb-1 flex items-center gap-2 rounded-xl bg-field px-3 py-1.5">
          <Search className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search options" className="w-full min-w-28 bg-transparent text-sm outline-none placeholder:text-ink-muted" />
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
            className={cn("flex cursor-pointer items-center gap-3 whitespace-nowrap rounded-xl px-3 py-1.5 text-sm hover:bg-field", item.id === selectedId && "bg-field font-medium")}
          >
            {item.name}
            {item.id === selectedId && <Check className="ml-auto size-4 shrink-0 text-brand" />}
          </li>
        ))}
      </ul>
    </>
  );
}

/** Custom select: pill trigger with an optional muted label, and a popover list with a check on the active item. */
export function Dropdown({
  label,
  items,
  selectedId,
  onSelect,
  align = "left",
  placeholder,
  disabled,
  fullWidth,
}: {
  label?: string;
  items: DropdownItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  align?: "left" | "right";
  placeholder?: string;
  disabled?: boolean;
  /** Fill the parent (form fields) instead of hugging the selected text. */
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useOutsideClick(ref, close);

  const selected = items.find((i) => i.id === selectedId);

  return (
    <div ref={ref} className={cn("relative max-w-full", fullWidth ? "w-full" : "w-max")} onKeyDown={(e) => e.key === "Escape" && close()}>
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className={cn(
          "flex max-w-full cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface py-1.5 pl-3 pr-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:gap-3 sm:pl-4 sm:pr-3",
          fullWidth ? "min-h-11 w-full justify-between text-base" : "w-max",
        )}
      >
        {label && !fullWidth && <span className="shrink-0 border-r border-line-strong pr-2 text-ink-muted sm:pr-3">{label.replace(/:$/, "")}</span>}
        <span className={cn("truncate whitespace-nowrap font-medium leading-[1.4]", !selected && "font-normal text-ink-muted")}>{selected?.name ?? placeholder ?? ""}</span>
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className={cn("absolute top-full z-20 mt-2 w-max min-w-full max-w-[calc(100vw-2.5rem)] rounded-2xl border border-line bg-surface p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.08)]", fullWidth && "max-w-full", align === "right" ? "right-0" : "left-0")}>
          <DropdownList items={items} selectedId={selectedId} onSelect={(id) => { onSelect(id); close(); }} />
        </div>
      )}
    </div>
  );
}
