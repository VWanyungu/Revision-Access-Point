import { supabase } from "./supabase";

export interface QuizScore { best: number; total: number; attempts: number; last: string }
export interface Progress {
  /** resource id -> last opened (ISO) */
  opens: Record<number, string>;
  /** resource id -> aggregated quiz attempts */
  scores: Record<number, QuizScore>;
}

/** Everything the unit page needs about one user's progress (tables: resource_opens, quiz_attempts). */
export const getProgress = async (userId: string): Promise<Progress> => {
  const [opens, attempts] = await Promise.all([
    supabase.from("resource_opens").select("resource_id, last_opened_at").eq("user_uuid", userId),
    supabase.from("quiz_attempts").select("resource_id, correct, total, created_at").eq("user_uuid", userId),
  ]);
  if (opens.error) throw opens.error;
  if (attempts.error) throw attempts.error;

  const scores: Record<number, QuizScore> = {};
  for (const a of attempts.data ?? []) {
    const s = scores[a.resource_id];
    const better = !s || a.correct / a.total > s.best / s.total;
    scores[a.resource_id] = {
      best: better ? a.correct : s.best,
      total: better ? a.total : s.total,
      attempts: (s?.attempts ?? 0) + 1,
      last: !s || a.created_at > s.last ? a.created_at : s.last,
    };
  }
  return { opens: Object.fromEntries((opens.data ?? []).map((o) => [o.resource_id, o.last_opened_at])), scores };
};

export interface TopicRow { id: number; title: string; description: string | null; position: number }

/** A unit's syllabus. Optional: with no rows (or before the topics migration), each note is shown as its own topic. */
export const getTopics = async (unitId: number): Promise<TopicRow[]> => {
  const { data, error } = await supabase.from("topics").select("id, title, description, position").eq("unit_id", unitId).order("position");
  if (error) return [];
  return data ?? [];
};

export const recordOpen = async (userId: string, resourceId: number) => {
  const { error } = await supabase.from("resource_opens")
    .upsert({ user_uuid: userId, resource_id: resourceId, last_opened_at: new Date().toISOString() }, { onConflict: "user_uuid,resource_id" });
  if (error) throw error;
};

/** Quizzes are started from a file URL, so find the resource it belongs to first. */
export const recordQuiz = async (userId: string, fileUrl: string, correct: number, total: number) => {
  const { data: r, error: findError } = await supabase.from("resources").select("id").eq("public_access_url", fileUrl).limit(1).maybeSingle();
  if (findError) throw findError;
  if (!r) return;
  const { error } = await supabase.from("quiz_attempts").insert({ user_uuid: userId, resource_id: r.id, correct, total });
  if (error) throw error;
};
