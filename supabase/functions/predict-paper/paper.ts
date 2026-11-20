// Prompt and validation for the practice paper. Pure functions (no Deno, no network) so they can be tested on their own.

export type Kind = "cat1" | "cat2" | "exam";

export interface ForecastTopic { topic_id: number; title: string; percent: number; level: string; reason: string }
export interface Forecast {
  topics: ForecastTopic[];
  structure: { questions: number; total_marks: number; types: { type: string; percent: number }[] };
}
export interface Sample { topic_id: number; text: string }

export interface PracticeQuestion { number: string; text: string; marks: number; topic_id: number | null; type: string; reason: string }
export interface PracticePaper {
  title: string;
  duration_minutes: number;
  instructions: string;
  total_marks: number;
  questions: PracticeQuestion[];
}

export const KIND_LABEL: Record<Kind, string> = { cat1: "CAT 1", cat2: "CAT 2", exam: "exam" };
const TYPES = ["calculation", "theory", "definition", "essay", "practical"];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n) || lo));

/** How big the practice paper should be: the usual size of this kind of paper, within sensible limits. */
export const targetSize = (forecast: Forecast) => ({
  questions: clamp(forecast.structure.questions, 4, 12),
  marks: clamp(forecast.structure.total_marks, 30, 100),
});

export const buildPrompt = (unitName: string, kind: Kind, forecast: Forecast, samples: Sample[]): string => {
  const { questions, marks } = targetSize(forecast);
  const likely = forecast.topics.filter((t) => t.level === "high" || t.level === "medium");
  const mix = forecast.structure.types.slice(0, 4).map((t) => `${t.type} ${t.percent}%`).join(", ");
  const byTopic = new Map<number, string[]>();
  for (const s of samples) byTopic.set(s.topic_id, [...(byTopic.get(s.topic_id) ?? []), s.text]);

  return `
You are a university lecturer writing a practice ${KIND_LABEL[kind]} for the unit "${unitName}".
The student will use it to revise, so it must be NEW questions in the style of the unit's past papers. Do not copy past questions.

Topics to cover, with how likely each is to be examined (from the unit's past papers). Cover the high topics most, medium topics
less, and you may leave out low ones. Every question must test exactly one of these topics:
${(likely.length ? likely : forecast.topics.filter((t) => t.level !== "none"))
  .map((t) => `- topic_id ${t.topic_id}: ${t.title} (${t.level}). ${t.reason}${byTopic.has(t.topic_id) ? `\n  How past questions on it are phrased: ${byTopic.get(t.topic_id)!.map((x) => `"${x}"`).join(" | ")}` : ""}`)
  .join("\n")}

Shape of the paper:
- About ${questions} questions in total, adding up to about ${marks} marks.
- Mix of question types like the past papers: ${mix || "mostly theory"}.
- Each question has its own marks (a whole number). Longer questions can have parts written into the same question text, like (a), (b).
- Plain text only. No markdown. Straight double quotes. No tables.

Return JSON with: a short "title", "duration_minutes", "instructions" (one or two sentences for the student), and "questions": each with
"number" (string, like "1" or "2a"), "text", "marks", "topic_id" (one of the ids above), "type" (one of: ${TYPES.join(", ")}), and "reason" (one short sentence on why this topic is likely).
`.trim();
};

/** The reply schema (Gemini's OpenAPI subset). */
export const paperSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    duration_minutes: { type: "INTEGER" },
    instructions: { type: "STRING" },
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          number: { type: "STRING" },
          text: { type: "STRING" },
          marks: { type: "INTEGER" },
          topic_id: { type: "INTEGER" },
          type: { type: "STRING" },
          reason: { type: "STRING" },
        },
        required: ["number", "text", "marks", "topic_id", "type", "reason"],
      },
    },
  },
  required: ["title", "duration_minutes", "instructions", "questions"],
};

/** Cleans what the model returned. Throws when it is unusable, so a bad reply is never saved. */
export const validatePaper = (raw: unknown, kind: Kind, topicIds: Set<number>): PracticePaper => {
  const r = (raw ?? {}) as { title?: unknown; duration_minutes?: unknown; instructions?: unknown; questions?: unknown };
  const list = Array.isArray(r.questions) ? (r.questions as Record<string, unknown>[]) : [];
  const questions: PracticeQuestion[] = list
    .map((q, i) => ({
      number: String(q.number ?? i + 1).trim() || String(i + 1),
      text: String(q.text ?? "").trim(),
      marks: clamp(Number(q.marks), 1, 40),
      topic_id: topicIds.has(Number(q.topic_id)) ? Number(q.topic_id) : null,
      type: TYPES.includes(String(q.type)) ? String(q.type) : "theory",
      reason: String(q.reason ?? "").trim().slice(0, 200),
    }))
    .filter((q) => q.text.length >= 15);

  if (questions.length < 3) throw new Error("the paper had too few usable questions");

  const total = questions.reduce((n, q) => n + q.marks, 0);
  return {
    title: String(r.title ?? "").trim().slice(0, 100) || `${KIND_LABEL[kind]} practice paper`,
    duration_minutes: clamp(Number(r.duration_minutes) || total, 30, 180),
    instructions: String(r.instructions ?? "").trim().slice(0, 400) || "Answer all questions.",
    total_marks: total,
    questions,
  };
};

// ── Model answers ────────────────────────────────────────────────────────────

/** The same shape the app uses to show a past paper's answers, so one screen can show both. */
export interface AnswerStep { text: string; latex?: string; code?: string; language?: string }
export interface ModelAnswer {
  question_number: string;
  question_text: string;
  answer_type: string;
  marks_allocation: { total_marks: string; breakdown: { step: string; marks: string }[] };
  answer: { final_answer: string; working_steps: AnswerStep[]; explanation: string };
  key_points: string[];
}
export interface ModelAnswers { document_title: string; questions: ModelAnswer[] }

export const buildAnswersPrompt = (unitName: string, paper: PracticePaper, topicTitle: (id: number | null) => string | undefined): string => `
You are a university lecturer writing the model answers (the marking scheme) for this practice paper for the unit "${unitName}".

The paper:
${paper.questions.map((q) => `Question ${q.number} (${q.marks} marks${topicTitle(q.topic_id) ? `, topic: ${topicTitle(q.topic_id)}` : ""}):\n${q.text}`).join("\n\n")}

For EVERY question above, in the same order, write:
- "question_number": exactly as in the paper, and "question_text": the question copied exactly.
- "answer_type": one of ${TYPES.join(", ")}.
- "marks_allocation": "total_marks" (the question's marks, as a string) and "breakdown": what earns each mark, as items {"step", "marks"} whose marks add up EXACTLY to the question's marks.
- "answer": "final_answer" (the complete model answer a top student would write), "working_steps" (for calculations: formula, substitution, result; for theory: short marking-scheme bullets), and "explanation" (one or two sentences).
- "key_points": the key facts or ideas the answer must contain.

Formatting: plain text. Write maths inside $...$ (inline) or $$...$$ (block). Put code in triple backticks with a language. No markdown headings or tables. Straight double quotes. All marks values are numeric strings.
`.trim();

export const answersSchema = {
  type: "OBJECT",
  properties: {
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question_number: { type: "STRING" },
          question_text: { type: "STRING" },
          answer_type: { type: "STRING" },
          marks_allocation: {
            type: "OBJECT",
            properties: {
              total_marks: { type: "STRING" },
              breakdown: { type: "ARRAY", items: { type: "OBJECT", properties: { step: { type: "STRING" }, marks: { type: "STRING" } }, required: ["step", "marks"] } },
            },
            required: ["total_marks", "breakdown"],
          },
          answer: {
            type: "OBJECT",
            properties: {
              final_answer: { type: "STRING" },
              working_steps: { type: "ARRAY", items: { type: "OBJECT", properties: { text: { type: "STRING" }, latex: { type: "STRING" }, code: { type: "STRING" }, language: { type: "STRING" } }, required: ["text"] } },
              explanation: { type: "STRING" },
            },
            required: ["final_answer", "working_steps", "explanation"],
          },
          key_points: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["question_number", "question_text", "answer_type", "marks_allocation", "answer", "key_points"],
      },
    },
  },
  required: ["questions"],
};

/**
 * Lines the model's answers up with the paper's questions, one answer per question in paper order. The mark breakdown is forced
 * to add up to the question's marks. Too many missing answers means the reply is unusable.
 */
export const validateAnswers = (raw: unknown, paper: PracticePaper): ModelAnswers => {
  const list = Array.isArray((raw as { questions?: unknown })?.questions) ? ((raw as { questions: Record<string, unknown>[] }).questions) : [];
  const byNumber = new Map(list.map((a) => [String(a.question_number ?? "").trim(), a]));

  let missing = 0;
  const questions = paper.questions.map((q, i): ModelAnswer => {
    const a = (byNumber.get(q.number) ?? list[i]) as Record<string, any> | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
    const final = String(a?.answer?.final_answer ?? "").trim();
    if (!a || !final) {
      missing++;
      return {
        question_number: q.number, question_text: q.text, answer_type: q.type,
        marks_allocation: { total_marks: String(q.marks), breakdown: [{ step: "A complete, correct answer", marks: String(q.marks) }] },
        answer: { final_answer: "No model answer was written for this question.", working_steps: [], explanation: "" },
        key_points: [],
      };
    }
    let breakdown = (Array.isArray(a.marks_allocation?.breakdown) ? a.marks_allocation.breakdown : [])
      .map((b: Record<string, unknown>) => ({ step: String(b.step ?? "").trim(), marks: Math.max(0, Math.round(Number(b.marks) || 0)) }))
      .filter((b: { step: string }) => b.step);
    const sum = breakdown.reduce((n: number, b: { marks: number }) => n + b.marks, 0);
    if (breakdown.length && sum !== q.marks) {
      const last = breakdown[breakdown.length - 1];
      const fixed = last.marks + (q.marks - sum);
      breakdown = fixed >= 0 ? [...breakdown.slice(0, -1), { ...last, marks: fixed }] : [];
    }
    if (!breakdown.length) breakdown = [{ step: "A complete, correct answer", marks: q.marks }];
    return {
      question_number: q.number,
      question_text: q.text,
      answer_type: TYPES.includes(String(a.answer_type)) ? String(a.answer_type) : q.type,
      marks_allocation: { total_marks: String(q.marks), breakdown: breakdown.map((b: { step: string; marks: number }) => ({ step: b.step, marks: String(b.marks) })) },
      answer: {
        final_answer: final,
        working_steps: (Array.isArray(a.answer?.working_steps) ? a.answer.working_steps : [])
          .map((s: Record<string, unknown>) => ({
            text: String(s.text ?? "").trim(),
            ...(s.latex ? { latex: String(s.latex) } : {}),
            ...(s.code ? { code: String(s.code), language: String(s.language ?? "") } : {}),
          }))
          .filter((s: { text: string }) => s.text),
        explanation: String(a.answer?.explanation ?? "").trim(),
      },
      key_points: (Array.isArray(a.key_points) ? a.key_points : []).map((k: unknown) => String(k).trim()).filter(Boolean),
    };
  });

  if (missing > Math.max(1, Math.floor(paper.questions.length * 0.25))) throw new Error("too many questions came back without an answer");
  return { document_title: paper.title, questions };
};
