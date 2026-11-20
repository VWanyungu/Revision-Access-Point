import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import SiteFooter, { SOCIALS } from "@/components/layout/SiteFooter";
import { EASE, Reveal } from "@/components/layout/Reveal";
import logoInk from "@/assets/auth/logo-ink.svg";
import {
  ArrowRight,
  ArrowUp,
  ArrowCounterClockwise,
  CaretRight,
  FileText,
  ListChecks,
  Pause,
} from "@phosphor-icons/react";

interface LandingPageProps {
  onNavigateSignUp: () => void;
}



// ─── Button-in-button CTA ────────────────────────────────────────────────────

const PillCta = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="group inline-flex items-center gap-4 rounded-full bg-card py-2 pl-7 pr-2 text-lg font-medium text-foreground transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
  >
    {label}
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-solid text-white transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-px group-hover:translate-x-1 group-hover:scale-105">
      <ArrowRight size={20} weight="light" />
    </span>
  </button>
);

// ─── Double-bezel plate ──────────────────────────────────────────────────────

const Plate = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-3xl border border-line/60 bg-card p-6 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 md:p-8">
    <div className="flex flex-col gap-4">{children}</div>
  </div>
);

// ─── Plates (product vignettes) ──────────────────────────────────────────────

const PaperCell = ({ pages }: { pages?: string }) =>
  pages ? (
    <div className="flex h-[84px] flex-col justify-center gap-2 whitespace-nowrap rounded-xl border border-line-soft bg-card p-3">
      <div className="flex items-center gap-2">
        <FileText size={16} weight="light" />
        <span className="flex-1 text-sm font-medium">Paper</span>
        <span className="text-sm text-muted-foreground">{pages}</span>
      </div>
      <div className="flex items-center gap-2 text-sm font-medium text-brand">
        <ListChecks size={16} weight="light" />
        Model answers
      </div>
    </div>
  ) : (
    <div className="flex h-[84px] items-center rounded-xl bg-muted p-3 text-sm text-muted-foreground">
      Not uploaded
    </div>
  );

const PastPapersPlate = () => (
  <Plate>
    <div className="rounded-xl bg-band-raised px-5 py-3.5 text-band-fg">
      <p className="text-base font-medium">Software Project Management</p>
      <p className="text-sm text-band-muted">BCS 412 · Year 4, Semester 1</p>
    </div>
    {[
      { year: "2025/26", cells: ["4 pages", "6 pages", "9 pages"] },
      { year: "2024/25", cells: ["3 pages", undefined, "8 pages"] },
    ].map((row) => (
      <div key={row.year} className="flex flex-col gap-2">
        <p className="text-base font-medium">{row.year}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {row.cells.map((c, i) => (
            <PaperCell key={i} pages={c} />
          ))}
        </div>
      </div>
    ))}
  </Plate>
);

const AnswersPlate = () => (
  <Plate>
    <div className="flex justify-between text-xs font-medium text-muted-foreground">
      <span>Question 1(b)</span>
      <span className="font-geist-mono text-sm font-normal">10 marks</span>
    </div>
    <p className="text-base font-medium">
      Draw the activity-on-node network, then identify the critical path and the minimum project
      duration.
    </p>
    <div className="rounded-xl bg-brand/10 px-4 py-3">
      <p className="mb-1.5 text-xs font-medium text-brand">Model answer</p>
      <p className="text-base">
        Critical path A, B, D, E. Minimum duration 3 + 4 + 6 + 3 = 16 days. C has 2 days of float.
      </p>
    </div>
    {[
      ["Draws the network correctly", 4],
      ["Finds the critical path", 4],
      ["States the duration", 2],
    ].map(([t, m]) => (
      <div key={t} className="flex justify-between border-b border-line-soft pb-2 text-sm">
        <span>{t}</span>
        <span className="font-geist-mono">{m}</span>
      </div>
    ))}
  </Plate>
);

const QuizPlate = () => (
  <Plate>
    <p className="text-xs font-medium text-muted-foreground">Lecture 3 quiz · Question 4 of 10</p>
    <p className="text-lg font-medium">Which process group produces the project charter?</p>
    {["Planning", "Initiating", "Executing", "Monitoring and controlling"].map((t, i) => {
      const selected = i === 1;
      return (
        <div
          key={t}
          className={`flex items-center gap-3 rounded-xl bg-card px-4 py-3.5 ${
            selected ? "border-2 border-brand-solid" : "border border-line"
          }`}
        >
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
              selected ? "bg-brand-solid text-white" : "border border-line"
            }`}
          >
            {"ABCD"[i]}
          </span>
          <span className="text-base">{t}</span>
        </div>
      );
    })}
  </Plate>
);

const TimerPlate = () => (
  <Plate>
    <div className="flex justify-between">
      <p className="text-lg font-medium">Focus timer</p>
      <p className="text-sm text-muted-foreground">Session 2 of 4</p>
    </div>
    <p className="font-geist-mono text-5xl font-medium">18:42</p>
    <div className="flex gap-2">
      <span className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-solid px-[18px] text-sm font-medium text-white">
        <Pause size={18} weight="light" /> Pause
      </span>
      <span className="inline-flex h-10 items-center gap-2 rounded-full px-[18px] text-sm font-medium">
        <ArrowCounterClockwise size={18} weight="light" /> Reset
      </span>
    </div>
    <div className="flex items-center gap-3 border-b border-line-soft pb-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        <FileText size={20} weight="light" />
      </span>
      <div className="flex-1">
        <p className="text-base font-medium">Critical path method, step by step</p>
        <p className="text-sm text-muted-foreground">YouTube · 18 min</p>
      </div>
      <CaretRight size={16} weight="light" />
    </div>
  </Plate>
);

// ─── What's inside ───────────────────────────────────────────────────────────

const features = [
  {
    n: "01",
    eyebrow: "Sorted by year and sitting",
    title: "Past papers and CATs",
    body: "Every sitting we have for your unit, in one grid. Gaps are marked, not hidden, so you know what to ask your class rep for.",
    link: "See the register",
    plate: <PastPapersPlate />,
  },
  {
    n: "02",
    title: "Model answers",
    body: "Worked answers for any CAT or exam, with how each mark is earned. Check them against your lecture notes.",
    link: "Open a sample answer",
    brand: true,
    plate: <AnswersPlate />,
  },
  {
    n: "03",
    title: "Notes and quizzes",
    body: "Read the notes, then tap Quiz me for 5 to 15 questions and a review of the ones you missed.",
    link: "Try a quiz",
    plate: <QuizPlate />,
  },
  {
    n: "04",
    title: "Tutorials and a focus timer",
    body: "Short videos chosen for the unit, and a Pomodoro timer that stays on when you open a paper.",
    link: "See the timer",
    plate: <TimerPlate />,
  },
];

const Feature = ({ f, flip }: { f: (typeof features)[number]; flip: boolean }) => (
  <div className="relative grid items-center gap-8 md:grid-cols-12 md:gap-12">
    <span
      aria-hidden
      className={`pointer-events-none absolute -top-16 select-none font-light [font-size:8.75rem] leading-none tracking-tighter text-transparent [-webkit-text-stroke:1px_hsl(var(--line))] max-md:hidden ${
        flip ? "left-0" : "right-0"
      }`}
    >
      {f.n}
    </span>
    <Reveal className={`md:col-span-7 ${flip ? "md:order-2" : ""}`}>{f.plate}</Reveal>
    <Reveal delay={0.15} className={`flex flex-col gap-2.5 md:col-span-5 md:px-6 ${flip ? "md:order-1" : ""}`}>
      {f.eyebrow && <p className="text-xs font-medium text-muted-foreground">{f.eyebrow}</p>}
      <h3 className="text-xl font-semibold">{f.title}</h3>
      <p className="text-base text-muted-foreground">{f.body}</p>
      <span
        className={`mt-1.5 inline-flex items-center gap-2.5 text-sm font-medium ${
          f.brand ? "text-brand" : "text-foreground"
        }`}
      >
        {f.link} <ArrowRight size={18} weight="light" />
      </span>
    </Reveal>
  </div>
);

// ─── Page ────────────────────────────────────────────────────────────────────

const LandingPage = ({ onNavigateSignUp }: LandingPageProps) => {
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowTop(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-muted font-sans text-foreground">
      {/* Scroll-to-top, shown once the hero is out of view */}
      <motion.button
        aria-label="Scroll to top"
        onClick={() => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })}
        initial={false}
        animate={{ opacity: showTop ? 1 : 0, y: showTop ? 0 : 16, scale: showTop ? 1 : 0.9 }}
        transition={{ duration: 0.7, ease: EASE }}
        style={{ pointerEvents: showTop ? "auto" : "none" }}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_32px_hsl(var(--ink)/0.2)] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:scale-95"
      >
        <ArrowUp size={20} weight="light" />
      </motion.button>

      {/* Hero */}
      <section id="top" ref={heroRef} className="min-h-[100dvh]">
        <div className="relative flex min-h-[100dvh] flex-col justify-center overflow-hidden bg-band px-6 pb-[18dvh] pt-28 md:px-12 md:pb-[14dvh]">
          <motion.img
            src="/landing/hero.png"
            alt=""
            onError={(e) => (e.currentTarget.style.display = "none")}
            initial={{ scale: reduce ? 1 : 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2.4, ease: EASE }}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-band/25 via-band/20 to-band/90" />

          <div className="absolute left-6 top-6 flex items-center gap-3 md:left-12 md:top-8">
            <motion.img
              src={logoInk}
              alt="Revision Access Point"
              initial={{ opacity: 0, y: reduce ? 0 : -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
              className="h-9 w-auto"
            />
            <Link to="/login" className="focus-ring inline-flex h-11 items-center rounded-full bg-black/40 px-5 text-sm font-medium text-white ring-1 ring-white/30 backdrop-blur-md transition-[transform,background-color] duration-500 ease-house hover:bg-black/55 active:scale-[0.98]">
              Sign in
            </Link>
          </div>

          {/* On phones the logo, Sign in and four icons do not fit in one row; the same links are in the footer. */}
          <div className="absolute right-6 top-6 flex flex-col items-end gap-2.5 max-sm:hidden md:right-12 md:top-8">
            <p className="hidden text-base font-medium text-white sm:block">Follow us</p>
            <div className="flex gap-2">
              {SOCIALS.map(({ label, logo, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-700 sm:h-10 sm:w-10 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:scale-95"
                >
                  <img src={logo} alt="" className="size-6" />
                </a>
              ))}
            </div>
          </div>

          <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <motion.div
              className="flex flex-col gap-6"
              initial={false}
            >
              <h1 className="text-3xl font-semibold text-white sm:text-4xl md:text-5xl">
                Revise with the
                <br />
                <span className="text-brand-light">real past papers.</span>
              </h1>
              <p className="max-w-[520px] text-lg text-white/80">
                Past papers, model answers, notes and quizzes for your exact unit.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: reduce ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5, ease: EASE }}
            >
              <div className="flex flex-col items-start gap-4 md:items-end">
                <PillCta label="Get started" onClick={onNavigateSignUp} />
                <p className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-sm text-white ring-1 ring-white/30 backdrop-blur-md">
                  <span className="font-medium tabular-nums">KSH 300 a semester</span>
                  <span aria-hidden className="text-white/60">·</span>
                  <span className="text-white/90">Pay with M-Pesa</span>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* What's inside */}
      <section id="get" className="mx-auto max-w-[1200px] px-4 py-24 md:px-[120px] md:py-32">
        <Reveal>
          <h2 className="mb-24 text-2xl font-semibold md:text-4xl">What you get.</h2>
        </Reveal>
        <div className="flex flex-col gap-24 md:gap-32">
          {features.map((f, i) => (
            <Feature key={f.n} f={f} flip={i % 2 === 1} />
          ))}
        </div>
      </section>

      <SiteFooter showCta />
    </div>
  );
};

export default LandingPage;
