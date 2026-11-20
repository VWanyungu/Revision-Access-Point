import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { getInstitutions, getSchools, getDepartmentsBySchoolId } from "@/database/utils";
import MpesaPaymentDialog from "@/components/payment/MpesaPaymentDialog";
import AiAddOn from "@/components/pay/AiAddOn";
import { ksh, usePrices } from "@/lib/pricing";
import { useSemesterPreview } from "@/components/pay/useSemesterPreview";
import {
  EASE, PayPage, PayHeader, PayBottomBar, Title, InkButton, QuietButton, SelectField, accessUntil, formatDate,
} from "@/components/pay/PayKit";

interface PricingGateProps {
  onLogout: () => void;
  onSubscribed?: () => void;
  onCancel?: () => void;
  /** Renewing: the pass being renewed, so the course is already chosen. Ids are strings, as the selects use. */
  initial?: { institution: string; school: string; department: string; year: string; semester: string };
}

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL as string | undefined;
const yearOptions = ["1", "2", "3", "4", "5", "6"].map((y) => ({ value: y, label: `Year ${y}` }));
const semesterOptions = ["1", "2", "3"].map((s) => ({ value: s, label: `Semester ${s}` }));

const Stat = ({ value, children }: { value: number | null; children: React.ReactNode }) => (
  <div className="flex flex-1 flex-col gap-1">
    <span className="font-literata text-xl md:text-2xl">
      {value ?? "–"}
    </span>
    <span className="text-sm text-ink-muted">{children}</span>
  </div>
);

const PricingGate = ({ onLogout, onSubscribed, onCancel, initial }: PricingGateProps) => {
  const { signOut } = useAuth();
  const reduce = useReducedMotion();
  const [paymentOpen, setPaymentOpen] = useState(false);
  // The AI add-on is optional; the price comes from the server, never from the browser.
  const [withAi, setWithAi] = useState(false);
  const { data: prices, isError: pricesFailed } = usePrices();
  const total = prices ? prices.access + (withAi ? prices.ai : 0) : undefined;
  const PRICE = total ? ksh(total) : "…";
  const [institution, setInstitution] = useState(initial?.institution ?? "");
  const [school, setSchool] = useState(initial?.school ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [year, setYear] = useState(initial?.year ?? "");
  const [semester, setSemester] = useState(initial?.semester ?? "");

  const { data: institutions = [] } = useQuery({ queryKey: ["institutions"], queryFn: async () => (await getInstitutions()) ?? [] });
  // Nothing is preselected: a student picks their own institution, school and department.
  const institutionId = institution;
  const { data: schools = [] } = useQuery({
    queryKey: ["schools", institutionId],
    queryFn: async () => (await getSchools(institutionId)) ?? [],
    enabled: !!institutionId,
  });
  const schoolId = school;
  const { data: departments = [] } = useQuery({
    queryKey: ["departments", schoolId],
    queryFn: async () => (await getDepartmentsBySchoolId(schoolId)) ?? [],
    enabled: !!schoolId,
  });
  const preview = useSemesterPreview(department, year, semester);

  const departmentName = departments.find((d: any) => String(d.id) === department)?.name ?? "";
  const courseLong = `${departmentName}, Year ${year}, Semester ${semester}`;
  const courseShort = `${departmentName}, Y${year} S${semester}`;
  const until = formatDate(accessUntil());

  const picked = !!(department && year && semester);
  const data = preview.data;
  const totalFiles = data ? data.totals.notes + data.totals.papers + data.totals.tutorials : 0;
  const nothingYet = picked && !!data && data.countsKnown && totalFiles === 0;
  const canPay = picked && !!data && !nothingYet && !!prices;

  const handleLogout = async () => {
    localStorage.removeItem("user");
    await signOut();
    onLogout();
  };

  const rise = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, ease: EASE, delay: Math.min(i, 10) * 0.04 },
        };

  const stack = (data?.units ?? []).map((u) => u.name);
  const sentence =
    stack.length > 3 ? `${stack.slice(0, 3).join(", ")} and ${stack.length - 3} more units.` : stack.join(", ");

  // Payment replaces the plan screen in place; going back returns to it.
  if (paymentOpen && picked) {
    return (
      <MpesaPaymentDialog
        open
        onOpenChange={setPaymentOpen}
        price={PRICE}
        ai={withAi}
        departmentId={department}
        year={year}
        semester={semester}
        courseLabel={courseShort}
        accessUntil={until}
        onPaymentSuccess={() => onSubscribed?.()}
      />
    );
  }

  return (
    <PayPage>
      {!onCancel && <PayHeader action={{ label: "Log out", onClick: handleLogout }} />}

      <div className={`px-5 pb-44 md:flex md:px-12 md:pb-24 xl:px-36 ${onCancel ? "pt-10 md:pt-14" : "pt-8 md:pt-16"}`}>
        {/* Choose */}
        <section className="flex flex-col gap-8 md:w-[504px] md:shrink-0 md:pr-16">
          <Title subDesktopOnly sub="Choose the course you are studying. Everything included appears on the right before you pay.">
            {onCancel ? "New subscription" : "Pick your semester"}
          </Title>

          <div className="flex flex-col gap-5">
            <SelectField
              label="Institution" placeholder="Select your institution" value={institutionId} onChange={(v) => { setInstitution(v); setSchool(""); setDepartment(""); }}
              options={institutions.map((i: any) => ({ value: String(i.id), label: i.name }))}
            />
            <SelectField
              label="School" placeholder={institutionId ? "Select your school" : "Choose an institution first"} value={schoolId} onChange={(v) => { setSchool(v); setDepartment(""); }}
              options={schools.map((s: any) => ({ value: String(s.id), label: s.name }))}
            />
            <SelectField
              label="Department" value={department} onChange={setDepartment} placeholder={schoolId ? "Select your department" : "Choose a school first"}
              options={departments.map((d: any) => ({ value: String(d.id), label: d.name }))}
            />
            <div className="flex gap-3 md:gap-4">
              <SelectField label="Year" value={year} onChange={setYear} options={yearOptions} placeholder="Year" />
              <SelectField label="Semester" value={semester} onChange={setSemester} options={semesterOptions} placeholder="Semester" />
            </div>
          </div>

          <AiAddOn checked={withAi} onChange={setWithAi} price={prices?.ai} />
          {pricesFailed && <p className="text-sm text-danger" role="alert">Prices could not be loaded. Please refresh the page.</p>}

          <div className="hidden flex-col gap-4 border-t border-line pt-8 md:flex">
            <div className="flex items-center justify-between">
              <span className="font-literata text-lg font-medium">Semester pass</span>
              <span className="font-literata text-xl">{prices ? ksh(prices.access) : "…"}</span>
            </div>
            {withAi && prices && (
              <div className="flex items-center justify-between">
                <span className="text-base">AI features</span>
                <span className="text-base tabular-nums">+ {ksh(prices.ai)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="text-base font-medium">Total</span>
              <span className="font-literata text-xl">{PRICE}</span>
            </div>
            <p className="text-sm text-ink-muted">Access until {until}.{withAi ? "" : " Reading and viewing only; you can add AI features later."}</p>
            <InkButton arrow disabled={!canPay} onClick={() => setPaymentOpen(true)}>Continue to payment</InkButton>
            {onCancel && <QuietButton onClick={onCancel}>Cancel</QuietButton>}
          </div>
        </section>

        {/* Included this semester */}
        <section className="mt-8 flex flex-col gap-8 border-t border-line pt-8 md:mt-0 md:min-w-0 md:flex-1 md:border-l md:border-t-0 md:pl-16 md:pt-0">
          {!picked ? (
            <p className="text-base text-ink-muted">
              Pick a department, year and semester to see the units and files you would get.
            </p>
          ) : preview.isLoading ? (
            <div className="flex flex-col gap-3" role="status" aria-label="Loading">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-field" />)}
            </div>
          ) : nothingYet || (data && data.units.length === 0) ? (
            <div className="flex flex-col gap-3">
              <h2 className="font-literata text-xl">Nothing uploaded for this semester yet</h2>
              <p className="text-base text-ink-muted">
                We have no notes or papers for {courseLong} so far. Payment is turned off until there is something to
                study.{SUPPORT_EMAIL ? " We can email you when the first files arrive." : ""}
              </p>
              {SUPPORT_EMAIL && (
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Tell me when ${courseLong} is ready`)}`}
                  className="mt-1 flex h-11 w-fit items-center gap-2 rounded-full bg-field px-5 text-base font-medium transition-colors duration-500 hover:bg-field-strong"
                >
                  <EnvelopeSimple size={18} /> Email me when it is ready
                </a>
              )}
            </div>
          ) : (
            data && (
              <>
                <div className="flex flex-col gap-1">
                  <h2 className="font-literata text-lg font-medium md:text-xl md:font-normal">
                    Included this semester
                  </h2>
                  <p className="text-sm text-ink-muted">{courseLong}</p>
                </div>

                <div className="flex gap-4">
                  <Stat value={data.units.length}>units</Stat>
                  <Stat value={data.countsKnown ? data.totals.notes : null}>
                    <span className="md:hidden">notes</span><span className="hidden md:inline">lecture notes</span>
                  </Stat>
                  <Stat value={data.countsKnown ? data.totals.papers : null}>
                    <span className="md:hidden">papers</span><span className="hidden md:inline">CATs and exams</span>
                  </Stat>
                  <Stat value={data.countsKnown ? data.totals.tutorials : null}>tutorials</Stat>
                </div>

                <p className="text-base md:hidden">{sentence}</p>

                <div className="hidden border-t border-line pt-4 md:block">
                  {data.units.map((u, i) => {
                    const empty = data.countsKnown && !u.notes && !u.papers && !u.tutorials;
                    const counts = !data.countsKnown
                      ? ""
                      : empty
                        ? "No files yet"
                        : [
                            u.notes ? `${u.notes} ${u.notes === 1 ? "note" : "notes"}` : "",
                            u.papers ? `${u.papers} ${u.papers === 1 ? "paper" : "papers"}` : "",
                            u.tutorials ? `${u.tutorials} ${u.tutorials === 1 ? "tutorial" : "tutorials"}` : "",
                          ].filter(Boolean).join(", ");
                    return (
                      <motion.div key={u.id} {...rise(i)} className="flex items-center gap-4 py-2">
                        <span className={`w-[72px] shrink-0 font-geist-mono text-sm text-ink-muted`}>{u.code}</span>
                        <span className={`flex-1 text-base ${empty ? "text-ink-muted" : "font-medium"}`}>{u.name}</span>
                        <span className="shrink-0 text-sm tabular-nums text-ink-muted">{counts}</span>
                      </motion.div>
                    );
                  })}
                </div>

                <p className="text-sm text-ink-muted">
                  Counts update as class reps upload. A unit with no files yet is still listed so you know before you pay.
                </p>
              </>
            )
          )}
        </section>
      </div>

      <PayBottomBar className="md:hidden">
        <div className="flex w-full items-center gap-3">
          <span className="font-literata text-lg font-medium">{PRICE}</span>
          {onCancel && <QuietButton className="ml-auto" onClick={onCancel}>Cancel</QuietButton>}
          <InkButton arrow className={onCancel ? "" : "flex-1"} disabled={!canPay} onClick={() => setPaymentOpen(true)}>
            Continue
          </InkButton>
        </div>
      </PayBottomBar>

    </PayPage>
  );
};

export default PricingGate;
