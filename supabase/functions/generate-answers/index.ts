// Writes model answers for a past paper using ChatPDF: one call to list the questions, then one per question.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { HttpError, adminClient, authorizeFile, chatPdfKey, corsFor, reply, requireAi } from "../_shared/guard.ts";

const CHATPDF_BASE = "https://api.chatpdf.com/v1";

interface MarkBreakdown {
  step: string;
  marks: string;
}

interface Step {
  text: string;
  latex?: string;
  code?: string;
  language?: string;
}

interface QuestionAnswer {
  final_answer: string;
  working_steps: Step[];
  explanation: string;
}

interface Question {
  question_number: string;
  question_text: string;
  answer_type: string;
  marks_allocation: {
    total_marks: string;
    breakdown: MarkBreakdown[];
  };
  answer: QuestionAnswer;
  key_points: string[];
}

interface ExamOutput {
  document_title: string;
  questions: Question[];
}

interface QuestionRef {
  number: string;
  text: string;
}

const flattenAsciiTables = (s: string): string => {
  return s
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      // Drop separator lines: +---+---+ or |---|---|
      if (/^[\|\+][-\+\s|]{3,}$/.test(trimmed)) return "";
      if (/^\|[-\s|]+\|$/.test(trimmed)) return "";
      // Flatten data rows: | val | val | -> "val, val"
      if (/^\s*\|/.test(line)) {
        return line
          .split("|")
          .map((cell) => cell.trim())
          .filter(Boolean)
          .join(", ");
      }
      return line;
    })
    .filter((line) => line.trim() !== "")
    .join(" ");
};

const cleanTableArtifactsInStrings = (s: string): string => {
  return s.replace(/"((?:[^"\\]|\\.)*)"/g, (_match, inner: string) => {
    let c = inner;
    // Literal newlines / tabs inside a string value
    c = c.replace(/\r?\n/g, " ");
    c = c.replace(/\t/g, " ");
    // Pipe-delimited cells  "| val | val |"  ->  "val, val"
    if (c.includes("|")) {
      c = c
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean)
        .join(", ");
    }
    // Table separator dashes and + corners
    c = c.replace(/[-]{3,}/g, " ");
    c = c.replace(/\+/g, " ");
    // Collapse whitespace
    c = c.replace(/ {2,}/g, " ").trim();
    return `"${c}"`;
  });
};

const cleanAndParseJSON = (text: unknown): { json: string | null; parsed: unknown; steps: string[]; error: string | null } => {
  const steps: string[] = [];
  const raw = String(text);

  if (!raw || !raw.trim()) {
    return { json: null, parsed: null, steps, error: "Input is empty." };
  }

  let s = raw;

  s = flattenAsciiTables(s);
  steps.push("Pre-pass: flattened ASCII table rows into comma-separated strings");

  s = s.replace(/^[\s\S]*?(content\s*[:=]\s*)?["'`]?\s*\{/, "{");
  steps.push("Stripped JS variable wrappers");

  s = s.replace(/[`'"]\s*\+\s*[`'"]/g, "");
  steps.push("Removed JS string concatenation operators");

  s = s.replace(/\\n/g, " ");
  s = s.replace(/\\t/g, " ");
  s = s.replace(/\\r/g, "");
  steps.push("Replaced \\n \\t \\r with spaces");

  s = s.replace(/`/g, '"');
  steps.push("Replaced backticks with double quotes");

  s = s.replace(/[“”]/g, '"');
  s = s.replace(/[‘’]/g, "'");
  steps.push("Replaced curly quotes with straight quotes");

  s = s.replace(/,\s*([\}\]])/g, "$1");
  steps.push("Removed trailing commas");

  const lastBrace = s.lastIndexOf("}");
  if (lastBrace !== -1) s = s.substring(0, lastBrace + 1);
  steps.push("Trimmed content after final }");

  s = s.replace(/[ \t]{2,}/g, " ");
  steps.push("Collapsed excessive whitespace");

  // First parse attempt
  try {
    const parsed = JSON.parse(s);
    return { json: JSON.stringify(parsed, null, 2), parsed, steps, error: null };
  } catch (e1) {
    steps.push(`First parse failed: ${(e1 as Error).message}`);
  }

  // Second parse attempt
  s = cleanTableArtifactsInStrings(s);
  steps.push("Cleaned table artifacts inside JSON string values");
  s = s.replace(/,\s*([\}\]])/g, "$1"); // re-apply after string clean
  steps.push("Re-applied trailing comma removal");

  try {
    const parsed = JSON.parse(s);
    return { json: JSON.stringify(parsed, null, 2), parsed, steps, error: null };
  } catch (e2) {
    steps.push(`Attempt 2 failed: ${(e2 as Error).message}`);
  }

  // Aggressive pass
  s = s.replace(/[\x00-\x1F\x7F]/g, " ");
  steps.push("Removed control characters");

  s = s.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');
  steps.push("Quoted bare object keys");

  s = s.replace(/:[ \t]*'([^']*)'/g, ': "$1"');
  steps.push("Converted single-quoted values to double-quoted");

  s = s.replace(/""+/g, '"');
  steps.push("Collapsed duplicate quotes");

  try {
    const parsed = JSON.parse(s);
    return { json: JSON.stringify(parsed, null, 2), parsed, steps, error: null };
  } catch (e2) {
    steps.push(`Aggressive parse failed: ${(e2 as Error).message}`);

    // Last resort: try to patch incomplete JSON by balancing braces
    const opens = (s.match(/\{/g) || []).length;
    const closes = (s.match(/\}/g) || []).length;
    const openArr = (s.match(/\[/g) || []).length;
    const closeArr = (s.match(/\]/g) || []).length;
    const missingBraces = opens - closes;
    const missingBrackets = openArr - closeArr;

    const patched = s + "]".repeat(Math.max(0, missingBrackets)) + "}".repeat(Math.max(0, missingBraces));
    steps.push(`Patched ${missingBraces} missing } and ${missingBrackets} missing ]`);

    try {
      const parsed = JSON.parse(patched);
      return { json: JSON.stringify(parsed, null, 2), parsed, steps, error: null };
    } catch (e3) {
      return { json: s, parsed: null, steps, error: (e3 as Error).message };
    }
  }
};

const addSource = async (fileUrl: string, apiKey: string): Promise<string> => {
  const res = await fetch(`${CHATPDF_BASE}/sources/add-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ url: fileUrl }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`ChatPDF add-source failed: ${detail}`);
  }

  const { sourceId } = await res.json();
  return sourceId;
};

const askChatPDF = async (sourceId: string, apiKey: string, prompt: string): Promise<string> => {
  const res = await fetch(`${CHATPDF_BASE}/chats/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ sourceId, messages: [{ role: "user", content: prompt }] }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`ChatPDF chat failed: ${detail}`);
  }

  const data = await res.json();

  if (!data.content) {
    throw new Error(`ChatPDF returned no content: ${JSON.stringify(data)}`);
  }

  return data.content as string;
};

const TABLE_RULES = `
  CRITICAL TABLE RULES — violating these will cause a parse error:
  - Describe tables in plain English on a single line.
    Example: "Table with columns ID, Name, Score and rows: 1 Alice 90, 2 Bob 85"
  - Do NOT use pipe characters (|), +----+ borders, or newlines to simulate table layout.
  - This applies EVERYWHERE — question_text, working_steps, final_answer, key_points.
`;

const DELIMITED_CONTENT_RULES = `
  DELIMITED FIELD FORMATTING (applies to: final_answer, question_text):
  These fields are rendered as mixed content strings. Delimiters are required.

  MATH:
  - Inline math: $...$ — e.g. "The force is $F = ma$"
  - Block math: $$...$$ — e.g. "$$E = mc^2$$"
  - Never write LaTeX outside $ delimiters.

  CODE:
  - Use triple backticks with a language tag.
    \`\`\`python
    def add(a, b):
        return a + b
    \`\`\`
  - Never use single backticks for code.
  - Never place code inside $ delimiters.

  GENERAL:
  - These fields must remain a single string.
  - You may mix plain text, math, and code in the same string.
  - No raw newline characters outside of code blocks.
`;

const RAW_FIELD_RULES = `
  RAW FIELD FORMATTING (applies to: working_steps[].latex, working_steps[].code):
  These fields are passed directly to a renderer. Do NOT add delimiters.

  working_steps[].latex:
  - Plain LaTeX expression only. No $, $$, or any delimiters.
    VALID:   "F = ma"
    INVALID: "$F = ma$"

  working_steps[].code:
  - Plain code only. No triple backticks, no language tag, no fences.
    VALID:   "def add(a, b): return a + b"
    INVALID: "\`\`\`python\\ndef add(a, b): return a + b\\n\`\`\`"

  working_steps[].text:
  - Plain text only. No LaTeX delimiters, no code fences.
`;

const buildDiscoveryPrompt = (): string => `
  You are reading an exam paper. Your ONLY task is to list every question and sub-question.

  Output RAW JSON only. No markdown. No code fences. No explanation.

  Use this exact structure:
  {
    "document_title": "exact title from the document",
    "questions": [
      { "number": "1a", "text": "complete question text on one line" },
      { "number": "1b", "text": "complete question text on one line" }
    ]
  }

  RULES:
  - Include ALL main questions AND sub-questions (a, b, c / i, ii, iii).
  - "number" must be a string: "1", "1a", "2b", "3ii".
  - "text" is the full verbatim question text collapsed to a SINGLE LINE.
    ${DELIMITED_CONTENT_RULES}
  - No newline or tab characters inside any string value.
  - Straight double quotes only. No smart/curly quotes. No trailing commas.
  ${TABLE_RULES}
  Output begins with { and ends with } — nothing else.
  `;

const buildSolvePrompt = (questionNumber: string, questionText: string): string => {
  const safeText = questionText
    .replace(/\|/g, " ")           // remove pipe chars
    .replace(/\+[-+\s]+\+/g, " ")  // remove table border patterns
    .replace(/[-]{4,}/g, " ")      // remove long dash runs
    .replace(/\\n/g, " ")
    .replace(/\\t/g, " ")
    .replace(/"/g, "'")            // swap double quotes to avoid breaking prompt
    .replace(/\s{2,}/g, " ")
    .trim();

  return `
    You are an expert exam marker. Solve ONLY the following question from the uploaded exam paper.

    Question ${questionNumber}: ${safeText}

    Output RAW JSON only. No markdown. No explanation. No code fences. Begin with { immediately.

    Use this exact structure:
    {
      "question_number": "${questionNumber}",

      // question_text follows DELIMITED FIELD rules below — use $...$ for math, backtick fences for code.
      "question_text": "${safeText.replace(/"/g, "'")}",

      "answer_type": "calculation OR theory OR definition OR essay OR unclear",
      "marks_allocation": {
        "total_marks": "5",
        "breakdown": [
          { "step": "description of what earns this mark", "marks": "1" }
        ]
      },
      "answer": {

        // final_answer follows DELIMITED FIELD rules below — use $...$ for math, backtick fences for code.
        "final_answer": "the complete final answer as a single mixed-content string",

        // working_steps follow RAW FIELD rules below — no delimiters on latex or code values.
        "working_steps": [
          {
            "text": "short plain-text label for this step e.g. Define the formula",
            "latex": "raw LaTeX only, no delimiters e.g. F = ma",
            "code": "raw code only, no fences e.g. def add(a, b): return a + b",
            "programmingLanguage": "e.g. python"
          }
        ],
        "explanation": "brief plain-text summary on one line"
      },
      "key_points": [
        "key concept or fact 1",
        "key concept or fact 2"
      ]
    }

    GENERAL RULES:
    - Single JSON object, not an array.
    - No \\n or \\t inside any string value — use separate array items instead.
    - All string values on a single line.
    - Straight double quotes only. No trailing commas.
    - marks values must be numeric strings.
    - For calculations: working_steps should follow formula → substitution → simplification → result with units.
    - For theory: use concise marking-scheme bullet style in working_steps.
    - If question is unclear or cut off, set answer_type to "unclear".
    ${TABLE_RULES}

    FIELD-SPECIFIC FORMATTING:

    Fields that use delimiters (question_text, final_answer):
    ${DELIMITED_CONTENT_RULES}

    Fields that use raw values (working_steps[].latex, working_steps[].code, working_steps[].text):
    ${RAW_FIELD_RULES}
`;
};

const MAX_REGENERATIONS = 2;

type Admin = ReturnType<typeof adminClient>;
interface AnswersRow {
  id: number;
  version: number;
  content: ExamOutput;
  is_default: boolean;
  created_at: string;
}

/** Runs ChatPDF over the paper: one call to list the questions, then one per question. Slow (up to a minute or two). */
const generate = async (fileUrl: string, title: string, apiKey: string) => {
  console.log("[1/3] Adding source:", fileUrl);
  const sourceId = await addSource(fileUrl, apiKey);
  console.log("[1/3] sourceId:", sourceId);

  console.log("[2/3] Discovering questions...");
  const discoveryRaw = await askChatPDF(sourceId, apiKey, buildDiscoveryPrompt());
  const { parsed: discoveryParsed, error: discoveryError, steps: discoverySteps } = cleanAndParseJSON(discoveryRaw);

  console.log("Discovery clean steps:", discoverySteps);

  if (!discoveryParsed || discoveryError) {
    throw new HttpError(500, "Failed to parse question list from ChatPDF", { detail: discoveryError, raw: discoveryRaw });
  }

  const discovery = discoveryParsed as { document_title: string; questions: QuestionRef[] };
  const questionRefs: QuestionRef[] = discovery.questions ?? [];

  if (questionRefs.length === 0) throw new HttpError(422, "No questions found in document");

  console.log(`[2/3] Found ${questionRefs.length} questions:`, questionRefs.map((q) => q.number));

  // ── Step 3: Solve each question individually ──────────────────────────────

  console.log("[3/3] Solving questions one by one...");

  const solvedQuestions: Question[] = [];
  const failures: { number: string; error: string }[] = [];

  // Process in small batches to avoid hammering the API and hitting timeouts
  const BATCH_SIZE = 3;

  for (let i = 0; i < questionRefs.length; i += BATCH_SIZE) {
    const batch = questionRefs.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (q) => {
        const prompt = buildSolvePrompt(q.number, q.text);
        const raw = await askChatPDF(sourceId, apiKey, prompt);
        const { parsed, error, steps } = cleanAndParseJSON(raw);

        console.log(`  Q${q.number} clean steps:`, steps);

        if (!parsed || error) {
          throw new Error(`Parse failed for Q${q.number}: ${error}`);
        }

        return parsed as Question;
      }),
    );

    batchResults.forEach((result, idx) => {
      const q = batch[idx];
      if (result.status === "fulfilled") {
        solvedQuestions.push(result.value);
      } else {
        console.error(`  Q${q.number} failed:`, result.reason);
        failures.push({ number: q.number, error: String(result.reason) });

        // Push a placeholder so the question isn't silently lost
        solvedQuestions.push({
          question_number: q.number,
          question_text: q.text,
          answer_type: "unclear",
          marks_allocation: { total_marks: "0", breakdown: [] },
          answer: {
            final_answer: "Could not be solved — see error",
            working_steps: [{ text: String(result.reason) }],
            explanation: "This question failed to process individually.",
          },
          key_points: [],
        });
      }
    });
  }

  // ── Step 4: Sort and assemble final output ────────────────────────────────

  // Sort by question number to match original document order
  const questionOrder = questionRefs.map((q) => q.number);
  solvedQuestions.sort(
    (a, b) => questionOrder.indexOf(a.question_number) - questionOrder.indexOf(b.question_number),
  );

  const output: ExamOutput = { document_title: title, questions: solvedQuestions };
  console.log(`Done. ${solvedQuestions.length} solved, ${failures.length} failed.`);
  return { output, failures, total: questionRefs.length };
};

const loadPin = async (admin: Admin, userId: string, resourceId: number) => {
  const { data } = await admin
    .from("user_answers")
    .select("regenerations, answers:paper_answers(id, version, content, is_default, created_at)")
    .eq("user_uuid", userId)
    .eq("resource_id", resourceId)
    .maybeSingle();
  return data as { regenerations: number; answers: AnswersRow } | null;
};

const latestVersion = async (admin: Admin, resourceId: number) => {
  const { data } = await admin
    .from("paper_answers").select("version").eq("resource_id", resourceId).order("version", { ascending: false }).limit(1).maybeSingle();
  return (data?.version as number | undefined) ?? 0;
};

const pinTo = async (admin: Admin, userId: string, resourceId: number, answersId: number, regenerations: number) => {
  const { error } = await admin.from("user_answers").upsert(
    { user_uuid: userId, resource_id: resourceId, answers_id: answersId, regenerations, pinned_at: new Date().toISOString() },
    { onConflict: "user_uuid,resource_id" },
  );
  if (error) throw new HttpError(500, "Could not save your answers", error.message);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsFor(req) });

  try {
    // action: "get" (default) opens the student's pinned version, "regenerate" writes a new one, "switch" moves to another.
    const { fileUrl, title, action = "get", version } = await req.json();
    if (!fileUrl || !title) throw new HttpError(400, "Missing required input");

    // Signed in, our own file, and a current pass for it: checked before any ChatPDF credit is spent.
    const { user, resource, ai } = await authorizeFile(req, fileUrl);
    requireAi(ai);
    const admin = adminClient();

    const present = async (row: AnswersRow, regenerations: number, extra: Record<string, unknown> = {}) =>
      reply(req, {
        data: row.content,
        meta: {
          version: row.version,
          latest_version: await latestVersion(admin, resource.id),
          is_default: row.is_default,
          generated_at: row.created_at,
          regenerations_left: Math.max(0, MAX_REGENERATIONS - regenerations),
          ...extra,
        },
      });

    const pin = await loadPin(admin, user.id, resource.id);

    // Open what the student already has. Nothing is generated and nothing changes while they read.
    if (action === "get" && pin?.answers) return await present(pin.answers, pin.regenerations);

    // Move to another saved version (for example, a newer one).
    if (action === "switch") {
      const { data: target } = await admin
        .from("paper_answers").select("id, version, content, is_default, created_at")
        .eq("resource_id", resource.id).eq("version", Number(version)).maybeSingle();
      if (!target) throw new HttpError(404, "That version does not exist");
      await pinTo(admin, user.id, resource.id, target.id, pin?.regenerations ?? 0);
      return await present(target as AnswersRow, pin?.regenerations ?? 0);
    }

    // A new reader gets the paper's default version, with no generation.
    if (action === "get") {
      const { data: def } = await admin
        .from("paper_answers").select("id, version, content, is_default, created_at")
        .eq("resource_id", resource.id).eq("is_default", true).maybeSingle();
      if (def) {
        await pinTo(admin, user.id, resource.id, def.id, 0);
        return await present(def as AnswersRow, 0);
      }
      // Nobody has generated this paper yet: fall through and generate version 1.
    }

    if (action === "regenerate" && (pin?.regenerations ?? 0) >= MAX_REGENERATIONS) {
      throw new HttpError(429, `You have used your ${MAX_REGENERATIONS} regenerations for this paper`);
    }

    const apiKey = chatPdfKey();
    const { output, failures, total } = await generate(fileUrl, title, apiKey);

    // The new version never replaces an old one; the student is pinned to it, everyone else stays where they are.
    const { data: created, error: createError } = await admin.rpc("add_paper_answers", {
      p_resource: resource.id, p_content: output, p_user: user.id,
    });
    const row = Array.isArray(created) ? created[0] : created;
    if (createError || !row) throw new HttpError(500, "Could not save the answers", createError?.message);

    // A regenerate counts against the cap; a first generation does not.
    const regenerations = action === "regenerate" && pin ? pin.regenerations + 1 : pin?.regenerations ?? 0;
    await pinTo(admin, user.id, resource.id, row.id, regenerations);

    return await present(
      { id: row.id, version: row.version, content: output, is_default: row.is_default, created_at: new Date().toISOString() },
      regenerations,
      { total_questions: total, failed: failures.length, failures: failures.length ? failures : undefined },
    );
  } catch (err) {
    if (err instanceof HttpError) return reply(req, { error: err.message, detail: err.detail }, err.status);
    return reply(req, { error: (err as Error)?.message ?? "Unexpected error" }, 500);
  }
});
