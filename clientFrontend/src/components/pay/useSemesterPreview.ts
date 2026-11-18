import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/database/supabase";
import { getUnitsByDepartmentIdYearSemester } from "@/database/utils";

export interface PreviewUnit {
  id: number;
  code: string;
  name: string;
  /** null when counts are unavailable (the preview RPC is not installed). */
  notes: number | null;
  papers: number | null;
  tutorials: number | null;
}

export interface SemesterPreview {
  units: PreviewUnit[];
  countsKnown: boolean;
  totals: { notes: number; papers: number; tutorials: number };
}

const fetchPreview = async (department: string, year: string, semester: string): Promise<SemesterPreview> => {
  const { data, error } = await supabase.rpc("semester_preview", {
    p_department_id: Number(department),
    p_year: Number(year),
    p_semester: Number(semester),
  });

  if (!error && data) {
    const units: PreviewUnit[] = data.map((r: any) => ({
      id: r.unit_id, code: r.code ?? "", name: r.name,
      notes: Number(r.notes), papers: Number(r.papers), tutorials: Number(r.tutorials),
    }));
    return { units, countsKnown: true, totals: sum(units) };
  }

  // RPC missing: still list the units so the screen works, without counts.
  const rows = (await getUnitsByDepartmentIdYearSemester(department, year, semester)) ?? [];
  const units: PreviewUnit[] = rows.map((u: any) => ({
    id: u.id, code: u.code ?? "", name: u.name, notes: null, papers: null, tutorials: null,
  }));
  return { units, countsKnown: false, totals: { notes: 0, papers: 0, tutorials: 0 } };
};

const sum = (units: PreviewUnit[]) =>
  units.reduce(
    (t, u) => ({
      notes: t.notes + (u.notes ?? 0),
      papers: t.papers + (u.papers ?? 0),
      tutorials: t.tutorials + (u.tutorials ?? 0),
    }),
    { notes: 0, papers: 0, tutorials: 0 },
  );

export const useSemesterPreview = (department: string, year: string, semester: string) =>
  useQuery({
    queryKey: ["semester-preview", department, year, semester],
    queryFn: () => fetchPreview(department, year, semester),
    enabled: !!department && !!year && !!semester,
  });
