import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/database/supabase";
import { getProgress } from "@/database/progress";
import { useAuth } from "@/context/AuthContext";
import { EASE, formatDate } from "@/components/pay/PayKit";

interface ProfilePageProps {
  onNavigate: (page: string) => void;
}

interface Pass {
  end_date: string;
  year_of_study: number;
  semester_of_study: number;
  department_name?: string;
  school_name?: string;
  institution_name?: string;
}

const RINGS_FAINT = [40, 80, 120, 160, 200, 240, 280, 320];
const RINGS_BOLD = [28, 70, 112, 154, 196];

/** Concentric rings: faint grey on the left, bold ink with RAP-blue segments on the right. Decorative only. */
const BannerArt = () => (
  <svg aria-hidden viewBox="0 0 1000 180" preserveAspectRatio="xMaxYMid slice" className="absolute inset-0 h-full w-full">
    <g fill="none" stroke="hsl(var(--line))" strokeWidth="14" opacity="0.7">
      {RINGS_FAINT.map((r) => <circle key={r} cx="720" cy="90" r={r} />)}
    </g>
    <g fill="none" strokeWidth="20">
      {RINGS_BOLD.map((r) => <circle key={r} cx="880" cy="90" r={r} stroke="hsl(var(--ink))" />)}
      {RINGS_BOLD.map((r, i) => (
        <circle key={`b${r}`} cx="880" cy="90" r={r} stroke="hsl(var(--brand-light))" strokeDasharray={`${34 + i * 6} ${2 * Math.PI * r}`} strokeDashoffset={-i * 70} />
      ))}
    </g>
  </svg>
);

const Stat = ({ name, value }: { name: string; value: React.ReactNode }) => (
  <div>
    <dt className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">{name}</dt>
    <dd className="mt-1.5 text-xl font-semibold tabular-nums">{value}</dd>
  </div>
);

const ProfilePage = ({ onNavigate }: ProfilePageProps) => {
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const fullName = (user?.user_metadata?.full_name as string | undefined) || user?.email?.split("@")[0] || "Student";
  // Google sign-in stores the photo as avatar_url (or picture); email sign-ups have none, so they keep the initials.
  const photo = ((user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture) as string | undefined)?.replace(/=s\d+-c$/, "=s288-c"); // Google serves 96px by default; the avatar is 144px
  const [photoFailed, setPhotoFailed] = useState(false);
  const initials = fullName.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  const { data: pass } = useQuery({
    queryKey: ["profile-pass", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Pass | null> => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, departments(school_id, name), institutions(name, short_name)")
        .eq("user_uuid", user!.id)
        .order("end_date", { ascending: false })
        .limit(1);
      if (error || !data?.length) return null;
      const sub = data[0];
      const { data: school } = await supabase.from("schools").select("name").eq("id", sub.departments?.school_id).maybeSingle();
      return { ...sub, department_name: sub.departments?.name, school_name: school?.name, institution_name: sub.institutions?.short_name ?? sub.institutions?.name };
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["profile-progress", user?.id],
    enabled: !!user,
    queryFn: () => getProgress(user!.id),
  });

  const scores = Object.values(progress?.scores ?? {});
  const quizzes = scores.reduce((n, s) => n + s.attempts, 0);
  const average = scores.length ? Math.round((scores.reduce((n, s) => n + s.best / s.total, 0) / scores.length) * 100) : null;
  const active = pass ? new Date(`${pass.end_date}T23:59:59`).getTime() >= Date.now() : false;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-8 pt-10 md:pt-14 font-geist text-ink md:px-6 md:pb-12">
      <motion.article
        initial={{ opacity: 0, y: reduce ? 0 : 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="overflow-hidden rounded-3xl bg-surface ring-1 ring-line"
      >
        <div className="relative h-44 bg-field">
          <BannerArt />
          <p className="absolute left-[11.5rem] top-10 hidden max-w-[14rem] text-xl font-semibold leading-tight tracking-tight text-band sm:block dark:text-ink">
            Your revision, in one place.
          </p>
        </div>

        <div className="px-6 pb-8 md:px-10">
          <div className="relative -mt-16 flex size-32 items-center justify-center overflow-hidden bg-band text-4xl font-semibold tracking-tight text-brand-light ring-4 ring-surface md:size-36">
            {photo && !photoFailed ? (
              <img src={photo} alt={fullName} referrerPolicy="no-referrer" onError={() => setPhotoFailed(true)} className="size-full object-cover" />
            ) : (
              <span aria-hidden>{initials}</span>
            )}
          </div>

          <h1 className="mt-5 text-2xl font-semibold">{fullName}</h1>
          <p className="mt-1 text-lg">{pass?.department_name ?? "No semester pass yet"}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {[pass?.institution_name, pass?.school_name, pass && `Year ${pass.year_of_study}, Semester ${pass.semester_of_study}`].filter(Boolean).join(" · ") || user?.email}
          </p>
          {pass && (
            <p className="mt-1 text-sm text-ink-muted">
              {active ? "Access until" : "Expired"} {formatDate(new Date(`${pass.end_date}T00:00:00`))}
            </p>
          )}

          <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-line pt-6">
            <Stat name="Opened" value={Object.keys(progress?.opens ?? {}).length} />
            <Stat name="Quizzes" value={quizzes} />
            <Stat name="Avg best" value={average === null ? "–" : `${average}%`} />
          </dl>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-muted">
            <span>{user?.email}</span>
            {user?.created_at && <span>Member since {formatDate(new Date(user.created_at))}</span>}
          </div>

          <button
            onClick={() => onNavigate("subscriptions")}
            className="group mt-6 inline-flex items-center gap-2 text-lg font-medium text-ink-muted transition-colors duration-300 hover:text-ink"
          >
            View billing
            <ArrowRight size={18} className="transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1" />
          </button>
        </div>
      </motion.article>
    </div>
  );
};

export default ProfilePage;
