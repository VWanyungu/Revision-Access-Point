import { ReactNode } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface IconActionProps { label: string; icon: ReactNode; onClick?: () => void; disabled?: boolean; danger?: boolean; hint?: string }

/** One icon button with a tooltip. aria-label carries the row name so a screen reader hears which row. */
export const IconAction = ({ label, icon, onClick, disabled, danger, hint }: IconActionProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      {/* span keeps the tooltip working on a disabled button */}
      <span>
        <Button type="button" variant="ghost" size="icon" aria-label={label} disabled={disabled} onClick={onClick} className={danger ? 'text-danger hover:text-danger' : undefined}>{icon}</Button>
      </span>
    </TooltipTrigger>
    <TooltipContent className="motion-reduce:animate-none">{hint ?? label}</TooltipContent>
  </Tooltip>
);

interface RowActionsProps {
  /** The row's name, used in the labels: "Edit Computer Science". */
  name: string;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Why Delete is unavailable; shown as its tooltip. */
  deleteBlockedReason?: string;
  /** Extra buttons placed before Edit. */
  children?: ReactNode;
}

export const RowActions = ({ name, onEdit, onDelete, deleteBlockedReason, children }: RowActionsProps) => (
  <div className="flex items-center justify-end gap-1.5">
    {children}
    {onEdit && <IconAction label={`Edit ${name}`} icon={<Pencil />} onClick={onEdit} />}
    {onDelete && <IconAction label={`Delete ${name}`} icon={<Trash2 />} danger onClick={onDelete} disabled={!!deleteBlockedReason} hint={deleteBlockedReason} />}
  </div>
);
