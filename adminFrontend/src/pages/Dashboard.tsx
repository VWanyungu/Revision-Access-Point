import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, BookOpen, FileText, Landmark, Layers } from 'lucide-react';
import { EarningsPanel } from '@/components/shared/EarningsPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { canOpen } from '@/components/layout/AdminNav';
import { useProfile } from '@/hooks/useProfile';
import { getRecords } from '@/data/db';

const total = async (schema: string, options: Parameters<typeof getRecords>[1] = {}) =>
  (await getRecords(schema, { ...options, pageSize: 1, strict: true })).meta.total;

const COUNTS = [
  { schema: 'institutions', label: 'Institutions', path: '/institutions', Icon: Landmark },
  { schema: 'schools', label: 'Schools', path: '/schools', Icon: Building2 },
  { schema: 'departments', label: 'Departments', path: '/departments', Icon: BookOpen },
  { schema: 'units', label: 'Units', path: '/units', Icon: Layers },
  { schema: 'resources', label: 'Resources', path: '/resources', Icon: FileText },
] as const;

const HEALTH = [
  { missing: 'cover_url', label: 'without a cover photo' },
  { missing: 'topic_id', label: 'not linked to a topic' },
  { missing: 'public_access_url', label: 'without a file or link' },
] as const;

const Retry = ({ what, onRetry }: { what: string; onRetry: () => void }) => (
  <div className="flex items-center justify-between gap-3">
    <p className="text-sm text-ink-muted">{what} could not be loaded.</p>
    <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
  </div>
);

const Dashboard = () => {
  const { data: me } = useProfile();
  const role = me?.role;
  useEffect(() => { document.title = 'Dashboard · RAP Admin'; }, []);

  const counts = useQuery({
    queryKey: ['dashboard', 'counts', role],
    enabled: !!role,
    queryFn: async () => Object.fromEntries(await Promise.all(COUNTS.filter((c) => canOpen(role!, c.path)).map(async (c) => [c.schema, await total(c.schema)]))) as Record<string, number>,
  });
  const recent = useQuery({
    queryKey: ['dashboard', 'recent'],
    enabled: !!role,
    queryFn: async () => (await getRecords('resources', { pageSize: 5, strict: true })).data,
  });
  const health = useQuery({
    queryKey: ['dashboard', 'health'],
    enabled: !!role,
    queryFn: async () => Promise.all(HEALTH.map((h) => total('resources', { missing: h.missing }))),
  });

  if (!me) return null;

  const scope =
    me.role === 'super_admin' ? 'Platform-wide'
    : me.role === 'institution_admin' ? 'Your institution'
    : me.role === 'course_admin' ? `${me.courseIds.length} ${me.courseIds.length === 1 ? 'course' : 'courses'}`
    : 'Your school';
  const cards = COUNTS.filter((c) => canOpen(me.role, c.path));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-semibold">Welcome back, {me.name.split(' ')[0]}</h1>
        <p className="text-sm text-ink-muted"><span className="capitalize">{me.role.replace('_', ' ')}</span> · {scope}</p>
      </div>

      <section aria-label="Content totals" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {cards.map(({ schema, label, path, Icon }) => (
          <Link key={schema} to={path} className="stat-card card-hover block !p-5 transition-[transform,box-shadow] duration-base ease-house active:scale-[0.98] motion-reduce:transition-none">
            <div className="flex items-center justify-between text-ink-muted">
              <span className="text-sm font-medium">{label}</span>
              <Icon aria-hidden className="size-4" />
            </div>
            {counts.isLoading ? <Skeleton className="mt-3 h-8 w-16 motion-reduce:animate-none" /> : <p className="mt-2 text-2xl font-semibold tabular-nums">{counts.data?.[schema] ?? '–'}</p>}
          </Link>
        ))}
      </section>
      {counts.isError && <Retry what="Totals" onRetry={() => counts.refetch()} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section aria-label="Recent uploads" className="rounded-3xl bg-surface p-6 ring-1 ring-line lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">Recent uploads</h2>
          {recent.isError ? <Retry what="Recent uploads" onRetry={() => recent.refetch()} />
            : recent.isLoading ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full motion-reduce:animate-none" />)}</div>
            : !recent.data?.length ? <p className="text-sm text-ink-muted">No resources uploaded yet.</p>
            : (
              <ul>
                {recent.data.map((r: any) => (
                  <li key={r.id} className="flex items-center justify-between gap-4 border-t border-line py-3 first:border-0 first:pt-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{r.name}</p>
                      <p className="truncate text-xs text-ink-muted">{r.units?.name}</p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-ink-muted">{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </li>
                ))}
              </ul>
            )}
        </section>

        <section aria-label="Content health" className="rounded-3xl bg-surface p-6 ring-1 ring-line">
          <h2 className="mb-4 text-lg font-semibold">Content health</h2>
          {health.isError ? <Retry what="Content health" onRetry={() => health.refetch()} />
            : health.isLoading ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-6 w-full motion-reduce:animate-none" />)}</div>
            : (
              <ul className="space-y-3">
                {HEALTH.map((h, i) => (
                  <li key={h.missing} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-ink-muted">Resources {h.label}</span>
                    <span className={`context-badge tabular-nums ${health.data![i] ? '' : 'opacity-60'}`}>{health.data![i]}</span>
                  </li>
                ))}
              </ul>
            )}
        </section>
      </div>

      <EarningsPanel role={me.role} />
    </div>
  );
};

export default Dashboard;
