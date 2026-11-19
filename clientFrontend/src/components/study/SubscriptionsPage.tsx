import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, CaretLeft, CaretRight, Receipt } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/database/supabase";
import { useAuth } from "@/context/AuthContext";
import PricingGate from "@/pages/PricingGate";
import { EASE, formatDate } from "@/components/pay/PayKit";

interface SubscriptionsPageProps {
  onNavigate: (page: string) => void;
}

interface Sub {
  id: number;
  start_date: string;
  end_date: string;
  payment_ref: string;
  year_of_study: number;
  semester_of_study: number;
  department_name?: string;
  school_name?: string;
  institution_name?: string;
}

const DAY = 86_400_000;
const RENEW_WINDOW_DAYS = 14;
const PAGE_SIZE = 5;
const pagerButton = `flex size-10 items-center justify-center rounded-full bg-field text-ink ring-1 ring-line transition-[background-color,transform] duration-300 hover:bg-field-strong active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40`;

// Dates arrive as plain days (YYYY-MM-DD). A pass is valid through the end of its last day, not the start of it.
const startOf = (s: Sub) => new Date(`${s.start_date}T00:00:00`).getTime();
const endOf = (s: Sub) => new Date(`${s.end_date}T23:59:59`).getTime();
const label = "text-xs font-medium uppercase tracking-[0.14em] text-ink-muted";
const spring = "ease-[cubic-bezier(0.32,0.72,0,1)]";

/** Pill button with its arrow nested in a circle that drifts on hover. */
const IslandButton = ({ children, onClick, tone = "ink" }: { children: React.ReactNode; onClick: () => void; tone?: "ink" | "soft" }) => (
  <button
    onClick={onClick}
    className={`group inline-flex h-11 shrink-0 items-center gap-3 rounded-full pl-5 pr-1.5 text-sm font-medium transition-[background-color,transform] duration-500 ${spring} active:scale-[0.98] ${
      tone === "ink" ? "bg-ink text-ink-fg hover:bg-ink-hover" : "bg-field text-ink ring-1 ring-line hover:bg-field-strong"
    }`}
  >
    {children}
    <span className={`flex size-8 items-center justify-center rounded-full transition-transform duration-500 ${spring} group-hover:-translate-y-px group-hover:translate-x-0.5 ${tone === "ink" ? "bg-ink-fg/15" : "bg-ink/10"}`}>
      <ArrowUpRight size={15} />
    </span>
  </button>
);

const Fact = ({ name, value }: { name: string; value: React.ReactNode }) => (
  <div>
    <dt className={label}>{name}</dt>
    <dd className="mt-1.5 text-lg font-medium tabular-nums text-ink">{value}</dd>
  </div>
);

/** The pass in use: the one thing on this page that matters most, so it gets the room and the depth. */
const ActivePass = ({ sub, index, onRenew }: { sub: Sub; index: number; onRenew: () => void }) => {
  const reduce = useReducedMotion();
  const now = Date.now();
  const left = Math.max(0, Math.ceil((endOf(sub) - now) / DAY));
  const elapsed = Math.min(1, Math.max(0, (now - startOf(sub)) / (endOf(sub) - startOf(sub))));
  const endingSoon = left <= RENEW_WINDOW_DAYS;

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 24, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.8, ease: EASE, delay: index * 0.1 }}
      aria-label={`Active pass for ${sub.department_name ?? "your department"}`}
      className="rounded-[2rem] bg-field/60 p-1.5 ring-1 ring-line"
    >
      <div className="rounded-[calc(2rem-0.375rem)] bg-surface p-6 shadow-[0_24px_48px_-28px_rgba(14,21,37,0.18)] md:p-10">
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-positive/10 px-3 py-1 text-xs font-medium text-positive">
            Active
          </span>
          <span className="text-sm text-ink-muted">Semester pass</span>
        </div>

        <h2 className="mt-6 text-balance text-2xl font-medium text-ink md:text-3xl">{sub.department_name ?? "Your department"}</h2>
        {(sub.institution_name || sub.school_name) && <p className="mt-2 text-base text-ink-muted">{[sub.institution_name, sub.school_name].filter(Boolean).join(" · ")}</p>}

        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
          <Fact name="Year" value={sub.year_of_study} />
          <Fact name="Semester" value={sub.semester_of_study} />
          <div className="col-span-2 sm:col-span-1"><Fact name="Valid until" value={formatDate(new Date(sub.end_date))} /></div>
        </dl>

        {/* Time used, so "how long is left" is visible at a glance, not worked out from a date */}
        <div className="mt-8">
          <div
            role="progressbar" aria-label="Time used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(elapsed * 100)}
            className="h-1.5 overflow-hidden rounded-full bg-field"
          >
            <div className={`h-full origin-left rounded-full ${endingSoon ? "bg-danger" : "bg-brand-solid"}`} style={{ transform: `scaleX(${elapsed})` }} />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="tabular-nums text-ink-muted">{formatDate(new Date(sub.start_date))}</span>
            <span className={`font-medium tabular-nums ${endingSoon ? "text-danger" : "text-ink"}`}>
              {left === 0 ? "Ends today" : `${left} ${left === 1 ? "day" : "days"} left`}
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-2">
          <p className="text-sm text-ink-muted">Ref <span className="font-geist-mono text-ink">{sub.payment_ref}</span></p>
          {endingSoon && <IslandButton tone="soft" onClick={onRenew}>Renew this pass</IslandButton>}
        </div>
      </div>
    </motion.article>
  );
};

const SubscriptionsPage = (_props: SubscriptionsPageProps) => {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const [isInitiating, setIsInitiating] = useState(false);
  const [page, setPage] = useState(0);

  const { data: subs = [], isLoading, refetch } = useQuery({
    queryKey: ["user-subscriptions", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Sub[]> => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, departments(school_id, name), institutions(name, short_name)")
        .eq("user_uuid", user!.id)
        .order("end_date", { ascending: false });
      if (error) {
        console.error(error);
        return [];
      }
      const { data: schools } = await supabase.from("schools").select("id, name");
      return data.map((sub: any) => ({
        ...sub,
        department_name: sub.departments?.name,
        school_name: schools?.find((s) => s.id === sub.departments?.school_id)?.name,
        institution_name: sub.institutions?.short_name ?? sub.institutions?.name,
      }));
    },
  });

  if (isInitiating) {
    return (
      <PricingGate
        onLogout={() => { }}
        onCancel={() => setIsInitiating(false)}
        onSubscribed={() => {
          setIsInitiating(false);
          refetch();
        }}
      />
    );
  }

  const now = Date.now();
  const active = subs.filter((s) => endOf(s) >= now);
  const past = subs.filter((s) => endOf(s) < now);
  const pages = Math.max(1, Math.ceil(past.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const shown = past.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const summary = subs.length === 0
    ? "Nothing here yet."
    : `${active.length} active · ${subs.length} ${subs.length === 1 ? "pass" : "passes"} in total`;

  return (
    <div className="font-geist text-ink">
      <div className="mx-auto max-w-3xl px-4 pb-28 pt-10 md:pt-14 md:px-6">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-medium md:text-3xl">Subscriptions</h1>
            <p className="mt-2 text-base text-ink-muted">{summary}</p>
          </div>
          <IslandButton onClick={() => setIsInitiating(true)}>New subscription</IslandButton>
        </header>

        {isLoading ? (
          <div className="mt-10 flex flex-col gap-4" role="status" aria-label="Loading your subscriptions">
            <div className="h-[22rem] animate-pulse rounded-[2rem] bg-field" />
            <div className="h-24 animate-pulse rounded-[1.5rem] bg-field" />
          </div>
        ) : subs.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-[2rem] bg-field/60 p-1.5 ring-1 ring-line">
            <div className="flex w-full flex-col items-center rounded-[calc(2rem-0.375rem)] bg-surface px-6 py-16 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-field text-ink-muted"><Receipt size={26} /></span>
              <h2 className="mt-6 text-xl font-medium">No passes yet</h2>
              <p className="mt-2 max-w-sm text-base text-ink-muted">A semester pass opens every note, CAT and past paper for your unit. Pay once; nothing renews on its own.</p>
              <div className="mt-8"><IslandButton onClick={() => setIsInitiating(true)}>See the semester pass</IslandButton></div>
            </div>
          </div>
        ) : (
          <>
            <section className="mt-10 flex flex-col gap-4" aria-label="Active passes">
              {active.length > 0 ? (
                active.map((s, i) => <ActivePass key={s.id} sub={s} index={i} onRenew={() => setIsInitiating(true)} />)
              ) : (
                <div className="rounded-[2rem] bg-field/60 p-1.5 ring-1 ring-line">
                  <div className="flex flex-col items-start gap-6 rounded-[calc(2rem-0.375rem)] bg-surface p-6 md:flex-row md:items-center md:justify-between md:p-10">
                    <div>
                      <h2 className="text-xl font-medium">No active pass</h2>
                      <p className="mt-2 text-base text-ink-muted">Your last pass ended on {formatDate(new Date(past[0].end_date))}. Get a new one to open your unit again.</p>
                    </div>
                    <IslandButton onClick={() => setIsInitiating(true)}>Get a pass</IslandButton>
                  </div>
                </div>
              )}
            </section>

            {past.length > 0 && (
              <motion.section
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
                className="mt-14"
                aria-label="Past passes"
              >
                <h2 className={label}>History</h2>
                {/* Plain rows: a line above and below each, nothing else. The -mt-px lets neighbours share one line. */}
                <ul className="mt-4">
                  {shown.map((s) => (
                    <li key={s.id} className="-mt-px grid gap-3 border-y border-line py-5 first:mt-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-8">
                      <div className="min-w-0">
                        <p className="truncate text-base font-medium">{s.department_name ?? "Unknown department"}</p>
                        <p className="mt-1 text-sm text-ink-muted">Year {s.year_of_study} · Semester {s.semester_of_study}{s.institution_name ? ` · ${s.institution_name}` : ""}{s.school_name ? ` · ${s.school_name}` : ""}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 md:flex-col md:items-end md:gap-1">
                        <p className="text-sm tabular-nums text-ink-muted">{formatDate(new Date(s.start_date))} – {formatDate(new Date(s.end_date))}</p>
                        <p className="flex items-center gap-2 text-xs text-ink-muted">
                          <span className="rounded-full bg-field px-2.5 py-1 font-medium">Expired</span>
                          <span className="font-geist-mono">{s.payment_ref}</span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                {pages > 1 && (
                  <nav aria-label="History pages" className="mt-6 flex items-center justify-between gap-4">
                    <p className="text-sm tabular-nums text-ink-muted">
                      {current * PAGE_SIZE + 1}–{current * PAGE_SIZE + shown.length} of {past.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <button aria-label="Previous page" disabled={current === 0} onClick={() => setPage(current - 1)} className={pagerButton}><CaretLeft size={16} /></button>
                      <span className="min-w-[4.5rem] text-center text-sm tabular-nums text-ink">{current + 1} / {pages}</span>
                      <button aria-label="Next page" disabled={current === pages - 1} onClick={() => setPage(current + 1)} className={pagerButton}><CaretRight size={16} /></button>
                    </div>
                  </nav>
                )}
              </motion.section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SubscriptionsPage;
