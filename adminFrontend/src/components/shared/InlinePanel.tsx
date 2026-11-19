import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Ctx = createContext<(open: boolean) => void>(() => {});

/** The side column in DashboardLayout. Panels render into it, so they open to the right of the table. */
export const PanelSlotContext = createContext<HTMLElement | null>(null);

/**
 * Drop-in for the Dialog parts we used: a side panel to the right of the page content (no overlay, no focus trap),
 * so the table stays visible and usable. Below the lg breakpoint there is no room beside it, so it stacks under the content.
 */
export const Dialog = ({ open, onOpenChange, children }: { open: boolean; onOpenChange: (o: boolean) => void; children: ReactNode }) =>
  open ? <Ctx.Provider value={onOpenChange}>{children}</Ctx.Provider> : null;

export const DialogContent = ({ children, className }: { children: ReactNode; className?: string }) => {
  const ref = useRef<HTMLElement>(null);
  const close = useContext(Ctx);
  const slot = useContext(PanelSlotContext);
  useEffect(() => {
    // On phones the panel is a fixed sheet, so the page behind should not scroll away from it.
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);
  const panel = (
    <section
      ref={ref}
      // Phones have no room beside the table, so the form becomes a full-height sheet over the page instead of landing at the bottom of a long list.
      className={cn('relative rounded-3xl bg-surface p-6 ring-1 ring-line animate-fade-in max-lg:fixed max-lg:inset-x-2 max-lg:bottom-2 max-lg:top-20 max-lg:z-40 max-lg:overflow-y-auto max-lg:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.5)]', className?.includes('h-[') && 'min-h-[24rem]')}
    >
      <button type="button" aria-label="Close" onClick={() => close(false)} className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-field hover:text-ink lg:size-8 lg:right-4 lg:top-4">
        <X className="size-4" />
      </button>
      {children}
    </section>
  );
  return slot ? createPortal(panel, slot) : panel;
};

export const DialogHeader = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cn('mb-4 pr-10', className)}>{children}</div>;
export const DialogTitle = ({ children }: { children: ReactNode }) => <h2 className="text-xl font-semibold">{children}</h2>;
export const DialogDescription = ({ children }: { children: ReactNode }) => <p className="mt-1 text-sm text-ink-muted">{children}</p>;
