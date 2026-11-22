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
  CheckCircle,
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
    className="group inline-flex items-center gap-4 rounded-full bg-[hsl(var(--red))] py-1.5 pl-6 pr-1.5 text-base font-medium text-white transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
  >
    {label}
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[hsl(var(--red))] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-px group-hover:translate-x-1 group-hover:scale-105">
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
      className={`pointer-events-none absolute -top-16 select-none font-light [font-size:8.75rem] leading-none tracking-tighter text-transparent [-webkit-text-stroke:1px_hsl(var(--red)/0.4)] max-md:hidden ${
        flip ? "left-0" : "right-0"
      }`}
    >
      {f.n}
    </span>
    <Reveal className={`md:col-span-7 ${flip ? "md:order-2" : ""}`}>{f.plate}</Reveal>
    <Reveal delay={0.15} className={`flex flex-col gap-2.5 md:col-span-5 md:px-6 ${flip ? "md:order-1" : ""}`}>
      {f.eyebrow && <p className="text-xs font-medium text-muted-foreground">{f.eyebrow}</p>}
      <h3 className="text-xl font-light">{f.title}</h3>
      <p className="text-base text-muted-foreground md:text-sm">{f.body}</p>
    </Reveal>
  </div>
);

// ─── Pricing ─────────────────────────────────────────────────────────────────

const tiers = [
  {
    name: "Semester access",
    blurb: "Read and view everything for your units, for one semester.",
    price: 100,
    items: ["Past papers and CATs by year and sitting", "Notes and quizzes", "Tutorials and a focus timer"],
  },
  {
    name: "Semester access with AI",
    blurb: "Everything in Semester access, plus AI study tools.",
    price: 450,
    accent: true,
    items: ["Everything in Semester access", "Model answers and topic forecasts", "Practice papers and AI marking"],
  },
];

const Pricing = ({ onSelect }: { onSelect: () => void }) => {
  return (
    <section id="pricing" className="relative overflow-hidden bg-band px-4 py-16 text-band-fg md:px-[120px] md:py-32">
      <svg aria-hidden viewBox="0 0 620 520" preserveAspectRatio="xMaxYMin slice" className="pointer-events-none absolute right-0 top-0 h-[520px] w-[620px] max-w-full fill-none stroke-brand-light/25 [mask-image:linear-gradient(to_bottom,black_30%,transparent)]" strokeWidth="1"><path d="M120 0C260 90 400 190 620 230"/><path d="M126 0C266 90 405 190 620 239"/><path d="M132 0C272 90 410 190 620 248"/><path d="M138 0C278 90 415 190 620 257"/><path d="M144 0C284 90 420 190 620 266"/><path d="M150 0C290 90 425 190 620 275"/><path d="M156 0C296 90 430 190 620 284"/><path d="M162 0C302 90 435 190 620 293"/><path d="M168 0C308 90 440 190 620 302"/><path d="M174 0C314 90 445 190 620 311"/><path d="M180 0C320 90 450 190 620 320"/><path d="M186 0C326 90 455 190 620 329"/><path d="M192 0C332 90 460 190 620 338"/><path d="M198 0C338 90 465 190 620 347"/><path d="M204 0C344 90 470 190 620 356"/><path d="M210 0C350 90 475 190 620 365"/><path d="M216 0C356 90 480 190 620 374"/><path d="M222 0C362 90 485 190 620 383"/><path d="M228 0C368 90 490 190 620 392"/><path d="M234 0C374 90 495 190 620 401"/><path d="M240 0C380 90 500 190 620 410"/><path d="M246 0C386 90 505 190 620 419"/><path d="M252 0C392 90 510 190 620 428"/><path d="M258 0C398 90 515 190 620 437"/><path d="M264 0C404 90 520 190 620 446"/><path d="M270 0C410 90 525 190 620 455"/><path d="M276 0C416 90 530 190 620 464"/><path d="M282 0C422 90 535 190 620 473"/><path d="M288 0C428 90 540 190 620 482"/><path d="M294 0C434 90 545 190 620 491"/><path d="M300 0C440 90 550 190 620 500"/><path d="M306 0C446 90 555 190 620 509"/><path d="M312 0C452 90 560 190 620 518"/><path d="M318 0C458 90 565 190 620 527"/><path d="M324 0C464 90 570 190 620 536"/><path d="M330 0C470 90 575 190 620 545"/><path d="M336 0C476 90 580 190 620 554"/><path d="M342 0C482 90 585 190 620 563"/><path d="M348 0C488 90 590 190 620 572"/><path d="M354 0C494 90 595 190 620 581"/><path d="M360 0C500 90 600 190 620 590"/><path d="M366 0C506 90 605 190 620 599"/><path d="M372 0C512 90 610 190 620 608"/><path d="M378 0C518 90 615 190 620 617"/><path d="M384 0C524 90 620 190 620 626"/><path d="M390 0C530 90 625 190 620 635"/></svg>
      <div className="relative mx-auto max-w-[1200px]">
        <Reveal>
          <h2 className="text-4xl font-light tracking-tight text-white md:text-6xl">Pricing</h2>
        </Reveal>
        <div className="mt-12 flex flex-col gap-4">
          {tiers.map((t) => {
            return (
              <Reveal key={t.name}>
                <div
                  className={`grid gap-8 rounded-2xl border-t-2 border-brand-light p-6 md:grid-cols-2 md:p-10 ${
                    t.accent ? "bg-brand-light text-band" : "bg-card text-foreground"
                  }`}
                >
                  <div className="flex flex-col items-start gap-4">
                    <p className="text-base font-semibold">{t.name}</p>
                    <p className="flex items-baseline gap-2">
                      <span className="text-sm opacity-70">KSh</span>
                      <span className="text-5xl font-light tabular-nums md:text-6xl">{t.price}</span>
                      <span className="text-sm opacity-70">per semester</span>
                    </p>
                    <div aria-hidden className="hidden h-5 md:block" />
                    <button
                      onClick={onSelect}
                      className={`group focus-ring mt-2 inline-flex h-11 items-center gap-3 rounded-full py-1 pl-5 pr-1 text-sm transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
                        t.accent ? "bg-band text-white" : "border border-line-strong"
                      }`}
                    >
                      Get started
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:scale-105 ${
                          t.accent ? "bg-brand-light text-band" : "bg-band text-white"
                        }`}
                      >
                        <ArrowRight size={16} weight="light" />
                      </span>
                    </button>
                  </div>
                  <div>
                    <p className="mb-5 text-base">What's included</p>
                    <ul className="flex flex-col gap-3">
                      {t.items.map((i) => (
                        <li key={i} className="flex items-center gap-3 text-base md:text-sm">
                          <CheckCircle size={20} weight="fill" className="mt-px shrink-0" />
                          {i}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

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

      {/* Hero: lime page, dark-green frame, full viewport height */}
      <section id="top" ref={heroRef} className="flex h-[100dvh] min-h-[640px] bg-band p-3 md:p-5">
        <div className="relative flex w-full flex-col justify-between gap-10 md:gap-14">
          {/* Hairline border: runs half the section height, fading out */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-[2rem] border border-brand-light/40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

          {/* Nav */}
          <motion.nav
            aria-label="Main"
            initial={{ opacity: 0, y: reduce ? 0 : -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
            className="relative flex items-center justify-between gap-3 px-4 pt-3 md:px-8 md:pt-5"
          >
            <a href="#top" aria-label="Revision Access Point home" className="shrink-0">
              <img src={logoInk} alt="Revision Access Point" className="h-8 w-auto md:h-9" />
            </a>
            <div className="hidden items-center gap-9 text-sm text-white/90 lg:flex">
              <a href="#get" className="transition-colors duration-500 hover:text-brand-light">What you get</a>
              <a href="#pricing" className="transition-colors duration-500 hover:text-brand-light">Pricing</a>
              <a href="#footer" className="transition-colors duration-500 hover:text-brand-light">Contact</a>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="focus-ring inline-flex h-11 items-center rounded-full border border-brand-light px-6 text-sm text-brand-light transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-light/10 active:scale-[0.98]"
              >
                Sign in
              </Link>
            </div>
          </motion.nav>

          {/* Headline left, blurb + CTA + socials right */}
          <div className="relative grid gap-6 px-4 md:grid-cols-12 md:items-end md:gap-8 md:px-8">
            <motion.h1
              initial={{ opacity: 0, y: reduce ? 0 : 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: EASE }}
              className="text-[2.75rem] font-normal leading-[1.02] tracking-tight text-white sm:text-6xl md:col-span-8 md:text-7xl xl:text-[5.5rem]"
            >
              Escape the chaos
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, y: reduce ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4, ease: EASE }}
              className="flex flex-col items-start gap-4 md:col-span-4 md:pb-3"
            >
              <p className="max-w-[380px] text-base text-white/80">
                Studying gets chaotic. Where are the notes? Do you have last year's paper? RAP puts them all in one place, for your exact unit.
              </p>
              <PillCta label="Get started" onClick={onNavigateSignUp} />
              <div className="flex gap-1 max-sm:hidden">
                {SOCIALS.map(({ label, logo, href }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:scale-95"
                  >
                    <img src={logo} alt="" className="size-5" />
                  </a>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Photo fills the rest of the viewport */}
          <div className="relative h-[54dvh] min-h-[200px] flex-none overflow-hidden rounded-[1.5rem] md:rounded-[2rem]">
            <motion.img
              src="/landing/hero.png"
              alt=""
              onError={(e) => (e.currentTarget.style.display = "none")}
              initial={{ scale: reduce ? 1 : 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: 2.4, ease: EASE }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* What's inside */}
      <section id="get" className="px-4 py-16 md:px-[120px] md:py-32">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <h2 className="mb-12 text-4xl font-light tracking-tight md:mb-24 md:text-6xl">What you get</h2>
          </Reveal>
          <div className="flex flex-col gap-16 md:gap-32">
            {features.map((f, i) => (
              <Feature key={f.n} f={f} flip={i % 2 === 1} />
            ))}
          </div>
        </div>
      </section>

      <Pricing onSelect={onNavigateSignUp} />

      <SiteFooter showCta />
    </div>
  );
};

export default LandingPage;
