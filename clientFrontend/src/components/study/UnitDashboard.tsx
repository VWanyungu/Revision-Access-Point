import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, BookOpenText, CaretDown, Check, FileText, ListChecks, Lock, MagnifyingGlass, PlayCircle, SquaresFour, Timer, TrendUp, X,
} from "@phosphor-icons/react";
import { getResources } from "@/database/utils";
import { supabase } from "@/database/supabase";
import { useAuth } from "@/context/AuthContext";
import { EASE, formatDate } from "@/components/pay/PayKit";
import { useTimer } from "@/context/TimerContext";
import PredictionsPanel from "./PredictionsPanel";
import type { AnswersData } from "@/pages/AnswersPage";
import unitHero from "@/assets/study/unit-hero.png";
import { getProgress, getTopics, recordOpen, type Progress } from "@/database/progress";
import { toast } from "sonner";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import ResourceSearch from "./ResourceSearch";
import LoadFailed from "@/components/layout/LoadFailed";

/** Paper-like plate with grey text lines, as in the Figma covers (real first-page renders need a thumbnail cache on upload). */
const Cover = ({ kind, left, right }: { kind: string; left: string; right: string }) => (
  <div className="relative h-[240px] overflow-hidden bg-field md:h-[320px]">
    <div className="absolute left-1/2 top-8 w-[76%] max-w-[440px] -translate-x-1/2 rounded-xl border border-line bg-surface p-7 shadow-sm md:top-10">
      <p className="font-geist-mono text-xs text-ink-muted">{kind}</p>
      <div className="mt-5 space-y-[12px]">
        {[316, 346, 233, 316, 346, 233, 316].map((w, i) => <div key={i} className="h-1.5 rounded-full bg-line" style={{ width: `${(w / 380) * 100}%` }} />)}
      </div>
    </div>
    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-surface/80 px-6 py-4 backdrop-blur-[16px]">
      <div><p className="text-sm font-medium">{left}</p><p className="mt-0.5 text-sm text-ink-muted">{right}</p></div>
    </div>
  </div>
);

interface Props {
  unitId: number;
  onNavigate: (page: string) => void;
  onGenerateQuiz: (resourceUrl: string, resourceTitle: string) => void;
  onGenerateAnswers: (resourceUrl: string, resourceTitle: string) => void;
  onViewResource: (url: string, title?: string, resourceTypeId?: number) => void;
  /** Opens a practice paper's model answers in the past-paper answers screen. */
  onViewPracticeAnswers?: (data: AnswersData, title: string) => void;
  /** Opens the AI add-on page when the pass does not include AI. */
  onUpgradeAi?: () => void;
  /** Called with the new selection from the inline unit panel. When missing, "Change unit" is hidden. */
  onChangeUnit?: (selection: { school: string; department: string; year: number; semester: number; unit: string }) => void;
}

interface Resource {
  id: number; name: string; description?: string; public_access_url: string;
  resource_type_id: number; created_at: string; updated_at?: string;
  /** The topic a note belongs to (topics table); null for notes outside any topic. */
  topic_id?: number | null;
  /** Optional cover photo (e.g. a book cover) uploaded by the admin. */
  cover_url?: string | null;
  /** Past papers say which paper they are: cat1, cat2, exam or supplementary, and the academic year ("2024/25"). */
  paper_kind?: "cat1" | "cat2" | "exam" | "supplementary" | null;
  academic_year?: string | null;
}

/** A group of notes. Complete once every note in it has been read. */
interface Topic { id: string; title: string; description?: string; notes: Resource[] }

const NOTES = 1, EXAMS = 2, CATS = 3, TUTORIALS = 4;
type View = "all" | "syllabus" | "papers" | "library" | "predictions";
const num = (i: number) => String(i + 1).padStart(2, "0");
// 44px tall on phones so it is easy to tap; inline-sized on desktop.
const link = "inline-flex items-center gap-1.5 text-sm font-medium transition-opacity duration-300 hover:opacity-60 max-md:min-h-11";

/** A paper's academic year and slot (cat1, cat2, exam, supp). Unreadable years land in the "Other" row. */
// Papers carry an explicit kind and academic year. Older rows without them fall back to reading the file name.
const classify = (r: Resource) => {
  const y = r.name.match(/(20\d{2})\s*[\/\-–]\s*(\d{2,4})/);
  const year = r.academic_year ?? (y ? `${y[1]}/${y[2].slice(-2)}` : "Other");
  const lower = r.name.toLowerCase();
  const slot =
    r.paper_kind === "supplementary" ? "supp"
    : r.paper_kind === "exam" ? "exam"
    : r.paper_kind === "cat2" ? "cat2"
    : r.paper_kind === "cat1" ? "cat1"
    : r.resource_type_id === EXAMS ? (/supp/.test(lower) ? "supp" : "exam")
    : /cat\s*2|cat\s*two|second/.test(lower) ? "cat2"
    : "cat1";
  return { year, slot };
};

const youtubeId = (html: string) => html.match(/embed\/([\w-]{11})/)?.[1] ?? html.match(/(?:v=|youtu\.be\/)([\w-]{11})/)?.[1];
const youtubeUrl = (html: string) => { const id = youtubeId(html); return id ? `https://www.youtube.com/watch?v=${id}` : null; };

/** Phones show two lines with a Read more toggle; from md up the text is shown in full. Short text gets no toggle. */
const ClampedText = ({ children, className = "" }: { children: string; className?: string }) => {
  const [open, setOpen] = useState(false);
  const long = children.length > 110;
  return (
    <div className={className}>
      <p className={!open && long ? "line-clamp-2 md:line-clamp-none" : ""}>{children}</p>
      {long && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-brand md:hidden">
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
};

const StatusDot = ({ state }: { state: "done" | "current" | "todo" }) =>
  state === "done" ? (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-positive-solid text-white"><Check size={12} weight="bold" /></span>
  ) : state === "current" ? (
    <span className="relative size-5 shrink-0 rounded-full border-[1.5px] border-brand"><span className="absolute inset-y-0 left-0 w-1/2 rounded-l-full bg-brand-solid" /></span>
  ) : (
    <span className="size-5 shrink-0 rounded-full border-[1.5px] border-line-strong" />
  );

/** `bare`: inside a tab, the tab already says what this is, so the heading is hidden and the content sits close to the search bar. */
const Section = ({ id, title, bare, children }: { id: string; title: string; bare?: boolean; children: React.ReactNode }) => {
  const reduce = useReducedMotion();
  return (
    <motion.section
      id={id}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.8, ease: EASE }}
      className={bare ? "scroll-mt-32 pb-16 pt-6 md:pb-24 md:pt-8" : "scroll-mt-32 py-16 md:py-24"}
    >
      <div className="mx-auto max-w-[1200px] px-5 md:px-10">
        <h2 className={bare ? "sr-only" : "mb-8 font-literata text-2xl md:mb-10"}>{title}</h2>
        {children}
      </div>
    </motion.section>
  );
};

const UnitDashboard = ({ unitId, onNavigate, onGenerateQuiz, onGenerateAnswers, onViewResource, onViewPracticeAnswers, onUpgradeAi, onChangeUnit }: Props) => {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const selection = useMemo(() => { try { return JSON.parse(localStorage.getItem("resourceSelection") || "null"); } catch { return null; } }, []);

  const { data: resources = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["unit-resources", unitId],
    queryFn: async () => ((await getResources(unitId)) ?? []) as any[],
    enabled: !!unitId,
  });

  // Optional banner from the admin app. Errors (e.g. the column not added yet) just mean the default artwork.
  const { data: banner } = useQuery({
    queryKey: ["unit-banner", unitId],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("banner_url").eq("id", unitId).maybeSingle();
      return error ? null : (data?.banner_url as string | null) ?? null;
    },
    enabled: !!unitId,
  });

  const { data: pass } = useQuery({
    queryKey: ["pass", user?.id, selection?.department, selection?.year, selection?.semester],
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions").select("end_date, ai_access")
        .eq("user_uuid", user!.id).eq("department_id", Number(selection.department))
        .eq("year_of_study", Number(selection.year)).eq("semester_of_study", Number(selection.semester))
        .order("end_date", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user && !!selection?.department,
  });

  const notes: Resource[] = useMemo(() => resources.filter((r) => r.resource_type_id === NOTES).sort((a, b) => a.id - b.id), [resources]);
  const tutorials: Resource[] = useMemo(() => resources.filter((r) => r.resource_type_id === TUTORIALS), [resources]);
  const papers: Resource[] = useMemo(() => resources.filter((r) => r.resource_type_id === EXAMS || r.resource_type_id === CATS), [resources]);
  // The unit's own details, so the title is right even before it has any resources or when the saved selection is old.
  const { data: unitMeta } = useQuery({
    queryKey: ["unit-meta", unitId],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("name, code, year_of_study, semester_of_study, departments(name)").eq("id", unitId).maybeSingle();
      return error ? null : (data as unknown as { name: string; code: string; year_of_study: number; semester_of_study: number; departments: { name: string } | null } | null);
    },
    enabled: !!unitId,
  });
  const unit = resources[0]?.units ?? unitMeta;
  const departmentName = resources[0]?.departments?.name || unitMeta?.departments?.name || selection?.departmentName;
  const yearLabel = selection?.year ?? unitMeta?.year_of_study;
  const semesterLabel = selection?.semester ?? unitMeta?.semester_of_study;

  // Read marks and the last opened note live in Supabase (resource_opens); topics group a unit's notes (topics, resources.topic_id).
  const queryClient = useQueryClient();
  const { data: progress, isError: progressFailed } = useQuery({ queryKey: ["progress", user?.id], queryFn: () => getProgress(user!.id), enabled: !!user, retry: false });
  useEffect(() => { if (progressFailed) toast.error("Couldn't load your reading progress.", { id: "progress-load" }); }, [progressFailed]);
  const { data: topicRows = [], isFetched: topicsFetched } = useQuery({ queryKey: ["topics", unitId], queryFn: () => getTopics(unitId), enabled: !!unitId, retry: false });
  const read = useMemo(() => Object.keys(progress?.opens ?? {}).map(Number), [progress]);
  const [picked, setPicked] = useState<number | null>(null);
  const [tab, setTab] = useState<"notes" | "tutorials" | "quiz">("notes");
  const [sheet, setSheet] = useState(false);
  const [syllabusInView, setSyllabusInView] = useState(false);
  const [query, setQuery] = useState("");
  const timer = useTimer();
  // The tab lives in the URL (?view=papers), so refresh, the back button and the phone tab bar all keep it.
  const [searchParams, setSearchParams] = useSearchParams();
  const view: View = (["all", "syllabus", "papers", "library", "predictions"] as const).find((v) => v === searchParams.get("view")) ?? "syllabus";
  const setView = (v: View) => setSearchParams({ view: v }, { replace: true });
  // A pass without AI: Quiz me, Model answers and Predictions carry a small lock so the upgrade page is no surprise.
  const noAi = !!pass && !pass.ai_access;
  const lock = noAi ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-field px-2 py-0.5 text-xs font-medium text-ink-muted" title="Needs the AI add-on">
      <Lock size={11} weight="fill" aria-hidden /> AI
    </span>
  ) : null;
  const [libType, setLibType] = useState<"all" | "notes" | "papers" | "videos">("all");
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  useOutsideClick(pickerRef, () => setPickerOpen(false));

  // A unit with no topics has no syllabus: nothing is grouped, and every resource is listed in the Library instead.
  const noSyllabus = topicsFetched && topicRows.length === 0;
  useEffect(() => { if (noSyllabus && view === "syllabus") setView("library"); }, [noSyllabus, view]);

  // Topics come from the topics table. Notes outside any topic show one topic per note.
  const topics: Topic[] = useMemo(() => {
    if (topicRows.length === 0) return [];
    const known = new Set(topicRows.map((t) => t.id));
    const grouped: Topic[] = topicRows
      .map((t) => ({ id: `t${t.id}`, title: t.title, description: t.description ?? undefined, notes: notes.filter((n) => n.topic_id === t.id) }))
      .filter((t) => t.notes.length > 0);
    const loose: Topic[] = notes
      .filter((n) => !n.topic_id || !known.has(n.topic_id))
      .map((n) => ({ id: `n${n.id}`, title: n.name, description: n.description, notes: [n] }));
    return [...grouped, ...loose];
  }, [topicRows, notes]);
  // The topics button floats only while the syllabus is on screen.
  useEffect(() => {
    const el = document.getElementById("syllabus");
    if (!el || el.hidden) { setSyllabusInView(false); return; }
    const io = new IntersectionObserver(([e]) => setSyllabusInView(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [view, noSyllabus, isLoading, topics.length]);

  const isRead = (n: Resource) => read.includes(n.id);
  const isDone = (t: Topic) => t.notes.every(isRead);

  const firstUnread = topics.findIndex((t) => !isDone(t));
  const current = picked ?? (firstUnread === -1 ? 0 : firstUnread);
  const topic = topics[current];
  const doneCount = topics.filter(isDone).length;

  // Opening a note marks it read. The mark shows at once, then is saved; a failed save is reported, not hidden.
  const open = (r: Resource) => {
    if (user) {
      queryClient.setQueryData<Progress>(["progress", user.id], (p) => ({
        scores: p?.scores ?? {},
        opens: { ...(p?.opens ?? {}), [r.id]: new Date().toISOString() },
      }));
      recordOpen(user.id, r.id).catch((e) => {
        console.error("Could not save progress", e);
        toast.error("Couldn't save your progress, so it won't be remembered next time.", { id: "progress-save" });
      });
    }
    onViewResource(r.public_access_url, r.name, r.resource_type_id);
  };

  // Most recently opened note or paper (tutorials are videos, so they do not count).
  const lastId = Object.entries(progress?.opens ?? {})
    .filter(([id]) => resources.some((r) => r.id === Number(id) && r.resource_type_id !== TUTORIALS))
    .sort((a, b) => b[1].localeCompare(a[1]))[0]?.[0];
  const last = lastId ? { id: Number(lastId), at: progress!.opens[Number(lastId)] } : null;
  // Where "Continue reading" goes: the note you last opened, else the first unread note, else the first note.
  const resume = resources.find((r) => r.id === last?.id) ?? topics[firstUnread === -1 ? 0 : firstUnread]?.notes.find((n) => !isRead(n)) ?? notes[0];
  const featuredPaper = papers.length ? [...papers].sort((a, b) => {
    const ca = classify(a), cb = classify(b);
    return cb.year.localeCompare(ca.year) || (cb.slot === "exam" ? 1 : 0) - (ca.slot === "exam" ? 1 : 0);
  })[0] : undefined;

  const show = (...v: View[]) => v.includes(view);

  const results = query.trim()
    ? resources.filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  const byYear = useMemo(() => {
    const map = new Map<string, Record<string, Resource | undefined>>();
    papers.forEach((p) => {
      const { year, slot } = classify(p);
      map.set(year, { ...(map.get(year) ?? {}), [slot]: p });
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [papers]);

  const rise = (i: number) => reduce ? {} : ({
    initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, ease: EASE, delay: Math.min(i, 8) * 0.04 },
  });

  const topicList = (onPick: (i: number) => void) => (
    <ul className="flex flex-col">
      {topics.map((t, i) => {
        // Check once every note is read, half-filled once some are. The highlighted row is the one on screen.
        const state = isDone(t) ? "done" : t.notes.some(isRead) ? "current" : "todo";
        return (
          <li key={t.id}>
            <button
              onClick={() => onPick(i)}
              aria-current={i === current ? "true" : undefined}
              className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left text-base transition-colors duration-300 ${
                i === current ? "bg-field-strong font-medium" : state === "todo" ? "text-ink-muted hover:bg-field" : "hover:bg-field"
              }`}
            >
              <StatusDot state={state} />
              <span className="min-w-0 flex-1">{t.title}</span>
              <span className="font-geist-mono text-sm text-ink-muted">{num(i)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  const noteRow = (r: Resource, i: number) => (
    <motion.article key={r.id} {...rise(i)} className="flex gap-5 border-b border-line py-6 first:pt-0 last:border-b-0 md:gap-6">
      {r.cover_url ? (
        <img src={r.cover_url} alt="" loading="lazy" className="h-[84px] w-[60px] shrink-0 rounded-xl border border-line object-cover md:h-[92px] md:w-[72px]" />
      ) : (
        <div className="flex h-[84px] w-[60px] shrink-0 flex-col justify-between rounded-xl border border-line bg-field p-2 md:h-[92px] md:w-[72px]">
          <span className="font-literata text-xs">Note {i + 1}</span>
          <span className="font-geist-mono text-xs text-ink-muted">PDF</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className={`font-literata text-lg font-medium md:text-xl ${isRead(r) ? "text-ink-muted" : ""}`}>{r.name}</h3>
        <p className="mt-1 font-geist-mono text-sm text-ink-muted">Updated {formatDate(new Date(r.updated_at ?? r.created_at))}</p>
        {r.description && <p className="mt-2 text-base">{r.description}</p>}
        <div className="mt-3 flex items-center gap-5">
          <button className={link} onClick={() => open(r)}>Read <ArrowUpRight size={14} /></button>
          <button className={`${link} text-brand`} onClick={() => onGenerateQuiz(r.public_access_url, r.name)}>Quiz me{lock}</button>
        </div>
      </div>
    </motion.article>
  );

  // YouTube videos are embedded in place (privacy-enhanced, no related videos, loaded when scrolled near); anything else opens in a new tab.
  const player = (t: Resource, id: string) => (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`}
      loading="lazy"
      title={t.name}
      allow="encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      className="absolute inset-0 size-full border-0"
    />
  );

  const tutorialCard = (t: Resource, i: number) => {
    const id = youtubeId(t.public_access_url);
    const url = youtubeUrl(t.public_access_url) ?? t.public_access_url;
    const body = (
      <>
        <p className="mt-3 font-geist-mono text-sm text-ink-muted">Updated {formatDate(new Date(t.updated_at ?? t.created_at))}</p>
        <p className="mt-1 text-base font-medium">{t.name}</p>
        {t.description && <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{t.description}</p>}
      </>
    );
    if (!id) {
      return (
        <motion.a key={t.id} {...rise(i)} href={url} target="_blank" rel="noreferrer" className="group block">
          <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-field">
            <PlayCircle size={40} weight="fill" className="text-white drop-shadow" />
          </div>
          {body}
        </motion.a>
      );
    }
    return (
      <motion.div key={t.id} {...rise(i)} className="block">
        <div className="relative aspect-video overflow-hidden bg-field">{player(t, id)}</div>
        {body}
      </motion.div>
    );
  };

  // Library for a unit without a syllabus: every resource, with only the type filters that have something in them.
  const typeLabel = (r: Resource) => r.resource_type_id === NOTES ? "Note" : r.resource_type_id === EXAMS ? "Exam" : r.resource_type_id === CATS ? "CAT" : r.resource_type_id === TUTORIALS ? "Video" : "File";
  const libGroups = { notes, papers, videos: tutorials } as const;
  const libItems: Resource[] = libType === "all" ? [...notes, ...papers, ...tutorials, ...resources.filter((r) => ![NOTES, EXAMS, CATS, TUTORIALS].includes(r.resource_type_id))] : [...libGroups[libType]];
  const libraryRow = (r: Resource) => (
    <li key={r.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 border-b border-line py-4 first:pt-0">
      <span className="mt-0.5 w-12 shrink-0 font-geist-mono text-xs text-ink-muted">{typeLabel(r)}</span>
      <div className="min-w-0 flex-1 basis-48">
        <p className="text-base font-medium">{r.name}</p>
        {r.description && <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{r.description}</p>}
      </div>
      <div className="flex items-center gap-5">
        {r.resource_type_id === TUTORIALS
          ? (youtubeId(r.public_access_url)
            ? <a className={link} href={youtubeUrl(r.public_access_url)!} target="_blank" rel="noreferrer">YouTube <ArrowUpRight size={14} /></a>
            : <a className={link} href={r.public_access_url} target="_blank" rel="noreferrer">Watch <ArrowUpRight size={14} /></a>)
          : <button className={link} onClick={() => open(r)}>Open <ArrowUpRight size={14} /></button>}
        {r.resource_type_id === NOTES && <button className={`${link} text-brand`} onClick={() => onGenerateQuiz(r.public_access_url, r.name)}>Quiz me{lock}</button>}
        {(r.resource_type_id === EXAMS || r.resource_type_id === CATS) && <button className={`${link} text-brand`} onClick={() => onGenerateAnswers(r.public_access_url, r.name)}>Model answers{lock} <ArrowRight size={14} /></button>}
      </div>
      {r.resource_type_id === TUTORIALS && youtubeId(r.public_access_url) && (
        <div className="relative mt-2 aspect-video w-full basis-full overflow-hidden bg-field">{player(r, youtubeId(r.public_access_url)!)}</div>
      )}
    </li>
  );

  const tabs: { id: View; label: string; Icon: typeof ListChecks }[] = [
    { id: "all", label: "All", Icon: SquaresFour },
    { id: "syllabus", label: "Syllabus", Icon: ListChecks },
    { id: "papers", label: "Past papers", Icon: FileText },
    { id: "library", label: "Library", Icon: BookOpenText },
    { id: "predictions", label: "Predictions", Icon: TrendUp },
  ];

  return (
    <div className="font-geist text-ink">
      {/* Hero */}
      {/* Pulled up under the floating navbar (60px on phones, 64px from md) so the image fills all the height above the title. */}
      <div className="relative -mt-[60px] border-b border-line md:-mt-16">
        {/* Clipping lives on the image layer only, so the unit panel below can open past the hero's edge. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* The paper-texture photo is light, so in dark mode it is inverted and dimmed into a faint line drawing. */}
          {banner
            ? <img src={banner} alt="" className="size-full object-cover dark:opacity-40" />
            : <img src={unitHero} alt="" className="size-full object-cover dark:opacity-[0.14] dark:invert" />}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 via-[42%] to-background/20" />
        </div>
        <div className="relative mx-auto flex max-w-[1200px] flex-col gap-3 md:gap-6 px-5 pb-6 pt-[88px] md:flex-row md:items-end md:justify-between md:gap-6 md:px-10 md:pb-14 md:pt-[152px]">
          <div ref={pickerRef} className="relative" onKeyDown={(e) => e.key === "Escape" && setPickerOpen(false)}>
            <motion.h1 {...rise(0)} className="font-literata text-3xl md:text-4xl">
              {unit?.name?.trim() || (isLoading ? " " : "Your unit")}
            </motion.h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
              {unit?.code && <span className="font-geist-mono text-ink">{unit.code}</span>}
              {departmentName && <span>{departmentName}{yearLabel ? `, Year ${yearLabel}, Semester ${semesterLabel}` : ""}</span>}
              {onChangeUnit && (
                <button onClick={() => setPickerOpen((v) => !v)} aria-expanded={pickerOpen} aria-haspopup="dialog" className="inline-flex items-center gap-1 font-medium text-brand hover:opacity-60 max-md:min-h-11">
                  Change unit <CaretDown size={14} className={`transition-transform duration-300 ${pickerOpen ? "rotate-180" : ""}`} />
                </button>
              )}
            </p>

            {/* Opens in place under the link, like the navbar's dropdowns: no new page, no overlay. */}
            <AnimatePresence>
              {pickerOpen && onChangeUnit && (
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="absolute left-0 top-full z-30 mt-4 w-[min(520px,calc(100vw-2.5rem))] rounded-3xl bg-surface p-5 shadow-[0_16px_48px_-16px_rgba(14,21,37,0.18)] ring-1 ring-line md:p-6"
                >
                  <p className="mb-4 text-base font-medium">Change unit</p>
                  <ResourceSearch inline currentUnitId={unitId} onSearch={(s) => { setPickerOpen(false); onChangeUnit(s); }} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {topics.length > 0 && (
            <div className="max-w-[340px] text-base md:rounded-2xl md:bg-background/80 md:p-4 md:backdrop-blur-md">
              <p className="max-md:hidden">{doneCount} of {topics.length} {topics.length === 1 ? "topic" : "topics"} complete.{resume ? (last ? " Pick up where you stopped." : " Start with the first note.") : ""}</p>
              {resume && (
                <button className={`${link} md:mt-2`} onClick={() => open(resume)}>Continue reading <ArrowUpRight size={14} /></button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs + search */}
      <div className="mx-auto max-w-[1200px] px-5 pt-8 md:px-10">
        <div className="flex flex-wrap items-center gap-1 md:flex-nowrap md:overflow-x-auto no-scrollbar">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              aria-label={label}
              aria-current={view === id ? "true" : undefined}
              className={`flex h-11 shrink-0 items-center gap-2 rounded-full px-3 text-base md:px-4 transition-colors duration-300 ${view === id ? "bg-field font-medium" : "text-ink-muted hover:text-ink"}`}
            >
              <Icon size={18} /> <span className={view === id ? "" : "max-md:hidden"}>{label}</span>{id === "predictions" && lock}
            </button>
          ))}
          <button
            onClick={() => timer.setVisible(!timer.visible)}
            aria-pressed={timer.visible}
            className={`ml-auto flex h-11 shrink-0 items-center gap-2 rounded-full px-3 text-base md:px-4 transition-colors duration-300 ${timer.visible ? "bg-field font-medium" : "text-ink-muted hover:text-ink"}`}
          >
            <Timer size={18} /> <span className="hidden sm:inline">Timer</span>
          </button>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="mt-5 flex h-[52px] items-center rounded-full bg-field pl-5 pr-1.5 transition-shadow duration-300 focus-within:ring-2 focus-within:ring-brand-solid">
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this unit’s notes, CATs and past papers" aria-label="Search this unit"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-transparent sm:placeholder:text-ink-muted"
          />
          {query ? (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="flex size-10 items-center justify-center rounded-full text-ink-muted hover:bg-surface"><X size={18} /></button>
          ) : (
            <span className="flex size-10 items-center justify-center rounded-full bg-brand-solid text-white"><MagnifyingGlass size={18} /></span>
          )}
        </form>
      </div>

      {/* Search results replace the register while a query is typed */}
      {query.trim() ? (
        <div className="mx-auto max-w-[1200px] px-5 py-12 md:px-10">
          <p className="mb-6 text-sm text-ink-muted">{results.length} {results.length === 1 ? "result" : "results"} for “{query.trim()}”</p>
          <div>
            {results.map((r, i) => (
              <motion.div key={r.id} {...rise(i)} className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line py-4">
                <span className="w-[72px] shrink-0 font-geist-mono text-xs uppercase text-ink-muted">{["", "Note", "Exam", "CAT", "Video"][r.resource_type_id]}</span>
                <span className="min-w-0 flex-1 text-base font-medium">{r.name}</span>
                {r.resource_type_id === TUTORIALS ? (
                  <a className={link} href={youtubeUrl(r.public_access_url) ?? "#"} target="_blank" rel="noreferrer">Watch <ArrowUpRight size={14} /></a>
                ) : (
                  <>
                    <button className={link} onClick={() => open(r)}>Read <ArrowUpRight size={14} /></button>
                    <button className={`${link} text-brand`} onClick={() => onGenerateQuiz(r.public_access_url, r.name)}>Quiz me{lock}</button>
                    {(r.resource_type_id === EXAMS || r.resource_type_id === CATS) && (
                      <button className={`${link} text-brand`} onClick={() => onGenerateAnswers(r.public_access_url, r.name)}>Model answers{lock} <ArrowRight size={14} /></button>
                    )}
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      ) : isError ? (
        // A failed request must not read as "nothing uploaded".
        <div className="mx-auto max-w-[1200px] px-5 py-16 md:px-10">
          <LoadFailed title="Couldn't load this unit" message="The notes and papers are still there. Check your connection and try again." onRetry={() => refetch()} />
        </div>
      ) : isLoading ? (
        <div className="mx-auto max-w-[1200px] px-5 py-16 md:px-10" role="status" aria-label="Loading">
          {[0, 1, 2, 3].map((i) => <div key={i} className="mb-3 h-12 animate-pulse rounded-[10px] bg-field" />)}
        </div>
      ) : (
        <>
          {/* Featured: what to pick up next */}
          {(resume || featuredPaper) && show("all") && (
            <section className="mx-auto grid max-w-[1200px] gap-10 px-5 pt-12 md:grid-cols-2 md:px-10 md:pt-14">
              {resume && (
                <article>
                  <Cover kind={resume.name} left={resume.resource_type_id === NOTES ? "Lecture note" : "Past paper"} right={last?.id === resume.id ? `Opened ${formatDate(new Date(last.at))}` : "Start here"} />
                  <h2 className="mt-6 text-xl font-light">{resume.name}</h2>
                  <p className="mt-3 max-w-[560px] text-base text-ink-muted">{last?.id === resume.id ? "Pick up where you stopped." : resume.description || "The next note you have not opened yet."}</p>
                  <button className={`${link} mt-4`} onClick={() => open(resume)}>Continue reading <ArrowUpRight size={14} /></button>
                </article>
              )}
              {featuredPaper && (
                <article>
                  <Cover kind="Model answer" left="Model answers" right="Written by AI" />
                  <h2 className="mt-6 text-xl font-light">Model answers for {featuredPaper.name}</h2>
                  <p className="mt-3 max-w-[560px] text-base text-ink-muted">Worked answers for every question, made from the paper itself.</p>
                  <button className={`${link} mt-4`} onClick={() => onGenerateAnswers(featuredPaper.public_access_url, featuredPaper.name)}>Read the answers{lock} <ArrowUpRight size={14} /></button>
                </article>
              )}
            </section>
          )}

          {/* Syllabus */}
          {noSyllabus && (
            <section id="syllabus" hidden={!show("all", "syllabus")} className="scroll-mt-32">
              <div className="mx-auto max-w-[1200px] px-5 py-12 md:px-10 md:py-16">
                <h2 className="font-literata text-2xl">No syllabus</h2>
                <p className="mt-3 max-w-[560px] text-base text-ink-muted">This unit has no syllabus yet, so its resources are not grouped into topics. Everything uploaded for it is in the Library.</p>
                <button className={`${link} mt-4`} onClick={() => setView("library")}>Open the library <ArrowUpRight size={14} /></button>
              </div>
            </section>
          )}
          <section id="syllabus" hidden={noSyllabus || !show("all", "syllabus")} className="scroll-mt-32">
            <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)] px-5 py-12 md:grid-cols-[340px_minmax(0,1fr)] md:px-10 md:py-16">
              <aside className="hidden md:block md:pr-8">
                <div className="sticky top-24">{topics.length ? topicList((i) => { setPicked(i); setTab("notes"); }) : <p className="text-base text-ink-muted">No notes uploaded yet.</p>}</div>
              </aside>
              <div className="md:border-l md:border-line md:pl-12">
                {topic ? (
                  <>
                    <h2 className="font-literata text-2xl">{topic.title}</h2>
                    {/* One short, fixed-width segment per note (not stretched across the page). */}
                    <div
                      className="mt-3 flex w-fit max-w-full flex-wrap gap-1.5"
                      role="img" aria-label={`${topic.notes.filter(isRead).length} of ${topic.notes.length} notes read`}
                      title={isDone(topic) ? "Topic complete" : `Marked complete once ${topic.notes.length === 1 ? "you open the note" : `all ${topic.notes.length} notes are read`}`}
                    >
                      {topic.notes.map((n) => <span key={n.id} className={`block h-1 w-8 shrink-0 rounded-full ${isRead(n) ? "bg-positive-solid" : "bg-line-strong"}`} />)}
                    </div>
                    <ClampedText key={topic.id} className="mt-3 max-w-[680px] text-base text-ink-muted">
                      {topic.description || "Read the note, then use Quiz me to check what stuck."}
                    </ClampedText>

                    <div className="mt-8 flex gap-1" role="tablist">
                      {([["notes", "Notes", topic.notes.length], ["tutorials", "Tutorials", tutorials.length], ["quiz", "Quiz", 0]] as const).map(([k, label, n]) => (
                        <button
                          key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                          className={`h-10 rounded-full px-4 text-base transition-colors duration-300 ${tab === k ? "bg-field font-medium" : "text-ink-muted hover:text-ink"}`}
                        >
                          {label}{n > 0 && <span className="ml-1.5 font-geist-mono text-sm text-ink-muted">{n}</span>}
                        </button>
                      ))}
                    </div>

                    <div className="mt-8">
                      <AnimatePresence mode="wait">
                        <motion.div key={`${topic.id}-${tab}`} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: EASE }}>
                          {tab === "notes" && topic.notes.map(noteRow)}
                          {tab === "tutorials" && (tutorials.length
                            ? <div className="grid gap-8 sm:grid-cols-2">{tutorials.map(tutorialCard)}</div>
                            : <p className="text-base text-ink-muted">No tutorials for this unit yet.</p>)}
                          {tab === "quiz" && (
                            <div className="max-w-[480px]">
                              <p className="text-base">Ten questions are made from a note by AI. You choose the length and difficulty first.</p>
                              <div className="mt-4 flex flex-col items-start gap-2">
                                {topic.notes.map((n) => (
                                  <button
                                    key={n.id}
                                    onClick={() => onGenerateQuiz(n.public_access_url, n.name)}
                                    title={n.name}
                                    className="flex h-11 min-w-0 max-w-full items-center rounded-full bg-primary px-5 text-left text-base font-medium text-primary-foreground transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-primary-dark active:scale-[0.98]"
                                  ><span className="truncate">{topic.notes.length === 1 ? "Quiz me on this note" : `Quiz me on ${n.name}`}</span>{noAi && <Lock size={14} weight="fill" className="ml-2 shrink-0 opacity-80" aria-label="Needs the AI add-on" />}</button>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                  </>
                ) : (
                  <p className="text-base text-ink-muted">Nothing to show here until notes are uploaded for this unit.</p>
                )}
              </div>
            </div>
          </section>

          {/* Past papers */}
          {show("all", "papers") && <Section id="papers" title="Past papers" bare={view !== "all"}>
            {byYear.length === 0 ? (
              <p className="text-base text-ink-muted">No past papers uploaded for this unit yet.</p>
            ) : (
              <>
              {/* One row per academic year that has papers; opening it lists them. */}
              <div className="max-w-[720px]">
                {byYear.filter(([, c]) => c.cat1 || c.cat2 || c.exam || c.supp).map(([year, cells]) => (
                  <details key={year} className="group border-b border-line">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-literata text-lg [&::-webkit-details-marker]:hidden">
                      {year}
                      <CaretDown size={18} className="text-ink-muted transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-open:rotate-180" />
                    </summary>
                    <ul className="pb-4 group-open:animate-in group-open:fade-in-0 group-open:slide-in-from-top-1 group-open:duration-500 motion-reduce:animate-none">
                      {([["CAT 1", cells.cat1], ["CAT 2", cells.cat2], ["Main exam", cells.exam], ["Supplementary", cells.supp]] as const).filter(([, p]) => p).map(([label, p]) => (
                        <li key={label} className="flex flex-wrap items-center gap-x-5 gap-y-1 py-2">
                          <span className="w-28 shrink-0 text-sm text-ink-muted">{label}</span>
                          <button className="inline-flex min-h-11 items-center gap-2 text-sm font-medium transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:opacity-60" onClick={() => open(p!)}><FileText size={16} className="text-ink-muted" /> Paper</button>
                          <button className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:opacity-60" onClick={() => onGenerateAnswers(p!.public_access_url, p!.name)}><ListChecks size={16} /> Model answers{lock}</button>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
              </>
            )}
          </Section>}

          {/* Library: videos, or every resource when the unit has no syllabus */}
          {show("all", "library") && <Section id="library" title="Library" bare={view !== "all"}>
            {noSyllabus ? (
              resources.length === 0 ? (
                <p className="text-base text-ink-muted">Nothing has been uploaded for this unit yet.</p>
              ) : (
                <>
                  <div role="group" aria-label="Filter by type" className="mb-6 flex flex-wrap gap-2">
                    {([["all", "All", resources.length], ["notes", "Notes", notes.length], ["papers", "Papers", papers.length], ["videos", "Videos", tutorials.length]] as const)
                      .filter(([k, , n]) => k === "all" || n > 0)
                      .map(([k, label, n]) => (
                        <button
                          key={k} aria-pressed={libType === k} onClick={() => setLibType(k)}
                          className={`h-9 rounded-full px-4 text-sm transition-colors duration-300 ${libType === k ? "bg-field font-medium" : "text-ink-muted hover:text-ink"}`}
                        >
                          {label} <span className="ml-1 font-geist-mono text-xs text-ink-muted">{n}</span>
                        </button>
                      ))}
                  </div>
                  <ul>{libItems.map(libraryRow)}</ul>
                </>
              )
            ) : tutorials.length === 0 ? (
              <p className="text-base text-ink-muted">Nothing in the library for this unit yet.</p>
            ) : (
              <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{tutorials.map(tutorialCard)}</div>
            )}
          </Section>}

          {/* Predictions: the topics the next CAT or exam is likely to cover */}
          {view === "predictions" && <Section id="predictions" title="Predictions" bare><PredictionsPanel unitId={unitId} onViewAnswers={onViewPracticeAnswers} onUpgradeAi={onUpgradeAi} /></Section>}
        </>
      )}

      {/* Phones: topics float at the bottom right and open as a sheet, so switching topic never means scrolling back up. */}
      {topics.length > 0 && !isLoading && show("all", "syllabus") && (
        <div className="md:hidden">
          <button
            onClick={() => setSheet(true)}
            aria-haspopup="dialog" aria-expanded={sheet}
            aria-label={`Topics: ${current + 1} of ${topics.length}, ${doneCount} complete. Open the topic list`}
            className={`fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 items-center gap-2.5 rounded-full bg-primary pl-5 pr-6 text-base font-medium text-primary-foreground shadow-[0_12px_32px_-12px_hsl(var(--ink)/0.5)] transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 ${syllabusInView || sheet ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}
          >
            <ListChecks size={20} />
            <span>Topics</span>
            <span className="tabular-nums opacity-80">{current + 1} / {topics.length}</span>
          </button>

          {sheet && (
            <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Choose a topic" onKeyDown={(e) => e.key === "Escape" && setSheet(false)}>
              <button aria-label="Close topic list" className="absolute inset-0 bg-ink/40" onClick={() => setSheet(false)} />
              <div className="absolute inset-x-0 bottom-0 flex max-h-[75dvh] flex-col rounded-t-3xl bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-16px_48px_-16px_rgba(14,21,37,0.3)]">
                <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" aria-hidden />
                <div className="flex items-center justify-between px-5 pb-2 pt-3">
                  <p className="text-base font-medium">Topics <span className="ml-1 font-geist-mono text-sm font-normal text-ink-muted">{doneCount} of {topics.length} complete</span></p>
                  <button onClick={() => setSheet(false)} aria-label="Close" className="flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-field"><X size={20} /></button>
                </div>
                <div className="overflow-y-auto px-2 pb-4">
                  {topicList((i) => {
                    setPicked(i); setTab("notes"); setSheet(false);
                    requestAnimationFrame(() => document.getElementById("syllabus")?.scrollIntoView({ behavior: "smooth", block: "start" }));
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Closing line */}
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 py-10 text-sm md:px-10">
          <p className="text-ink-muted">{pass ? `Semester pass active until ${formatDate(new Date(pass.end_date))}` : "Semester pass"}</p>
          <button className={link} onClick={() => onNavigate("subscriptions")}>Subscriptions <ArrowUpRight size={14} /></button>
        </div>
      </div>

    </div>
  );
};

export default UnitDashboard;
