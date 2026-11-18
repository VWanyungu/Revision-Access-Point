import { ReactNode, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { ArrowLeft, Eye, EyeSlash, WarningCircle } from "@phosphor-icons/react";
import logoLight from "@/assets/auth/logo-light.svg";
import logoInk from "@/assets/auth/logo-ink.svg";
import googleIcon from "@/assets/auth/google.svg";

const points = [
  { title: "Past papers by academic year", body: "See which CATs and exams exist for each unit, and which are missing." },
  { title: "Model answers you can check", body: "Worked answers with the marks allocation, written from the paper itself." },
  { title: "A timer that stays on", body: "Your focus session keeps running while you read." },
];

interface AuthPageProps {
  children: ReactNode;
  /** Replaces the mobile logo with a back bar (inner screens). */
  back?: { label: string; onClick: () => void };
  /** Mobile only: extra space above the content, for the icon screens. */
  topGap?: "md" | "lg";
}

/** Shared layout route: the navy panel on the left, the page on the right. Both halves are equal width on desktop. */
export const AuthShell = () => (
  <div className="flex min-h-screen flex-col bg-surface font-geist text-ink lg:flex-row">
    <aside className="hidden shrink-0 flex-col justify-between bg-[#0b1f3f] px-10 dark:bg-field pb-12 pt-10 lg:flex lg:w-[38%] lg:max-w-[540px] xl:px-14">
      <img src={logoInk} alt="Revision Access Point" className="h-[28.5px] w-[127px]" />
      <div className="flex flex-col gap-6">
        <p className="font-literata text-2xl text-[#e7ecf4] xl:text-2xl">
          Every unit’s notes, CATs and past papers, in one place.
        </p>
        <div>
          {points.map((p) => (
            <div key={p.title} className="flex flex-col gap-1 border-t border-[#1f3a68] py-4 dark:border-line">
              <p className="text-base font-medium text-[#e7ecf4]">{p.title}</p>
              <p className="text-sm text-[#9aa6b9]">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="text-sm text-[#9aa6b9]">Pay per semester with M-Pesa. Nothing renews on its own.</p>
    </aside>
    <main className="flex flex-1 flex-col">
      <Outlet />
    </main>
  </div>
);

export const AuthPage = ({ children, back, topGap }: AuthPageProps) => (
  <>
    {back ? (
      <button
        type="button"
        onClick={back.onClick}
        className="flex h-14 shrink-0 items-center gap-1 border-b border-line px-2 text-base font-medium text-ink"
      >
        <span className="flex size-11 items-center justify-center rounded-full">
          <ArrowLeft size={20} />
        </span>
        {back.label}
      </button>
    ) : (
      <div className="px-5 pb-2 pt-5 lg:hidden">
        <img src={logoLight} alt="Revision Access Point" className="h-[28.5px] w-[127px] dark:invert" />
      </div>
    )}
    <div
      className={`flex flex-1 px-5 pb-8 lg:items-center lg:justify-center lg:p-0 ${
        topGap === "lg" ? "pt-16" : topGap === "md" ? "pt-10" : "pt-7"
      }`}
    >
      <div className="flex w-full flex-col gap-5 lg:w-[420px]">{children}</div>
    </div>
  </>
);

export const Heading = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <h1 className="font-literata text-xl font-normal">{title}</h1>
    {children && <p className="text-base text-ink-muted">{children}</p>}
  </div>
);

interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label: string;
  value: string;
  onChange: (v: string) => void;
  helper?: string;
  error?: string;
}

export const Field = ({ label, id, type = "text", value, onChange, helper, error, ...rest }: FieldProps) => {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <div
        className={`flex h-12 items-center gap-2.5 rounded-full border bg-surface pl-[18px] pr-4 ${
          error
            ? "border-danger shadow-[0_0_0_1px_#a3153a]"
            : "border-line-strong focus-within:border-brand focus-within:shadow-[0_0_0_1px_#2558d9]"
        }`}
      >
        <input
          id={id}
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink-subtle"
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? "Hide password" : "Show password"}
            className="text-ink-muted hover:text-ink"
          >
            {show ? <EyeSlash size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      {error ? (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-danger">
          <WarningCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : (
        helper && <p className="text-sm text-ink-muted">{helper}</p>
      )}
    </div>
  );
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" };

export const AuthButton = ({ variant = "primary", className = "", children, ...rest }: ButtonProps) => {
  const styles = {
    primary: "bg-brand-solid text-white hover:bg-brand-solid/90",
    outline: "border border-line-strong bg-surface text-ink hover:bg-field",
    ghost: "text-ink hover:bg-field",
  }[variant];
  return (
    <button
      className={`flex h-10 w-full items-center justify-center gap-2 rounded-full px-[18px] text-sm font-medium transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${styles} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};

export const GoogleButton = ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
  <AuthButton type="button" variant="outline" onClick={onClick} disabled={disabled}>
    <img src={googleIcon} alt="" className="size-5" />
    Continue with Google
  </AuthButton>
);

export const OrDivider = () => (
  <div className="flex items-center gap-3 text-sm text-ink-muted">
    <div className="h-px flex-1 bg-line" />
    or
    <div className="h-px flex-1 bg-line" />
  </div>
);

export const SwitchLine = ({ text, action, onClick }: { text: string; action: string; onClick: () => void }) => (
  <p className="flex gap-1.5 text-sm text-ink-muted">
    {text}
    <button type="button" onClick={onClick} className="font-medium text-ink underline underline-offset-2">
      {action}
    </button>
  </p>
);

export const TextLink = ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
  <button type="button" onClick={onClick} className="self-start text-sm font-medium text-ink underline underline-offset-2">
    {children}
  </button>
);

export const IconBadge = ({ children }: { children: ReactNode }) => (
  <div className="flex size-14 items-center justify-center bg-field">{children}</div>
);

export const Tip = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1 bg-field px-4 py-3.5">
    <p className="text-base font-medium">{title}</p>
    <p className="text-sm text-ink-muted">{children}</p>
  </div>
);

/** Pushes the actions to the bottom of the screen on phones. */
export const Spacer = () => <div className="flex-1 lg:hidden" />;

/** Seconds left on a resend cooldown, formatted m:ss by `label`. */
export const useCooldown = (seconds = 60) => {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return {
    left,
    restart: () => setLeft(seconds),
    label: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`,
  };
};
