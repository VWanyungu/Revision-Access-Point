import { motion, AnimatePresence, useInView, useReducedMotion } from "framer-motion";
import {
  BookOpen, Brain, Timer, FileText, ArrowRight, Check,
  PlayCircle, GraduationCap, Play, ChevronLeft, ChevronRight,
  Database, Banknote, Sparkles, Shield, ArrowUpRight, Linkedin, Twitter, Quote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useRef } from "react";
import { ModeToggle } from "@/components/mode-toggle";
import { DisplayStudyDashboard } from "@/components/study/StudyDashboard";

interface LandingPageProps {
  onNavigateLogin: () => void;
  onNavigateSignUp: () => void;
}

// ─── Animation variants ──────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

// ─── Reusable scroll-triggered wrapper ───────────────────────────────────────

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "left" | "right" | "none";
}

const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  className = "",
  direction = "up",
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const initial = shouldReduce
    ? { opacity: 0 }
    : direction === "up"
      ? { opacity: 0, y: 40 }
      : direction === "left"
        ? { opacity: 0, x: -40 }
        : direction === "right"
          ? { opacity: 0, x: 40 }
          : { opacity: 0 };

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : initial}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const pillars = [
  {
    icon: FileText,
    title: "Notes",
    tagline: "Smart notes, smarter study.",
    description:
      "Access clean, structured lecture notes for every unit on your course. Annotate, bookmark, and organise them your way. Then go further — generate AI-powered quizzes directly from any note to test your understanding and lock in what you've learned.",
    accent: "primary",
    badge: "Quiz Generator",
  },
  {
    icon: BookOpen,
    title: "CATs",
    tagline: "Practice. Predict. Pass.",
    description:
      "Browse a curated library of Continuous Assessment Tests from previous semesters. Study the patterns, understand what lecturers value, and use our AI answer generator to produce model answers that guide your own revision.",
    accent: "primary-foreground",
    badge: "AI Answers",
  },
  {
    icon: GraduationCap,
    title: "Exams",
    tagline: "Past papers. Perfect prep.",
    description:
      "Every past exam paper, sorted by unit and year. Go deep into question trends, simulate exam conditions, and generate comprehensive model answers with step-by-step reasoning — so you know not just the what, but the why.",
    accent: "primary",
    badge: "AI Answers",
  },
  {
    icon: Play,
    title: "Tutorials",
    tagline: "Learn at your own pace.",
    description:
      "Video and written tutorials curated for your specific course units. Whether you're covering a concept for the first time or revisiting before an exam, tutorials give you the guided explanation notes alone can't always provide.",
    accent: "primary-foreground",
    badge: "Guided Learning",
  },
];

const whyCards = [
  {
    icon: Database,
    title: "Everything in One Place",
    body: "No more hunting across WhatsApp groups, random drives and scattered PDFs. RAP centralises every resource you need: notes, CATs, exams, and tutorials, for your exact units, in one clean, searchable platform.",
    featured: false,
  },
  {
    icon: Banknote,
    title: "Priced for Students",
    body: "We built RAP for university students. Our pricing reflects that. Access a full semester's worth of resources for the cost of a matatu ride. Premium knowledge, genuinely affordable.",
    featured: false,
  },
  {
    icon: Sparkles,
    title: "AI That Actually Helps You Study",
    body: "Generate quizzes from your own notes. Get model answers for past papers.",
    featured: true,
  },
  {
    icon: Shield,
    title: "Always Current",
    body: "Stale resources are worse than no resources. We maintain an up-to-date library refreshed each semester, with contributions verified by students who've sat the very papers you're preparing for.",
    featured: false,
  },
];

const testimonialCards = [
  {
    name: "Elon Ogonji",
    role: "Student",
    org: "Masinde Muliro University of Science and Technology",
    title: "Student at Masinde Muliro University of Science and Technology",
    quote: "This app has made studying much easier. I no longer spend hours looking for notes or past papers because everything is organized in one place. The AI quizzes are also a great way to test my understanding before exams."
  },
  {
    name: "Sarah Sofia",
    role: "Student",
    org: "Masinde Muliro University of Science and Technology",
    title: "Student at Masinde Muliro University of Science and Technology",
    quote: "The collection of notes, CATs, tutorials, and past exams has been incredibly helpful throughout the semester. I especially like the AI-generated answers because they help me understand how to approach different types of questions."
  },
  {
    name: "Emmanuel Sila",
    role: "Student",
    org: "Masinde Muliro University of Science and Technology",
    title: "Student at Masinde Muliro University of Science and Technology",
    quote: "What stands out for me is how much time this app saves. Instead of searching through different groups for study materials, I can access everything in one platform. The AI quizzes make revision more engaging and help me identify topics I need to improve."
  }
]

// ─── Main Component ───────────────────────────────────────────────────────────

const LandingPage = ({ onNavigateLogin, onNavigateSignUp }: LandingPageProps) => {
  const shouldReduce = useReducedMotion();

  // Hero entrance animation — runs on load, not scroll
  const heroVariants = {
    hidden: { opacity: 0, filter: shouldReduce ? "blur(0px)" : "blur(8px)", y: shouldReduce ? 0 : 24 },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const heroMockupVariants = {
    hidden: { opacity: 0, scale: 0.92, y: shouldReduce ? 0 : 30 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden font-sans">

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <header className="py-2 sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 w-full">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6 md:px-8">
          <h1 className="hidden md:block font-extrabold text-base md:text-lg tracking-tight">Revision Access Point</h1>
          <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-end">
            <ModeToggle />
            <div className="sm:flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onNavigateLogin}
                className="text-muted-foreground hover:text-foreground"
              >
                Login
              </Button>
              <Button size="sm" onClick={onNavigateSignUp} className="shadow-sm hidden md:block">
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero — full viewport height ───────────────────────────────────── */}
      <section className="h-[calc(100vh-100px)] md:min-h-screen flex items-start md:items-center max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 px-6 md:px-8 py-20">

        {/* Left — text */}
        <motion.div
          id="heroText"
          className="flex flex-col"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            variants={staggerItem}
            id="heroFaintAccentText"
            className="accent-text text-xs md:text-sm"
          >
            REVISION ACCESS POINT
          </motion.p>

          <motion.div variants={staggerItem} className="flex flex-col">
            <h1 className="text-5xl md:text-6xl font-extralight leading-tight">
              Your<span className="font-extrabold ml-3">revision</span>
            </h1>
            <h1 className="text-6xl md:text-8xl birthstone-regular text-primary leading-none">
              Reimagined
            </h1>
          </motion.div>

          <motion.p
            variants={staggerItem}
            className="text-base md:text-lg text-muted-foreground w-full md:w-3/4 mt-6 mb-8 leading-relaxed"
          >
            Notes, CATs, past exams and tutorials, all organised around your units, not against
            them. One quiet, focused place to actually get the work done.
          </motion.p>

          <motion.div variants={staggerItem} className="flex items-center gap-3 flex-wrap">
            <Button
              size="lg"
              onClick={onNavigateSignUp}
              className="shadow-sm h-12 px-6 text-base"
            >
              Get started
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            {/* <Button
              size="lg"
              variant="outline"
              className="hover:text-foreground border-destructive text-destructive h-12 px-6 text-base"
            >
              <a href="#preview">See how it works</a>
            </Button> */}
          </motion.div>
        </motion.div>

        {/* Right — app mockup */}
        <motion.div
          variants={heroMockupVariants}
          initial="hidden"
          animate="visible"
          className="relative hidden md:block"
        >
          <motion.div
            animate={shouldReduce ? {} : { y: [-6, 6, -6] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <AppMockup />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Feature Showcase / Pillars ────────────────────────────────────── */}
      <section id="features" className="border-t py-6 md:py-16 max-w-7xl mx-auto px-6 md:px-8">
        <FadeIn>
          <p id="heroFaintAccentText" className="accent-text text-xs md:text-sm">What we offer</p>
          <div className="flex flex-col mb-8">
            <h2 className="text-4xl md:text-5xl font-extralight leading-tight">
              Our four <span className="text-primary font-bold">pillars</span>
            </h2>
          </div>
        </FadeIn>

        <PillarsSection />
      </section>

      {/* ── Product Preview ───────────────────────────────────────────────── */}
      <section id="preview" className="py-12 md:py-16" />

      {/* ── Why Us ────────────────────────────────────────────────────────── */}
      <section className="border-t pt-6 pb-12 md:py-16 max-w-7xl mx-auto px-6 md:px-8">
        <FadeIn>
          <p id="heroFaintAccentText" className="accent-text text-xs md:text-sm">Why choose us</p>
          <div className="flex flex-col mb-8">
            <h2 className="text-4xl md:text-5xl font-extralight leading-tight">
              Why <span className="text-primary font-bold">us</span>
            </h2>
          </div>
        </FadeIn>

        <WhySection />
      </section>

      {/* testimonials */}
      <section className="border-t pt-6 pb-12 md:py-16 max-w-7xl mx-auto px-6 md:px-8">
        <FadeIn>
          <p id="heroFaintAccentText" className="accent-text text-xs md:text-sm">testimonials</p>
          <div className="flex flex-col mb-8">
            <h2 className="text-4xl md:text-5xl font-extralight leading-tight">
              What our <span className="text-primary font-bold">users</span> say
            </h2>
          </div>
        </FadeIn>

        <TestimonialsSection />
      </section>

      {/* ── Contact — full viewport height ────────────────────────────────── */}
      <section
        id="contact"
        className="relative min-h-screen w-full overflow-hidden flex items-center"
      >
        {/* Map background */}
        <img
          src="/world.svg"
          alt="World map"
          className="absolute inset-0 w-full h-full object-cover z-0 select-none pointer-events-none"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-background dark:via-background/80 z-10" />

        {/* Content */}
        <motion.div
          className="relative z-20 max-w-7xl mx-auto px-8 md:px-8 w-full"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.p
            variants={staggerItem}
            id="heroFaintAccentText"
            className="accent-text text-xs md:text-sm"
          >
            contact us
          </motion.p>

          <motion.div variants={staggerItem} className="mb-8">
            <h2 className="text-5xl md:text-6xl font-extralight leading-tight">
              <span className="text-primary font-bold">Hello!</span>
            </h2>
          </motion.div>

          <motion.div variants={staggerItem} className="mb-2">
            <p className="accent-text text-xs md:text-sm">email</p>
            <p className="text-base md:text-lg font-semibold mt-1">vwanyungu254@gmail.com</p>
          </motion.div>

          <motion.div variants={staggerItem} className="mt-6">
            <p className="accent-text text-xs md:text-sm mb-3">social</p>
            <div className="flex justify-start gap-4">
              <Button size="icon" variant="outline">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline">
                <Linkedin className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="relative border-t border-border/40 bg-background/50 backdrop-blur py-4">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <p className="text-xs text-muted-foreground font-medium text-center w-full">
            © {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

// ─── App Mockup ───────────────────────────────────────────────────────────────

const AppMockup = () => (
  <div className="p-8 border border-dashed border-primary/30 rounded-2xl">
    <div
      className="rounded-2xl overflow-hidden shadow-2xl border bg-white"
      style={{ boxShadow: "0 32px 80px rgba(13,27,42,0.18)" }}
    >
      <div className="px-5 py-3 flex items-center justify-between border-b bg-primary">
        <div className="flex gap-1.5">
          {["#ff5f57", "#ffbd2e", "#28ca42"].map((c) => (
            <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
          ))}
        </div>
        <div className="text-xs font-medium text-white opacity-70">Revision Access Point</div>
        <div />
      </div>
      <DisplayStudyDashboard />
    </div>
  </div>
);

// ─── Pillars Section ──────────────────────────────────────────────────────────

const PillarsSection = () => {
  const [active, setActive] = useState(0);
  const shouldReduce = useReducedMotion();

  const next = () => setActive((p) => (p + 1) % pillars.length);
  const prev = () => setActive((p) => (p - 1 + pillars.length) % pillars.length);
  const p = pillars[active];

  return (
    <div className="grid md:grid-cols-2 gap-12 items-center">
      {/* Left — content */}
      <div>
        <div className="flex gap-3 mb-10 flex-wrap">
          {pillars.map((pillar, index) => (
            <motion.button
              key={pillar.title}
              onClick={() => setActive(index)}
              className={`text-sm font-medium px-5 py-2 border transition-all 
                ${index === active ? "border-primary bg-primary text-white" : "border-border text-foreground"}`}
              whileHover={{ scale: shouldReduce ? 1 : 1.03 }}
              whileTap={{ scale: shouldReduce ? 1 : 0.97 }}
            >
              {pillar.title}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: shouldReduce ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: shouldReduce ? 0 : -20 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold px-3 py-1 rounded-full border border-border text-foreground">
                {p.badge}
              </span>
            </div>

            <h3 className="text-3xl md:text-4xl font-black mb-2 text-primary">{p.title}</h3>

            <p className="text-base italic mb-4 text-muted-foreground">{p.tagline}</p>

            <p className="text-base leading-relaxed text-foreground/50">{p.description}</p>

            <div className="flex gap-3 mt-8">
              <motion.button
                onClick={prev}
                className="w-11 h-11 border flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors"
                whileTap={{ scale: shouldReduce ? 1 : 0.95 }}
              >
                <ChevronLeft size={18} />
              </motion.button>
              <motion.button
                onClick={next}
                className="w-11 h-11 border flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors"
                whileTap={{ scale: shouldReduce ? 1 : 0.95 }}
              >
                <ChevronRight size={18} />
              </motion.button>
              <div className="flex items-center gap-2 ml-2">
                {pillars.map((_, i) => (
                  <motion.div
                    key={i}
                    className={`h-1.5 transition-all rounded-full ${i === active ? "bg-primary" : "bg-muted/30"}`}
                    animate={{ width: i === active ? 20 : 6 }}
                    transition={{ duration: 0.3 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right — visual card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, scale: shouldReduce ? 1 : 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: shouldReduce ? 1 : 0.95 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded overflow-hidden aspect-[4/3] flex flex-col justify-end p-8 bg-primary/10"
          style={{ boxShadow: `0 24px 60px rgba(var(--primary), 0.15)` }}
        >
          <div className="absolute top-8 right-8 w-32 h-32 rounded-full border-2 opacity-20 border-primary" />
          <div className="absolute top-4 right-4 w-48 h-48 rounded-full border opacity-10 border-primary" />
          <p.icon size={80} className="absolute top-14 right-14 opacity-20 text-primary" />

          <div>
            <div className="text-xs uppercase tracking-widest mb-2 text-muted-foreground">
              Pillar {active + 1} of 4
            </div>
            <div className="text-3xl font-black mb-1 text-primary">{p.title}</div>
            <div className="text-base italic text-muted-foreground">{p.tagline}</div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ─── Why Section ──────────────────────────────────────────────────────────────

const WhySection = () => {
  const shouldReduce = useReducedMotion();

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {whyCards.map((card, i) => (
        <FadeIn key={card.title} delay={i * 0.1}>
          <motion.div
            className={`rounded p-8 h-full border flex flex-col gap-5 transition-all
              ${card.featured ? "bg-primary border-primary" : "bg-background light:border-border/80 dark:border-white/20"}`}
            style={{
              boxShadow: card.featured ? "0 20px 60px rgba(13,27,42,0.25)" : "none",
            }}
            whileHover={
              shouldReduce
                ? {}
                : {
                  y: -4,
                  boxShadow: card.featured
                    ? "0 28px 70px rgba(13,27,42,0.3)"
                    : "0 12px 40px rgba(13,27,42,0.1)",
                }
            }
            transition={{ duration: 0.25 }}
          >
            <div
              className={`w-12 h-12 flex items-center justify-center bg-${card.featured ? "white/10" : "primary/20"}`}
            // style={{
            //   background: card.featured ? "rgba(255,255,255,0.12)" : "rgba(13,27,42,0.06)",
            // }}
            >
              <card.icon
                size={22}
                className={card.featured ? "text-white" : "text-primary"}
              />
            </div>

            <div>
              <h3 className={`text-xl md:text-2xl font-bold mb-3 ${card.featured ? "text-white" : "text-primary"}`}>
                {card.title}
              </h3>
              <p className={`text-sm md:text-base leading-relaxed ${card.featured ? "text-white/70" : "text-muted-foreground"}`}>
                {card.body}
              </p>
            </div>

            {card.featured && (
              <motion.a
                href="#signup"
                className="border mt-auto inline-flex items-center justify-start gap-2 text-sm font-semibold py-3 px-6 text-white bg-primary hover:bg-primary-foreground hover:text-primary transition-colors w-max"
                whileTap={{ scale: shouldReduce ? 1 : 0.97 }}
              >
                Sign Up Free <ArrowUpRight size={14} />
              </motion.a>
            )}
          </motion.div>
        </FadeIn>
      ))}
    </div>
  );
};

const TestimonialsSection = () => {
  const shouldReduce = useReducedMotion();

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {testimonialCards.map((card, i) => (
        <FadeIn key={i} delay={i * 0.1}>
         <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 + i * 0.15 }}
              className="bg-background p-8 flex flex-col justify-between group hover:bg-card transition-all duration-400"
            >
              <div>
                <Quote size={28} className="text-primary/30 mb-4" />
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-6 font-editorial">
                  "{card.quote}"
                </p>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-sm font-semibold text-muted-foreground">{card.name}</p>
                <p className="text-xs text-muted-foreground">{card.role}, {card.org}</p>
              </div>
            </motion.div>
        </FadeIn>
      ))}
    </div>
  );
};

export default LandingPage;