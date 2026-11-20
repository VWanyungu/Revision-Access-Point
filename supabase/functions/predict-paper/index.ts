// Writes a practice paper for a unit's next CAT or exam, from the unit's topic forecast.
//
// The forecast (predict-forecast) says which topics are likely and what the paper usually looks like. This function turns it into
// new questions with the AI model. The paper is saved per student, so reopening it is free and it never changes while they read
// it. A student gets their first paper and two regenerations per unit and kind. When new past papers change the forecast, the
// saved paper is marked outdated and may be refreshed without using up a regeneration.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { HttpError, adminClient, authorizeUnit, corsFor, reply, requireAi } from "../_shared/guard.ts";
import { generateJson } from "../_shared/ai.ts";
import {
  answersSchema, buildAnswersPrompt, buildPrompt, paperSchema, validateAnswers, validatePaper,
  type Forecast, type Kind, type ModelAnswers, type PracticePaper, type Sample,
} from "./paper.ts";

const MAX_GENERATIONS = 3; // the first paper plus two regenerations

type Admin = ReturnType<typeof adminClient>;

/** A couple of past questions per likely topic, newest first, so the new paper is phrased like this unit's lecturers phrase theirs. */
const pastSamples = async (admin: Admin, unitId: number, kind: Kind, forecast: Forecast): Promise<Sample[]> => {
  const { data: papers } = await admin.from("resources").select("id, paper_kind, academic_year").eq("unit_id", unitId).not("paper_kind", "is", null);
  if (!papers?.length) return [];
  const sameKind = (k: string) => (kind === "exam" ? k === "exam" || k === "supplementary" : k === kind);
  const order = [...papers].sort((a, b) =>
    Number(sameKind(b.paper_kind)) - Number(sameKind(a.paper_kind)) || String(b.academic_year).localeCompare(String(a.academic_year)));

  const { data: rows } = await admin.from("paper_analysis").select("resource_id, questions").in("resource_id", order.map((p) => p.id)).eq("status", "done");
  const byPaper = new Map((rows ?? []).map((r) => [r.resource_id as number, (r.questions ?? []) as { text: string; topic_id: number | null }[]]));

  const likely = forecast.topics.filter((t) => t.level === "high" || t.level === "medium").slice(0, 8);
  const samples: Sample[] = [];
  for (const t of likely) {
    let n = 0;
    for (const p of order) {
      for (const q of byPaper.get(p.id) ?? []) {
        if (q.topic_id === t.topic_id && q.text && n < 2) { samples.push({ topic_id: t.topic_id, text: q.text.slice(0, 160) }); n++; }
      }
      if (n >= 2) break;
    }
  }
  return samples;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsFor(req) });

  try {
    const { unitId, kind, action = "get" } = await req.json();
    if (!unitId || !["cat1", "cat2", "exam"].includes(kind)) throw new HttpError(400, "Missing required input");
    const target = kind as Kind;

    const { user, unit, ai } = await authorizeUnit(req, Number(unitId));
    requireAi(ai);
    const admin = adminClient();

    const { data: forecastRow } = await admin.from("unit_forecasts").select("source_hash, forecast").eq("unit_id", unit.id).eq("kind", target).maybeSingle();
    const { data: cached } = await admin
      .from("practice_papers")
      .select("forecast_hash, content, answers, generations, serial, updated_at")
      .eq("user_uuid", user.id).eq("unit_id", unit.id).eq("kind", target)
      .maybeSingle();

    const outdated = !!cached && !!forecastRow && cached.forecast_hash !== forecastRow.source_hash;
    const present = (row: NonNullable<typeof cached>) =>
      reply(req, {
        status: "ready",
        paper: row.content,
        // The model answers are written right after the paper, so they may not be ready yet (null): the app then asks for them.
        answers: row.answers && !(row.answers as { partial?: boolean }).partial ? row.answers : null,
        meta: { generated_at: row.updated_at, generations_left: Math.max(0, MAX_GENERATIONS - row.generations), outdated, serial: row.serial },
      });

    // Opening: show the saved paper if there is one, and never generate.
    if (action === "get") return cached ? present(cached) : reply(req, { status: "none" });

    // A paper needs the forecast first (the Predictions tab asks for it, which analyses the past papers).
    if (!forecastRow) return reply(req, { status: "needs_forecast" });

    // Model answers for the saved paper: written once, in the format used to show a past paper's answers.
    if (action === "answers") {
      if (!cached) throw new HttpError(404, "Write a practice paper first");
      const stored = cached.answers as (ModelAnswers & { partial?: boolean }) | null;
      if (stored && !stored.partial) return present(cached);
      const paper = cached.content as PracticePaper;
      const topicTitle = (id: number | null) => (forecastRow?.forecast as Forecast | undefined)?.topics.find((t) => t.topic_id === id)?.title;
      // Written a few questions per call (the app keeps asking until it is complete), so a slow model cannot run past the function's limits.
      const BATCH = 2; // gemini-3.6-flash needs about 20 s per question
      const have = stored?.questions ?? [];
      const part: PracticePaper = { ...paper, questions: paper.questions.slice(have.length, have.length + BATCH) };
      let next: ModelAnswers;
      try {
        next = validateAnswers(await generateJson<unknown>({ prompt: buildAnswersPrompt(unit.name, part, topicTitle), schema: answersSchema, temperature: 0.4 }), part);
      } catch (err) {
        if (err instanceof HttpError) throw err;
        throw new HttpError(502, "The AI wrote unusable answers. Please try again.", (err as Error).message);
      }
      const questions = [...have, ...next.questions];
      const complete = questions.length >= paper.questions.length;
      const answers = { document_title: paper.title, questions, ...(complete ? {} : { partial: true }) };
      const { error } = await admin.from("practice_papers").update({ answers }).eq("user_uuid", user.id).eq("unit_id", unit.id).eq("kind", target);
      if (error) throw new HttpError(500, "Could not save the answers", error.message);
      // An attempt started before the answers were ready picks them up, so marking has them.
      if (complete) await admin.from("practice_attempts").update({ model_answers: answers })
        .eq("user_uuid", user.id).eq("unit_id", unit.id).eq("kind", target).eq("paper_serial", cached.serial).is("model_answers", null);
      return present({ ...cached, answers });
    }

    // Asking again for a paper that is still current just returns it.
    if (cached && !outdated && action !== "regenerate") return present(cached);
    if (cached && !outdated && cached.generations >= MAX_GENERATIONS) {
      throw new HttpError(429, "You have used your regenerations for this paper");
    }

    const forecast = forecastRow.forecast as Forecast;
    const samples = await pastSamples(admin, unit.id, target, forecast);
    const raw = await generateJson<unknown>({ prompt: buildPrompt(unit.name, target, forecast, samples), schema: paperSchema });

    let paper: PracticePaper;
    try {
      const { data: topicRows } = await admin.from("topics").select("id").eq("unit_id", unit.id);
      paper = validatePaper(raw, target, new Set((topicRows ?? []).map((t) => t.id as number)));
    } catch (err) {
      throw new HttpError(502, "The AI wrote an unusable paper. Please try again.", (err as Error).message);
    }

    // Refreshing an outdated paper is free; a regeneration of a current one, or the first paper, counts.
    const generations = cached ? (outdated ? cached.generations : cached.generations + 1) : 1;
    const now = new Date().toISOString();
    const { error } = await admin.from("practice_papers").upsert(
      {
        user_uuid: user.id, unit_id: unit.id, kind: target, forecast_hash: forecastRow.source_hash, content: paper, answers: null,
        generations, serial: (cached?.serial ?? 0) + 1, updated_at: now,
      },
      { onConflict: "user_uuid,unit_id,kind" },
    );
    if (error) throw new HttpError(500, "Could not save the paper", error.message);

    // The previous paper's attempt keeps its marks but not the student's photos.
    if (cached) {
      const { data: old } = await admin.from("practice_attempts").select("answers")
        .eq("user_uuid", user.id).eq("unit_id", unit.id).eq("kind", target).eq("paper_serial", cached.serial).maybeSingle();
      const paths = Object.values((old?.answers ?? {}) as Record<string, { files?: string[] }>).flatMap((a) => a.files ?? []).filter((p) => p.startsWith(`${user.id}/`));
      if (paths.length) {
        await admin.storage.from("practice-attachments").remove(paths);
        const stripped = Object.fromEntries(Object.entries(old!.answers as Record<string, { text?: string }>).map(([k, v]) => [k, { text: v.text ?? "", files: [] }]));
        await admin.from("practice_attempts").update({ answers: stripped })
          .eq("user_uuid", user.id).eq("unit_id", unit.id).eq("kind", target).eq("paper_serial", cached.serial);
      }
    }

    return reply(req, {
      status: "ready",
      paper,
      answers: null,
      meta: { generated_at: now, generations_left: Math.max(0, MAX_GENERATIONS - generations), outdated: false, serial: (cached?.serial ?? 0) + 1 },
    });
  } catch (err) {
    if (err instanceof HttpError) return reply(req, { error: err.message, detail: err.detail }, err.status);
    return reply(req, { error: (err as Error)?.message ?? "Unexpected error" }, 500);
  }
});
