import { Dropdown } from '@/components/ui/dropdown';

interface ComboboxProps {
  id?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

/** Kept for its call sites: a full-width Dropdown (searchable once the list is long). */
export function Combobox({ id, options, value, onChange, placeholder = 'Select item...', className, disabled }: ComboboxProps) {
  return (
    <Dropdown
      id={id}
      block
      disabled={disabled}
      className={className}
      placeholder={placeholder}
      items={options.map((o) => ({ id: o.value, name: o.label }))}
      selectedId={value}
      onSelect={onChange}
    />
  );
}
