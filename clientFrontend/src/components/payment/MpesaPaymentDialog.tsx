import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle, Circle, CircleHalf, WarningCircle } from "@phosphor-icons/react";
import { supabase } from "@/database/supabase";
import { useAuth } from "@/context/AuthContext";
import { callFunction } from "@/lib/callFunction";
import { CONTACT_EMAIL } from "@/components/layout/SiteFooter";
import {
  EASE, PayPage, PayTopBar, PayBottomBar, Title, InkButton, QuietButton, DetailRow, formatDate,
} from "@/components/pay/PayKit";

type Step = "phone" | "waiting" | "received" | "failed";
/** Why a payment did not complete, as far as the server result tells. "request": the prompt could not be sent at all. */
type Failure = "request" | "cancelled" | "wrong_pin" | "insufficient_funds" | "timeout" | "paid_not_activated" | "failed";

const FAILURE_COPY: Record<Failure, { title: string; body: string }> = {
  request: { title: "We couldn't send the prompt", body: "Nothing was sent to your phone and no money was taken. Check the number and your connection, then try again." },
  cancelled: { title: "You cancelled the prompt", body: "No money was taken. Send the prompt again when you are ready to pay." },
  wrong_pin: { title: "Wrong PIN", body: "The PIN was not accepted, so no money was taken. Send the prompt again and enter your M-Pesa PIN carefully." },
  insufficient_funds: { title: "Not enough M-Pesa balance", body: "Your M-Pesa balance is too low for this payment. Top up, then send the prompt again." },
  timeout: { title: "The prompt expired", body: "We did not get your PIN in time. Send the prompt again, then enter your PIN as soon as it appears." },
  paid_not_activated: { title: "Payment received, pass not active yet", body: "Your money was taken but we could not switch the pass on. Do not pay again. Contact support with the reference below and we will fix it." },
  failed: { title: "Payment not completed", body: "We could not confirm this payment." },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The total shown to the student. The amount actually charged is worked out by the server from its pricing secrets. */
  price: string;
  /** Includes the AI add-on (a new pass with AI, or the upgrade). */
  ai?: boolean;
  /** "pass": a new semester pass. "ai_upgrade": the AI add-on for a pass already held. */
  kind?: "pass" | "ai_upgrade";
  departmentId: string;
  year: string;
  semester: string;
  /** e.g. "Computer Science, Y4 S1" */
  courseLabel: string;
  /** Shown before payment; the real date comes from the subscription afterwards. */
  accessUntil: string;
  onPaymentSuccess?: () => void;
}

/** A pass can be renewed in its last 14 days. Keep in step with RENEW_WINDOW_DAYS in SubscriptionsPage and the payment function. */
const RENEW_WINDOW_DAYS = 14;
const daysLeft = (end: string) => Math.ceil((new Date(end).getTime() - Date.now()) / 86_400_000);

const PROMPT_LIFETIME_MS = 120_000;
const RESEND_AFTER_MS = 30_000;
const POLL_MS = 3_000;

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
/** 712345678 -> 712 345 678 */
const groupDigits = (d: string) => d.replace(/(\d{3})(?=\d)/g, "$1 ");
const clock = (t: number) =>
  new Date(t).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();

const MpesaPaymentDialog = ({
  open, onOpenChange, price, ai = false, kind = "pass", departmentId, year, semester, courseLabel, accessUntil, onPaymentSuccess,
}: Props) => {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>("phone");
  const [digits, setDigits] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sentAt, setSentAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [receipt, setReceipt] = useState<{ ref: string; until: string } | null>(null);
  const [note, setNote] = useState("");
  const [failure, setFailure] = useState<Failure>("failed");
  // The M-Pesa request id of the latest prompt: what support needs to find a payment.
  const [reference, setReference] = useState("");
  const fail = (why: Failure) => { setFailure(why); setStep("failed"); };
  // When renewing, the pass being renewed still exists, so "paid" means a pass that ends later than this appeared.
  const renewedFrom = useRef<string | null>(null);

  const findPass = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase
      .from("subscriptions")
      .select("payment_ref, end_date, ai_access")
      .eq("user_uuid", user.id)
      .eq("department_id", Number(departmentId))
      .eq("year_of_study", Number(year))
      .eq("semester_of_study", Number(semester))
      .gte("end_date", new Date().toISOString().slice(0, 10))
      .order("end_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  }, [user, departmentId, year, semester]);

  const received = useCallback(async () => {
    const pass = await findPass();
    // An upgrade is paid once the pass the student already held now has AI.
    if (!pass || (kind === "ai_upgrade" && !pass.ai_access)) return false;
    if (kind === "pass" && renewedFrom.current && pass.end_date <= renewedFrom.current) return false;
    setReceipt({ ref: pass.payment_ref, until: formatDate(new Date(pass.end_date)) });
    setStep("received");
    return true;
  }, [findPass]);

  // Reset whenever the flow is opened.
  useEffect(() => {
    if (open) {
      setStep("phone"); setDigits(""); setError(""); setNote(""); setReceipt(null); setReference("");
    }
  }, [open]);

  // While waiting: tick the clock, poll for the pass, and ask the server how the prompt ended (cancelled, wrong PIN, no funds).
  useEffect(() => {
    if (step !== "waiting") return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(async () => {
      if (await received()) return;
      if (!reference) return;
      try {
        const { outcome } = await callFunction<{ outcome: string }>("mpesa-payment-status", { checkout_request_id: reference });
        if (outcome === "paid") await received();
        else if (outcome !== "pending") fail((outcome in FAILURE_COPY ? outcome : "failed") as Failure);
      } catch { /* the pass check above and the timeout below still decide */ }
    }, POLL_MS);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [step, received, reference]);

  useEffect(() => {
    if (step === "waiting" && now - sentAt >= PROMPT_LIFETIME_MS) {
      received().then((paid) => { if (!paid) fail("timeout"); });
    }
  }, [step, now, sentAt, received]);

  const send = async () => {
    if (!/^[71]\d{8}$/.test(digits)) {
      setError("Enter a Safaricom number, for example 712 345 678.");
      return;
    }
    setError("");
    setSending(true);
    try {
      const held = await findPass();
      if (kind === "pass" && held && daysLeft(held.end_date) > RENEW_WINDOW_DAYS) {
        setError(`You already have an active pass for this semester. You can renew it in its last ${RENEW_WINDOW_DAYS} days.`);
        return;
      }
      renewedFrom.current = kind === "pass" && held ? held.end_date : null;
      if (kind === "ai_upgrade" && held?.ai_access) {
        setError("Your pass already includes the AI features.");
        return;
      }
      const { data: sent, error: fnError } = await supabase.functions.invoke("mpesa-initiate-payment", {
        body: {
          phone_number: `254${digits}`,
          // No amount here: the server decides it.
          ai,
          kind,
          department_id: Number(departmentId),
          year_of_study: Number(year),
          semester_of_study: Number(semester),
        },
      });
      if (fnError) throw fnError;
      const t = Date.now();
      setReference(sent?.checkout_request_id ?? "");
      setSentAt(t); setNow(t); setNote("");
      setStep("waiting");
    } catch (e) {
      console.error("Payment failed", e);
      fail("request");
    } finally {
      setSending(false);
    }
  };

  const close = () => onOpenChange(false);
  const phoneDisplay = `0${groupDigits(digits)}`;
  const course = courseLabel;

  if (!open) return null;

  const body: Record<Step, JSX.Element> = {
    phone: (
      <>
        <Title>Payment</Title>
        <div className="mt-8 flex flex-col">
          <DetailRow label="Plan" value={kind === "ai_upgrade" ? "AI features add-on" : ai ? "Semester pass + AI features" : "Semester pass"} />
          <DetailRow label="Course" value={course} />
          <DetailRow label="Access until" value={accessUntil} />
          <DetailRow total label="Total" value={price} />
        </div>
        <label className="mt-8 flex flex-col gap-2">
          <span className="text-sm font-medium">Phone number</span>
          <span
            className={`flex h-[52px] items-center gap-3 rounded-[10px] bg-field px-4 transition-shadow duration-300 ${
              error ? "ring-2 ring-danger" : "focus-within:ring-2 focus-within:ring-brand-solid"
            }`}
          >
            <span className="font-geist-mono text-sm text-ink-muted">+254</span>
            <span className="h-5 w-px bg-line-strong" />
            <input
              type="tel" inputMode="numeric" autoComplete="tel-national" autoFocus
              placeholder="712 345 678"
              value={groupDigits(digits)}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "").replace(/^254/, "").replace(/^0/, "").slice(0, 9);
                setDigits(d);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && send()}
              className="min-w-0 flex-1 bg-transparent font-geist-mono text-base outline-none placeholder:text-ink-subtle"
            />
          </span>
          {error && (
            <span role="alert" className="flex items-start gap-1.5 text-sm text-danger">
              <WarningCircle size={16} className="mt-0.5 shrink-0" /> {error}
            </span>
          )}
        </label>
        <PayBottomBar>
          <InkButton className="w-full" disabled={sending} onClick={send}>
            {sending ? "Sending…" : "Send payment prompt"}
          </InkButton>
        </PayBottomBar>
      </>
    ),

    waiting: (
      <>
        <Title sub={`We sent a prompt to ${phoneDisplay}. Enter your PIN to pay ${price}.`}>Check your phone</Title>
        <div className="mt-8 flex flex-col gap-1">
          <span className="font-geist-mono text-3xl font-medium tabular-nums" aria-live="off">
            {mmss(sentAt + PROMPT_LIFETIME_MS - now)}
          </span>
          <span className="text-sm text-ink-muted">until the prompt expires</span>
        </div>
        <ol className="mt-8 flex flex-col gap-5 border-t border-line pt-8">
          <li className="flex gap-3">
            <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-positive" />
            <div>
              <p className="text-base">Prompt sent</p>
              <p className="font-geist-mono text-sm text-ink-muted">Sent at {clock(sentAt)}</p>
            </div>
          </li>
          <li className="flex gap-3">
            <CircleHalf size={20} weight="fill" className="mt-0.5 shrink-0 text-brand" />
            <p className="text-base font-medium">Waiting for your PIN</p>
          </li>
          <li className="flex gap-3 text-ink-muted">
            <Circle size={20} className="mt-0.5 shrink-0" />
            <p className="text-base">Confirming your payment</p>
          </li>
        </ol>
        <p className="mt-8 text-sm text-ink-muted">You can leave this page while you wait. If you pay, your pass appears under Subscriptions.</p>
        <PayBottomBar>
          {now - sentAt >= RESEND_AFTER_MS ? (
            <>
              <p className="text-center text-sm text-ink-muted">If the first prompt is still on your phone, a second one may arrive. Pay only once.</p>
              <QuietButton disabled={sending} onClick={send} className="h-auto py-1 text-sm text-ink-muted">Resend prompt</QuietButton>
            </>
          ) : (
            <p className="text-sm text-ink-muted">Resend prompt in {mmss(sentAt + RESEND_AFTER_MS - now)}</p>
          )}
          <QuietButton onClick={() => setStep("phone")}>Use a different number</QuietButton>
        </PayBottomBar>
      </>
    ),

    received: (
      <>
        <Title
          icon={<CheckCircle size={32} weight="fill" className="text-positive" />}
          sub={kind === "ai_upgrade" ? `AI features are on your pass until ${receipt?.until ?? accessUntil}.` : `Your semester pass is active until ${receipt?.until ?? accessUntil}.`}
        >
          Payment received
        </Title>
        <div className="mt-8 flex flex-col">
          {kind === "pass" && <DetailRow label="Receipt" value={<span className="font-geist-mono">{receipt?.ref}</span>} />}
          <DetailRow label="Amount" value={price} />
          <DetailRow label="Paid from" value={<span className="font-geist-mono">{phoneDisplay}</span>} />
          <DetailRow label="Course" value={course} />
        </div>
        <p className="mt-6 text-sm text-ink-muted">You can find this receipt later under Subscriptions.</p>
        <PayBottomBar>
          <InkButton className="w-full" onClick={() => { onPaymentSuccess?.(); close(); }}>Start studying</InkButton>
        </PayBottomBar>
      </>
    ),

    failed: (
      <>
        <Title icon={<WarningCircle size={28} className="text-warning" />} sub={FAILURE_COPY[failure].body}>{FAILURE_COPY[failure].title}</Title>
        {failure !== "paid_not_activated" && (
        <div className="mt-8 flex items-center gap-4 border-t border-line pt-6">
          <p className="flex-1 text-base font-medium">Got a confirmation SMS anyway?</p>
          <QuietButton
            tone="soft"
            onClick={async () => {
              if (!(await received())) setNote("No payment found yet. Payments can take a minute, so try again shortly.");
            }}
          >
            Check again
          </QuietButton>
        </div>
        )}
        {note && <p role="status" className="mt-3 text-sm text-ink-muted">{note}</p>}
        <div className="mt-6 rounded-2xl bg-field p-4 text-sm text-ink-soft">
          <p>If you were charged, contact support at <a className="font-medium text-brand" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            {reference ? <> and quote this reference: <span className="font-geist-mono [overflow-wrap:anywhere]">{reference}</span>.</> : <> with your M-Pesa confirmation message.</>}
          </p>
        </div>
        {failure !== "paid_not_activated" && (
          <PayBottomBar>
            {(failure === "timeout" || failure === "failed") && (
              <p className="text-center text-sm text-ink-muted">If the first prompt is still on your phone, a second one may arrive. Pay only once.</p>
            )}
            <InkButton className="w-full" disabled={sending} onClick={send}>
              {sending ? "Sending…" : "Resend prompt"}
            </InkButton>
            <QuietButton onClick={() => setStep("phone")}>Use a different number</QuietButton>
          </PayBottomBar>
        )}
      </>
    ),
  };

  // Rendered by PricingGate in place of the plan screen, so it is a step of the page, not an overlay.
  return (
    <PayPage>
      <PayTopBar onHome={step === "received" ? undefined : close} trail={step === "received" ? [] : [{ label: "Choose semester", onClick: close }]} />
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="px-5 pb-44 pt-6 md:mx-auto md:max-w-[480px] md:px-0 md:pb-24 md:pt-8"
        >
          {body[step]}
        </motion.div>
      </AnimatePresence>
    </PayPage>
  );
};

export default MpesaPaymentDialog;
