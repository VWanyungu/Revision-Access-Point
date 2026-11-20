// Marks a student's practice-paper attempt with the AI model.
//
// The student's answers (and photos of their working) are compared with the model answers saved for the paper. Marking is done a
// few questions per call and the app keeps asking until it is complete, so a slow model cannot run past the function's limits.
// An attempt is marked once: a finished marking is simply returned again. Marks are written here (service role) and nowhere else.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { HttpError, adminClient, authorizeUnit, corsFor, reply, requireAi } from "../_shared/guard.ts";
import { generateJson } from "../_shared/ai.ts";

const BATCH = 3;
const MAX_PHOTOS = 3;

interface Q { number: string; text: string; marks: number; topic_id: number | null }
interface Marked { number: string; text: string; marks: number; awarded: number; status: "correct" | "partial" | "wrong" | "blank"; feedback: string; topic_id: number | null; topic: string | null }

const markSchema = {
  type: "OBJECT",
  properties: { marks_awarded: { type: "NUMBER" }, feedback: { type: "STRING" } },
  required: ["marks_awarded", "feedback"],
};

const bytesToBase64 = (bytes: Uint8Array) => {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsFor(req) });

  try {
    const { unitId, kind, serial } = await req.json();
    if (!unitId || !["cat1", "cat2", "exam"].includes(kind) || !Number.isInteger(serial)) throw new HttpError(400, "Missing required input");
    const { user, ai } = await authorizeUnit(req, unitId);
    requireAi(ai);
    const admin = adminClient();

    const { data: att } = await admin.from("practice_attempts").select("*")
      .eq("user_uuid", user.id).eq("unit_id", unitId).eq("kind", kind).eq("paper_serial", serial).maybeSingle();
    if (!att) throw new HttpError(404, "No attempt to mark");
    if (att.status === "marked") return reply(req, { status: "marked", result: att.result });
    if (!att.model_answers) throw new HttpError(409, "The model answers are still being written. Try again shortly.");

    const questions = (att.paper.questions ?? []) as Q[];
    const done = ((att.result?.questions ?? []) as Marked[]);
    if (att.status === "draft" || att.status === "failed") {
      await admin.from("practice_attempts").update({ status: "marking", submitted_at: att.submitted_at ?? new Date().toISOString(), error: null })
        .eq("user_uuid", user.id).eq("unit_id", unitId).eq("kind", kind).eq("paper_serial", serial);
    }

    const { data: topicRows } = await admin.from("topics").select("id, title").eq("unit_id", unitId);
    const topicName = new Map((topicRows ?? []).map((t) => [t.id as number, t.title as string]));
    const modelFor = (n: string) => (att.model_answers.questions ?? []).find((a: { question_number: string }) => a.question_number === n);
    const answers = (att.answers ?? {}) as Record<string, { text?: string; files?: string[] }>;

    const batch = questions.slice(done.length, done.length + BATCH);
    const marked = await Promise.all(batch.map(async (q): Promise<Marked> => {
      const given = answers[q.number] ?? {};
      const text = (given.text ?? "").trim();
      const files = (given.files ?? []).slice(0, MAX_PHOTOS).filter((f) => f.startsWith(`${user.id}/`));
      const base = { number: q.number, text: q.text, marks: q.marks, topic_id: q.topic_id, topic: q.topic_id ? topicName.get(q.topic_id) ?? null : null };
      if (!text && files.length === 0) return { ...base, awarded: 0, status: "blank", feedback: "No answer was given." };

      const images: { mime: string; data: string }[] = [];
      for (const path of files) {
        const { data } = await admin.storage.from("practice-attachments").download(path);
        if (data) images.push({ mime: data.type || "image/jpeg", data: bytesToBase64(new Uint8Array(await data.arrayBuffer())) });
      }
      const m = modelFor(q.number);
      const scheme = (m?.marks_allocation?.breakdown ?? []).map((b: { step: string; marks: string }) => `- ${b.step} (${b.marks})`).join("\n");
      const prompt = `You are a fair university lecturer marking one answer from a student's practice paper.

Question (${q.marks} marks):
${q.text}

Model answer:
${m?.answer?.final_answer ?? "(none)"}

Marking scheme:
${scheme || "(none)"}

Key points: ${(m?.key_points ?? []).join("; ") || "(none)"}

The student's written answer:
${text || "(nothing typed)"}
${images.length ? `\nThe student also attached ${images.length} photo(s) of their working. Read them as part of the answer.` : ""}

Award "marks_awarded" from 0 to ${q.marks}, in whole marks, following the marking scheme. Give partial credit for correct steps and correct method. "feedback" is two or three sentences addressed to the student: what earned marks, what was missing or wrong, and what to revise. Plain text; maths inside $...$.`;

      const raw = await generateJson<{ marks_awarded?: number; feedback?: string }>({ prompt, schema: markSchema, temperature: 0.2, images });
      const awarded = Math.min(q.marks, Math.max(0, Math.round(Number(raw.marks_awarded) || 0)));
      return { ...base, awarded, status: awarded >= q.marks ? "correct" : awarded > 0 ? "partial" : "wrong", feedback: String(raw.feedback ?? "").trim() };
    }));

    const all = [...done, ...marked];
    const complete = all.length >= questions.length;
    const total = questions.reduce((n, q) => n + q.marks, 0);
    const score = all.reduce((n, q) => n + q.awarded, 0);

    // Topics to revise: any topic where the student earned under 60% of its marks.
    const byTopic = new Map<string, { topic: string; awarded: number; marks: number }>();
    for (const q of all) {
      if (!q.topic) continue;
      const t = byTopic.get(q.topic) ?? { topic: q.topic, awarded: 0, marks: 0 };
      t.awarded += q.awarded; t.marks += q.marks;
      byTopic.set(q.topic, t);
    }
    const weak = [...byTopic.values()].filter((t) => t.awarded / t.marks < 0.6).sort((a, b) => a.awarded / a.marks - b.awarded / b.marks);

    const result = { questions: all, score, total, percent: total ? Math.round((score / total) * 100) : 0, weak_topics: weak, ...(complete ? {} : { partial: true }) };
    const { error } = await admin.from("practice_attempts")
      .update({ result, status: complete ? "marked" : "marking", marked_at: complete ? new Date().toISOString() : null })
      .eq("user_uuid", user.id).eq("unit_id", unitId).eq("kind", kind).eq("paper_serial", serial);
    if (error) throw new HttpError(500, "Could not save the marks", error.message);

    return reply(req, { status: complete ? "marked" : "marking", done: all.length, total: questions.length, ...(complete ? { result } : {}) });
  } catch (err) {
    if (err instanceof HttpError) return reply(req, { error: err.message, detail: err.detail }, err.status);
    console.error("mark-paper:", err);
    return reply(req, { error: "Something went wrong while marking" }, 500);
  }
});
