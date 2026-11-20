import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkle } from "@phosphor-icons/react";
import { supabase } from "@/database/supabase";
import { useAuth } from "@/context/AuthContext";
import MpesaPaymentDialog from "@/components/payment/MpesaPaymentDialog";
import { AI_INCLUDES } from "@/components/pay/AiAddOn";
import { ksh, usePrices } from "@/lib/pricing";
import { PayPage, PayTopBar, Title, InkButton, QuietButton, formatDate } from "@/components/pay/PayKit";

interface Props {
  /** The unit (or the file inside one) the student was trying to use AI on; it says which pass to upgrade. */
  unitId?: number;
  fileUrl?: string;
  /** Or name the pass directly (from the Subscriptions page). */
  pass?: { departmentId: number; year: number; semester: number };
  onBack: () => void;
  onDone: () => void;
}

interface Target { departmentId: number; year: number; semester: number; label: string; until: string; hasAi: boolean }

/** Adds the AI features to the semester pass the student already holds, for the rest of its term. */
const AiUpgradePage = ({ unitId, fileUrl, pass: given, onBack, onDone }: Props) => {
  const { user } = useAuth();
  const { data: prices } = usePrices();
  const [paying, setPaying] = useState(false);

  const { data: target, isLoading } = useQuery({
    queryKey: ["ai-upgrade-target", user?.id, unitId, fileUrl, given?.departmentId, given?.year, given?.semester],
    enabled: !!user,
    queryFn: async (): Promise<Target | null> => {
      let unit: { department_id: number; year_of_study: number; semester_of_study: number; departments: { name?: string } | null } | null = null;
      if (given) {
        const { data: d } = await supabase.from("departments").select("name").eq("id", given.departmentId).maybeSingle();
        unit = { department_id: given.departmentId, year_of_study: given.year, semester_of_study: given.semester, departments: d };
      } else {
        let id = unitId;
        if (!id && fileUrl) {
          const { data: r } = await supabase.from("resources").select("unit_id").eq("public_access_url", fileUrl).limit(1).maybeSingle();
          id = r?.unit_id ?? undefined;
        }
        if (!id) return null;
        const { data } = await supabase.from("units").select("department_id, year_of_study, semester_of_study, departments(name)").eq("id", id).maybeSingle();
        unit = data as typeof unit;
      }
      if (!unit) return null;
      const { data: pass } = await supabase.from("subscriptions").select("end_date, ai_access")
        .eq("user_uuid", user!.id).eq("department_id", unit.department_id).eq("year_of_study", unit.year_of_study)
        .eq("semester_of_study", unit.semester_of_study).gte("end_date", new Date().toISOString().slice(0, 10)).limit(1).maybeSingle();
      if (!pass) return null;
      const dept = (unit.departments as { name?: string } | null)?.name ?? "";
      return {
        departmentId: unit.department_id, year: unit.year_of_study, semester: unit.semester_of_study,
        label: `${dept}, Y${unit.year_of_study} S${unit.semester_of_study}`, until: formatDate(new Date(`${pass.end_date}T00:00:00`)), hasAi: !!pass.ai_access,
      };
    },
  });

  if (paying && target && prices) {
    return (
      <MpesaPaymentDialog
        open onOpenChange={setPaying} kind="ai_upgrade" ai
        price={ksh(prices.ai)} departmentId={String(target.departmentId)} year={String(target.year)} semester={String(target.semester)}
        courseLabel={target.label} accessUntil={target.until} onPaymentSuccess={onDone}
      />
    );
  }

  return (
    <PayPage>
      <PayTopBar current="AI features" trail={[{ label: "Back", onClick: onBack }]} />
      <div className="mx-auto max-w-[560px] px-5 pb-32 pt-24 md:pt-32">
        <Sparkle size={32} weight="light" className="text-brand" />
        <div className="mt-4">
          <Title sub={AI_INCLUDES}>Add AI features to your pass</Title>
        </div>

        {isLoading ? (
          <p className="mt-8 text-base text-ink-muted" role="status">Checking your pass…</p>
        ) : !target ? (
          <p className="mt-8 text-base text-ink-muted">We could not find an active pass for this unit.</p>
        ) : target.hasAi ? (
          <p className="mt-8 text-base text-ink-muted">Your pass already includes the AI features.</p>
        ) : (
          <>
            <div className="mt-8 flex flex-col gap-1 border-t border-line pt-6">
              <span className="font-literata text-2xl">{prices ? ksh(prices.ai) : "…"}</span>
              <span className="text-sm text-ink-muted">One payment. Covers every unit in {target.label} until {target.until}.</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <InkButton arrow disabled={!prices} onClick={() => setPaying(true)}>Continue to payment</InkButton>
              <QuietButton onClick={onBack}>Not now</QuietButton>
            </div>
          </>
        )}
        {!isLoading && (!target || target.hasAi) && <QuietButton className="mt-6" onClick={onBack}>Back</QuietButton>}
      </div>
    </PayPage>
  );
};

export default AiUpgradePage;
