import { useMemo } from 'react';
import { Banknote, Percent, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/shared/StatCard';
import { useEarnings, ksh, type EarningRow } from '@/hooks/useEarnings';
import type { AdminRole } from '@/contexts/AuthContext';

// Every pass is split 30% to the platform, 70% to the course admin (see Documentation/database/revenue_split.sql).
export const APP_PERCENT = 30;
export const ADMIN_PERCENT = 70;

type Money = 'amount' | 'app_share' | 'admin_share';
const sum = (rows: EarningRow[], k: Money) => rows.reduce((n, r) => n + r[k], 0);
const month = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

/** Earnings from semester passes: the totals, a month-by-month list, and a row per course. */
export const EarningsPanel = ({ role }: { role: AdminRole }) => {
  const { data: rows = [], isLoading, isError, refetch } = useEarnings();
  const stat = (v: string | number) => isLoading ? <Skeleton className="h-8 w-24 motion-reduce:animate-none" /> : v;

  // What "mine" means depends on who is looking: course admins keep 70%, the platform keeps 30%.
  const mineKey: Money = role === 'super_admin' ? 'app_share' : 'admin_share';
  const mineLabel = role === 'super_admin' ? `Platform share (${APP_PERCENT}%)` : role === 'course_admin' ? `Your earnings (${ADMIN_PERCENT}%)` : `Paid to course admins (${ADMIN_PERCENT}%)`;

  const { byCourse, byMonth } = useMemo(() => {
    const c = new Map<number, { name: string; institution: string; passes: number; gross: number; mine: number }>();
    const m = new Map<string, { passes: number; mine: number }>();
    for (const r of rows) {
      const course = c.get(r.department_id) ?? { name: r.department_name, institution: r.institution_name, passes: 0, gross: 0, mine: 0 };
      course.passes += 1; course.gross += r.amount; course.mine += r[mineKey];
      c.set(r.department_id, course);
      const key = month(r.created_at);
      const mo = m.get(key) ?? { passes: 0, mine: 0 };
      mo.passes += 1; mo.mine += r[mineKey];
      m.set(key, mo);
    }
    return { byCourse: [...c.values()].sort((a, b) => b.mine - a.mine), byMonth: [...m.entries()].slice(0, 6) };
  }, [rows, mineKey]);

  if (isError) return (
    <div className="flex items-center justify-between gap-4 rounded-3xl bg-surface p-6 ring-1 ring-line">
      <p className="text-sm text-ink">Earnings could not be loaded. Check your connection and try again.</p>
      <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
    </div>
  );

  return (
    <section aria-label="Earnings" className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title={mineLabel} value={stat(ksh(sum(rows, mineKey)))} icon={<Banknote className="h-5 w-5" />} />
        <StatCard title="Total paid in" value={stat(ksh(sum(rows, 'amount')))} icon={<Receipt className="h-5 w-5" />} />
        <StatCard title="Semester passes sold" value={stat(rows.length)} icon={<Percent className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl bg-surface p-6 ring-1 ring-line lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">By course</h2>
          {byCourse.length === 0 ? (
            <div className="text-sm text-ink-muted">{isLoading ? <Skeleton className="h-10 w-full motion-reduce:animate-none" /> : role === 'course_admin' ? 'No paid passes for your courses yet.' : 'No paid passes yet.'}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-ink-muted">
                <tr><th className="pb-2 font-medium">Course</th><th className="pb-2 text-right font-medium">Passes</th><th className="pb-2 text-right font-medium">Paid in</th><th className="pb-2 text-right font-medium">Share</th></tr>
              </thead>
              <tbody>
                {byCourse.map((c) => (
                  <tr key={`${c.institution}-${c.name}`} className="border-t border-line">
                    <td className="py-3 pr-3"><span className="font-medium">{c.name}</span> <span className="text-ink-muted">{c.institution}</span></td>
                    <td className="py-3 text-right tabular-nums">{c.passes}</td>
                    <td className="py-3 text-right tabular-nums">{ksh(c.gross)}</td>
                    <td className="py-3 text-right font-medium tabular-nums">{ksh(c.mine)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-3xl bg-surface p-6 ring-1 ring-line">
          <h2 className="mb-4 text-lg font-semibold">By month</h2>
          {byMonth.length === 0 ? (
            <p className="text-sm text-ink-muted">Nothing yet.</p>
          ) : (
            <ul className="space-y-3">
              {byMonth.map(([name, v]) => (
                <li key={name} className="flex items-center justify-between border-t border-line pt-3 first:border-0 first:pt-0">
                  <span className="text-sm">{name} <span className="text-ink-muted">· {v.passes} {v.passes === 1 ? 'pass' : 'passes'}</span></span>
                  <span className="text-sm font-medium tabular-nums">{ksh(v.mine)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};
