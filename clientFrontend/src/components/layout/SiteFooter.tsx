import { ArrowUpRight, AndroidLogo, AppleLogo, CheckCircle, GoogleChromeLogo, WindowsLogo } from "@phosphor-icons/react";
import whatsappLogo from "@/assets/social/whatsapp.svg";
import xLogo from "@/assets/social/x.svg";
import instagramLogo from "@/assets/social/instagram.svg";
import facebookLogo from "@/assets/social/facebook.svg";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Reveal } from "./Reveal";
import logoLight from "@/assets/auth/logo-light.svg";
import logoInk from "@/assets/auth/logo-ink.svg";

export const CONTACT_EMAIL = "vwanyungu254@gmail.com";

// TODO: replace with the real profile / channel URLs
export const SOCIALS = [
  { label: "WhatsApp channel", logo: whatsappLogo, href: "https://whatsapp.com/channel" },
  { label: "X", logo: xLogo, href: "https://x.com" },
  { label: "Instagram", logo: instagramLogo, href: "https://instagram.com" },
  { label: "Facebook", logo: facebookLogo, href: "https://facebook.com" },
];

// 44px-tall rows on phones, tight on desktop.
const fl = "block max-md:py-3.5";

/** The site footer, shown on every page. `showCta` adds the "start revising" card above it (landing page only). */
const SiteFooter = ({ showCta = false, inApp = false }: { showCta?: boolean; inApp?: boolean }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const year = new Date().getFullYear();

  return (
      <footer id="footer" className={`relative overflow-hidden bg-background px-4 pb-10 ${inApp ? "pt-10 md:px-10" : "pt-20 md:px-[120px]"}`}>
        <div className={`relative z-10 mx-auto ${inApp ? "max-w-[1120px]" : "max-w-[1200px]"}`}>
        {showCta && (
        <Reveal>
          <div className="mb-3 overflow-hidden rounded-3xl bg-card">
              <div className="grid gap-10 p-8 md:grid-cols-2 md:p-12">
                <div className="flex flex-col justify-between gap-10">
                  <div>
                    <img src={logoLight} alt="Revision Access Point" className="h-9 w-auto dark:hidden" />
                    <img src={logoInk} alt="Revision Access Point" className="hidden h-9 w-auto dark:block" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <a href={`mailto:${CONTACT_EMAIL}`} className="text-base font-medium">
                      {CONTACT_EMAIL}
                    </a>
                  </div>
                </div>
                <div className="flex flex-col gap-6 md:items-end md:text-right">
                  <h2 className="text-2xl font-semibold md:text-3xl">
                    Have a CAT coming up? Start revising tonight.
                  </h2>
                  <div className="flex flex-wrap gap-3 md:justify-end">
                    <button
                      onClick={() => navigate(user ? "/app" : "/signup")}
                      className="group inline-flex items-center gap-2 rounded-full bg-brand-solid py-2 pl-5 pr-2 text-sm font-medium text-white transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                    >
                      Pick your unit
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-px group-hover:translate-x-1 group-hover:scale-105">
                        <ArrowUpRight size={14} weight="light" />
                      </span>
                    </button>
                    <button
                      onClick={() => navigate("/login")}
                      className="rounded-full border border-line px-5 py-2.5 text-sm font-medium transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted active:scale-[0.98]"
                    >
                      Sign in
                    </button>
                  </div>
                </div>
              </div>
              <div className="mx-8 border-t border-line md:mx-12" />
              <div className="flex flex-col gap-4 p-8 md:flex-row md:items-center md:justify-between md:px-12">
                <p className="flex items-center gap-2 text-xs font-medium">
                  <CheckCircle size={16} weight="fill" /> Works on every device
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["Android", AndroidLogo],
                    ["iOS", AppleLogo],
                    ["Windows", WindowsLogo],
                    ["Chrome", GoogleChromeLogo],
                  ].map(([name, Icon]) => (
                    <span
                      key={name as string}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium"
                    >
                      <Icon size={14} weight="light" />
                      {name as string}
                    </span>
                  ))}
                </div>
              </div>
          </div>
        </Reveal>
        )}
        <div className="grid gap-3 md:grid-cols-[384px_1fr]">
          <div className="flex min-h-[344px] flex-col justify-between rounded-3xl bg-gradient-to-b from-brand-solid to-brand-light p-6">
            <img src={logoInk} alt="Revision Access Point" className="h-7 w-auto self-start" />
            <div className="flex flex-col gap-7">
              <p className="text-xl font-medium text-white">
                Real past papers, for your exact unit and semester.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-lg text-white">Stay in touch!</span>
                <div className="flex gap-1.5">
                  {SOCIALS.map(({ label, logo, href }) => (
                    <a
                      key={label}
                      href={href}
                      aria-label={label}
                      className="flex h-11 w-11 items-center justify-center rounded-[10px] transition-transform md:h-9 md:w-9 duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:scale-95"
                    >
                      <img src={logo} alt="" className="size-5 brightness-0 invert" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-[344px] flex-col justify-between gap-10 rounded-3xl bg-field p-7">
            <div className="flex gap-16 whitespace-nowrap text-sm font-medium md:gap-20">
              <div className="flex flex-col md:gap-2.5">
                <p className="text-base font-normal text-ink-subtle">Navigation</p>
                <Link className={fl} to="/">Home</Link>
                <a className={fl} href="/#get">What you get</a>
                {user ? <Link className={fl} to="/app">Open app</Link> : <Link className={fl} to="/login">Sign in</Link>}
              </div>
              <div className="flex flex-col md:gap-2.5">
                <p className="text-base font-normal text-ink-subtle">Company</p>
                <a className={fl} href="/terms-of-user.txt">Terms of use</a>
                <a className={fl} href="/privacy-policy.txt">Privacy policy</a>
                <a className={fl} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </div>
            </div>
            <p className="max-w-[250px] text-sm text-muted-foreground">
              © {year} Revision Access Point. Made by Calibre Internet and Software Solutions.
            </p>
          </div>
        </div>
        </div>
        <p
          aria-hidden
          className="pointer-events-none relative z-0 -mb-[10vw] mt-[-2vw] select-none text-center text-[32vw] font-semibold leading-none tracking-tighter text-field"
        >
          RAP
        </p>
      </footer>
  );
};

export default SiteFooter;
