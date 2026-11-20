// Generates multiple-choice questions from a note using ChatPDF.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { HttpError, authorizeFile, chatPdfKey, corsFor, reply } from "../_shared/guard.ts";

const CHATPDF_BASE = "https://api.chatpdf.com/v1";

/** ChatPDF sometimes wraps the JSON in a code fence or adds a sentence around it. Take the array out of it. */
const extractArray = (text: string): unknown => {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start) throw new Error("no JSON array in the reply");
  return JSON.parse(text.slice(start, end + 1));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsFor(req) });

  try {
    const { fileUrl, numberOfQuestions, difficulty } = await req.json();
    if (!fileUrl || !numberOfQuestions || !difficulty) throw new HttpError(400, "Missing required input");

    await authorizeFile(req, fileUrl);
    const apiKey = chatPdfKey();

    const addRes = await fetch(`${CHATPDF_BASE}/sources/add-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ url: fileUrl }),
    });
    if (!addRes.ok) throw new HttpError(502, "Add source failed", await addRes.text());
    const { sourceId } = await addRes.json();

    const prompt = `
      Generate ${numberOfQuestions} multiple choice questions from the document.
      Difficulty: ${difficulty}.
      Return only valid JSON array in this structure:
      [
        {
          "id": 1,
          "question": "...",
          "options": ["opt1","opt2","opt3","opt4"],
          "correctAnswer": 0,
          "topic": "..."
        }
      ]
      Correct answer must be a 0-based index.
    `;

    const chatRes = await fetch(`${CHATPDF_BASE}/chats/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ sourceId, messages: [{ role: "user", content: prompt }] }),
    });
    if (!chatRes.ok) throw new HttpError(502, "ChatPDF chat failed", await chatRes.text());

    const chatData = await chatRes.json();
    let quiz: unknown;
    try {
      quiz = extractArray(String(chatData.content ?? ""));
    } catch {
      throw new HttpError(502, "Invalid JSON from ChatPDF");
    }

    return reply(req, { data: quiz });
  } catch (err) {
    if (err instanceof HttpError) return reply(req, { error: err.message, detail: err.detail }, err.status);
    return reply(req, { error: (err as Error)?.message ?? "Unexpected error" }, 500);
  }
});
