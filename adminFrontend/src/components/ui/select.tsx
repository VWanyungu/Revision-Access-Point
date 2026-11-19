import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { Dropdown, type DropdownItem } from '@/components/ui/dropdown';

const text = (n: ReactNode): string => (Array.isArray(n) ? n.map(text).join('') : typeof n === 'string' || typeof n === 'number' ? String(n) : '');

/** Depth-first search through the element tree for the Radix-style parts we map to the Dropdown. */
function collect(node: ReactNode, out: { items: DropdownItem[]; placeholder: string }) {
  Children.forEach(node, (c) => {
    if (!isValidElement(c)) return;
    const el = c as ReactElement<{ value?: string; children?: ReactNode; placeholder?: string; disabled?: boolean }>;
    if (el.type === SelectItem) { if (!el.props.disabled) out.items.push({ id: String(el.props.value), name: text(el.props.children) }); }
    else if (el.type === SelectValue) out.placeholder = el.props.placeholder ?? out.placeholder;
    else collect(el.props.children, out);
  });
}

export const Select = ({ value, onValueChange, disabled, children }: { value?: string; onValueChange?: (v: string) => void; disabled?: boolean; required?: boolean; children?: ReactNode }) => {
  const parts = { items: [] as DropdownItem[], placeholder: '' };
  collect(children, parts);
  return <Dropdown block disabled={disabled} items={parts.items} selectedId={value ?? ''} placeholder={parts.placeholder} onSelect={(id) => onValueChange?.(id)} />;
};

// Markers only: Select reads their props and renders everything itself.
export const SelectTrigger = ({ children }: { children?: ReactNode; className?: string }) => <>{children}</>;
export const SelectValue = (_: { placeholder?: string }) => null;
export const SelectContent = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const SelectItem = (_: { value: string; children?: ReactNode; disabled?: boolean }) => null;
