import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    /*
     * THE type scale. It replaces Tailwind's defaults (not `extend`), so these nine steps are the only
     * `text-*` sizes that exist, and each carries its own line height and tracking, so you rarely need
     * `leading-*`/`tracking-*`. Never write `text-[13px]`: `npm run lint` fails on it
     * (scripts/check-type-scale.mjs), because Tailwind itself would accept any arbitrary size.
     *
     *   xs   12  captions, uppercase labels, badges
     *   sm   13  secondary text, links, buttons, table cells
     *   base 15  body copy (the default)
     *   lg   18  reading text, lead paragraphs, small headings
     *   xl   24  card and section titles
     *   2xl  32  page headings
     *   3xl  44  page titles
     *   4xl  56  hero titles
     *   5xl  72  display (landing only)
     */
    fontSize: {
      xs: ["0.75rem", { lineHeight: "1rem" }],
      sm: ["0.8125rem", { lineHeight: "1.25rem" }],
      base: ["0.9375rem", { lineHeight: "1.5rem" }],
      lg: ["1.125rem", { lineHeight: "1.75rem" }],
      xl: ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.01em" }],
      "2xl": ["2rem", { lineHeight: "2.5rem", letterSpacing: "-0.02em" }],
      "3xl": ["2.75rem", { lineHeight: "3rem", letterSpacing: "-0.03em" }],
      "4xl": ["3.5rem", { lineHeight: "3.75rem", letterSpacing: "-0.035em" }],
      "5xl": ["4.5rem", { lineHeight: "4.75rem", letterSpacing: "-0.04em" }],
    },
    extend: {
      fontFamily: {
        // Geist is the single app font (matches the Enterprise frontend); serif/literata stay as aliases so old classes resolve to it.
        sans: ['Geist', 'system-ui', 'sans-serif'],
        serif: ['Geist', 'system-ui', 'sans-serif'],
        geist: ['Geist', 'system-ui', 'sans-serif'],
        'geist-mono': ['Geist Mono', 'ui-monospace', 'monospace'],
        literata: ['Geist', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Theme-aware tokens for the study screens (values in index.css, light and dark). Prefer these to hex.
        surface: "hsl(var(--surface) / <alpha-value>)",
        field: {
          DEFAULT: "hsl(var(--field) / <alpha-value>)",
          strong: "hsl(var(--field-strong) / <alpha-value>)",
          soft: "hsl(var(--field-soft) / <alpha-value>)",
        },
        line: {
          DEFAULT: "hsl(var(--line) / <alpha-value>)",
          soft: "hsl(var(--line-soft) / <alpha-value>)",
          strong: "hsl(var(--line-strong) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "hsl(var(--ink) / <alpha-value>)",
          soft: "hsl(var(--ink-soft) / <alpha-value>)",
          muted: "hsl(var(--ink-muted) / <alpha-value>)",
          subtle: "hsl(var(--ink-subtle) / <alpha-value>)",
          fg: "hsl(var(--ink-fg) / <alpha-value>)",
          hover: "hsl(var(--ink-hover) / <alpha-value>)",
        },
        brand: {
          DEFAULT: "hsl(var(--brand) / <alpha-value>)",
          solid: "hsl(var(--brand-solid) / <alpha-value>)",
        },
        info: {
          bg: "hsl(var(--info-bg) / <alpha-value>)",
          fg: "hsl(var(--info-fg) / <alpha-value>)",
        },
        positive: {
          DEFAULT: "hsl(var(--positive) / <alpha-value>)",
          solid: "hsl(var(--positive-solid) / <alpha-value>)",
        },
        danger: "hsl(var(--danger) / <alpha-value>)",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          dark: "hsl(var(--primary-dark))",
          light: "hsl(var(--primary-light))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          dark: "hsl(var(--accent-dark))",
          light: "hsl(var(--accent-light))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(10px)" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "flip": {
          from: { transform: "rotateY(0deg)" },
          to: { transform: "rotateY(180deg)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: "1" },
          "50%": { transform: "scale(1)", opacity: "0.5" },
          "100%": { transform: "scale(0.95)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "flip": "flip 0.6s ease-in-out",
        "pulse-ring": "pulse-ring 2s ease-in-out infinite",
      },
      boxShadow: {
        "card": "var(--shadow-card)",
        "elevated": "var(--shadow-elevated)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
