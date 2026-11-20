// Forecasts which syllabus topics the next CAT or exam of a unit is likely to cover, from its past papers.
//
// 1. Each past paper is analysed once with ChatPDF (its questions, marks, type, and the syllabus topic each tests) and the
//    result is saved in paper_analysis. This is the only step that costs ChatPDF credit.
// 2. The forecast itself is plain arithmetic over those saved analyses (no AI), so it is explainable and free to repeat.
//    It is cached per unit and kind and recomputed only when the set of analysed papers changes.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { HttpError, adminClient, authorizeUnit, chatPdfKey, corsFor, reply, requireAi } from "../_shared/guard.ts";
import { addSource, ask, extractJson } from "../_shared/chatpdf.ts";
import { computeForecast, type Analysis, type Kind, type Paper, type Question, type Topic } from "./forecast.ts";

type Admin = ReturnType<typeof adminClient>;

// Bump when the forecast arithmetic or wording changes, so cached forecasts are recomputed.
const FORECAST_VERSION = 2;
const STALE_MS = 5 * 60 * 1000;      // a "running" analysis older than this is assumed dead and may be retaken
const RETRY_MS = 10 * 60 * 1000;     // a failed analysis is retried only after this long, so a bad PDF cannot burn credit on every request
const MAX_PER_REQUEST = 2;           // papers analysed per request, to stay inside the function time limit

const analysisPrompt = (unitName: string, topics: Topic[]) => `
  You are reading an exam paper for the unit "${unitName}". List every question and sub-question, and match each one to
  the single syllabus topic it tests.

  Syllabus topics (id: title):
  ${topics.map((t) => `${t.id}: ${t.title}`).join("\n  ")}

  Output RAW JSON only. No markdown. No code fences. No explanation. Use exactly this structure:
  {"questions":[{"number":"1a","text":"first 160 characters of the question on one line","marks":6,"type":"theory","topic_id":3}]}

  RULES:
  - Include ALL main questions AND sub-questions (a, b, c / i, ii, iii). "number" is a string.
  - "marks" is a number: the marks shown for that part, or 0 if none are shown.
  - "type" is one of: calculation, theory, definition, essay, practical.
  - "topic_id" must be one of the ids above, or null if no topic fits.
  - "text" is one line with straight double quotes only, no newlines and no pipe characters.
  Output begins with { and ends with } and nothing else.
`;

// ── Step 1: analyse a paper ──────────────────────────────────────────────────

const analysePaper = async (admin: Admin, paper: Paper, unitName: string, topics: Topic[], apiKey: string) => {
  try {
    const sourceId = await addSource(paper.url, apiKey);
    const prompt = analysisPrompt(unitName, topics);
    let parsed: { questions?: Question[] } | null = null;
    for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
      const raw = await ask(sourceId, apiKey, attempt === 0 ? prompt : `${prompt}\n  Your last reply was not valid JSON. Reply with ONLY the JSON object.`);
      try { parsed = extractJson<{ questions?: Question[] }>(raw); } catch { /* retry once */ }
    }
    const ids = new Set(topics.map((t) => t.id));
    const questions = (parsed?.questions ?? []).map((q) => ({
      number: String(q.number ?? ""),
      text: String(q.text ?? "").slice(0, 200),
      marks: Number(q.marks) || 0,
      type: String(q.type ?? "theory"),
      topic_id: q.topic_id != null && ids.has(Number(q.topic_id)) ? Number(q.topic_id) : null,
    }));
    if (questions.length === 0) throw new Error("no questions found in the paper");
    await admin.from("paper_analysis").update({
      status: "done", questions, total_marks: questions.reduce((n, q) => n + q.marks, 0),
      error: null, analyzed_at: new Date().toISOString(),
    }).eq("resource_id", paper.id);
  } catch (err) {
    await admin.from("paper_analysis").update({ status: "failed", error: String((err as Error).message ?? err).slice(0, 500) }).eq("resource_id", paper.id);
  }
};

/** Takes the claim to analyse a paper, unless someone else already has it. Returns true when we hold it. */
const claim = async (admin: Admin, resourceId: number, existing?: { status: string; started_at: string }) => {
  if (!existing) {
    const { error } = await admin.from("paper_analysis").insert({ resource_id: resourceId, status: "running" });
    return !error; // a unique violation means another request claimed it first
  }
  const age = Date.now() - new Date(existing.started_at).getTime();
  if ((existing.status === "running" && age > STALE_MS) || (existing.status === "failed" && age > RETRY_MS)) {
    await admin.from("paper_analysis").update({ status: "running", started_at: new Date().toISOString(), error: null }).eq("resource_id", resourceId);
    return true;
  }
  return false;
};

const hashOf = async (text: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))].map((b) => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsFor(req) });

  try {
    const { unitId, kind } = await req.json();
    if (!unitId || !["cat1", "cat2", "exam"].includes(kind)) throw new HttpError(400, "Missing required input");
    const target = kind as Kind;

    const { unit, ai } = await authorizeUnit(req, Number(unitId));
    requireAi(ai);
    const admin = adminClient();

    const { data: topicRows } = await admin.from("topics").select("id, title, position").eq("unit_id", unit.id).order("position");
    const topics = (topicRows ?? []) as Topic[];
    if (topics.length === 0) return reply(req, { status: "no_syllabus" });

    const { data: paperRows } = await admin
      .from("resources")
      .select("id, paper_kind, academic_year, public_access_url")
      .eq("unit_id", unit.id)
      .in("resource_type_id", [2, 3])
      .not("paper_kind", "is", null)
      .not("academic_year", "is", null);
    const papers: Paper[] = (paperRows ?? []).map((r) => ({ id: r.id, kind: r.paper_kind, year: r.academic_year, url: r.public_access_url }));

    // Not enough history to say anything useful: an exam needs two past exams; a CAT needs one CAT and one exam.
    const exams = papers.filter((p) => p.kind === "exam" || p.kind === "supplementary").length;
    const cats = papers.filter((p) => p.kind === "cat1" || p.kind === "cat2").length;
    const enough = target === "exam" ? exams >= 2 : cats >= 1 && exams >= 1;
    if (!enough) {
      return reply(req, {
        status: "not_enough",
        have: { exams, cats },
        need: target === "exam" ? "at least two past exams" : "at least one past CAT and one past exam",
      });
    }

    // Analyse any papers that have not been analysed yet (a couple per request); the app asks again until none are left.
    const { data: existingRows } = await admin.from("paper_analysis").select("resource_id, status, started_at").in("resource_id", papers.map((p) => p.id));
    const existing = new Map((existingRows ?? []).map((r) => [r.resource_id as number, r as { status: string; started_at: string }]));
    const todo = papers.filter((p) => existing.get(p.id)?.status !== "done");
    const mine: Paper[] = [];
    for (const p of todo) {
      if (mine.length >= MAX_PER_REQUEST) break;
      if (await claim(admin, p.id, existing.get(p.id))) mine.push(p);
    }
    if (mine.length) {
      const apiKey = chatPdfKey();
      await Promise.all(mine.map((p) => analysePaper(admin, p, unit.name, topics, apiKey)));
    }

    const { data: doneRows } = await admin.from("paper_analysis").select("resource_id, status, questions, total_marks").in("resource_id", papers.map((p) => p.id));
    const rows = doneRows ?? [];
    const analyses = new Map<number, Analysis>(
      rows.filter((r) => r.status === "done").map((r) => [r.resource_id as number, { resource_id: r.resource_id, questions: r.questions as Question[], total_marks: r.total_marks as number }]),
    );
    const failed = rows.filter((r) => r.status === "failed").length;
    const pending = papers.length - analyses.size - failed;
    if (pending > 0) return reply(req, { status: "preparing", pending, total: papers.length });

    // Failed papers are left out; if that leaves too little, say so.
    const usable = papers.filter((p) => analyses.has(p.id));
    const usableExams = usable.filter((p) => p.kind === "exam" || p.kind === "supplementary").length;
    const usableCats = usable.filter((p) => p.kind === "cat1" || p.kind === "cat2").length;
    if (target === "exam" ? usableExams < 2 : usableCats < 1 || usableExams < 1) {
      return reply(req, { status: "not_enough", have: { exams: usableExams, cats: usableCats }, need: "more readable past papers", skipped: failed });
    }

    const hash = await hashOf(`v${FORECAST_VERSION}|${target}|${[...analyses.keys()].sort().join(",")}|${topics.map((t) => t.id).join(",")}`);
    const { data: cached } = await admin.from("unit_forecasts").select("source_hash, forecast, created_at").eq("unit_id", unit.id).eq("kind", target).maybeSingle();
    if (cached && cached.source_hash === hash) {
      return reply(req, { status: "ready", forecast: cached.forecast, generated_at: cached.created_at, skipped: failed });
    }

    const forecast = computeForecast(target, topics, usable, analyses);
    const now = new Date().toISOString();
    await admin.from("unit_forecasts").upsert({ unit_id: unit.id, kind: target, source_hash: hash, forecast, created_at: now }, { onConflict: "unit_id,kind" });
    return reply(req, { status: "ready", forecast, generated_at: now, skipped: failed });
  } catch (err) {
    if (err instanceof HttpError) return reply(req, { error: err.message, detail: err.detail }, err.status);
    return reply(req, { error: (err as Error)?.message ?? "Unexpected error" }, 500);
  }
});
