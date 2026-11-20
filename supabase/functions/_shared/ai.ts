import { HttpError } from "./guard.ts";

/**
 * One place that talks to the text model. Today it is Google Gemini (free tier, for testing). To move to another provider for
 * production, add a function like `gemini` below and select it with the AI_PROVIDER secret; nothing else changes.
 *
 * Secrets: AI_PROVIDER (default "gemini"), GEMINI_API_KEY, and optionally GEMINI_MODEL. If the model names are retired, the
 * function finds a current Flash model by itself.
 */
export interface JsonRequest {
  prompt: string;
  /** JSON schema of the reply (Gemini's OpenAPI subset, upper-case type names). */
  schema: unknown;
  temperature?: number;
  /** Photos the model should look at, as base64 (e.g. a student's working). */
  images?: { mime: string; data: string }[];
}

const parseJson = <T>(text: string): T => {
  try {
    return JSON.parse(text) as T;
  } catch {
    // Some models still wrap the JSON in a code fence or a sentence.
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) throw new HttpError(502, "The AI reply was not valid JSON");
    return JSON.parse(text.slice(start, end + 1)) as T;
  }
};

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";

/** Flash models this key can use, newest first. Used when the usual model names have been retired. */
const discoverModels = async (key: string): Promise<string[]> => {
  const res = await fetch(`${GEMINI}/models?pageSize=200`, { headers: { "x-goog-api-key": key } });
  if (!res.ok) return [];
  const { models = [] } = await res.json() as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
  const version = (n: string) => (n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? "0").split(".").map(Number);
  return models
    .filter((m) => /flash/.test(m.name) && m.supportedGenerationMethods?.includes("generateContent") && !/lite|image|tts|live|audio|preview|exp|thinking/.test(m.name))
    .map((m) => m.name.replace("models/", ""))
    .sort((x, y) => { const [a1 = 0, a2 = 0] = version(x); const [b1 = 0, b2 = 0] = version(y); return b1 - a1 || b2 - a2; });
};

const gemini = async <T>({ prompt, schema, temperature = 0.8, images = [] }: JsonRequest): Promise<T> => {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new HttpError(500, "GEMINI_API_KEY is not set");

  let lastDetail = "";
  let lastStatus = 404;
  // Returns the parsed reply, or null when this model name does not exist (so the next one can be tried).
  const tryModel = async (model: string): Promise<T | null> => {
    const send = (thinking: Record<string, unknown> | null) => fetch(`${GEMINI}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      // Reasoning models can "think" past the function's time limit; marking and writing papers do not need it.
      signal: AbortSignal.timeout(110_000),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }, ...images.map((i) => ({ inline_data: { mime_type: i.mime, data: i.data } }))] }],
        generationConfig: {
          responseMimeType: "application/json", responseSchema: schema, temperature,
          ...(thinking ? { thinkingConfig: thinking } : {}),
        },
      }),
    });
    let res!: Response;
    try {
      // Older models take a token budget, Gemini 3 takes a level; a model that accepts neither just runs as it is.
      for (const thinking of [{ thinkingBudget: 0 }, { thinkingLevel: "minimal" }, null]) {
        res = await send(thinking);
        if (res.status !== 400) break;
        console.error("AI model rejected request:", model, JSON.stringify(thinking), (await res.clone().text()).slice(0, 200));
      }
    } catch (e) {
      if (e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError")) {
        throw new HttpError(503, "The AI service took too long. Please try again.");
      }
      throw e;
    }

    // 404: retired model name. 429: this model's quota is used up. 503: overloaded. Quotas are per model, so try the next one.
    if (res.status === 404 || res.status === 429 || res.status === 503) { lastStatus = res.status; lastDetail = await res.text(); console.error("AI model unavailable:", model, res.status, lastDetail.slice(0, 200)); return null; }
    // 402/403: the key is out of credit or not allowed. Students should not see billing details; the cause goes to the logs.
    if (res.status === 402 || res.status === 403) {
      console.error("AI provider refused the key:", res.status, (await res.text()).slice(0, 300));
      throw new HttpError(503, "Practice papers are unavailable right now. Please try again later.");
    }
    if (!res.ok) throw new HttpError(502, "The AI service returned an error", (await res.text()).slice(0, 500));

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    if (!text) throw new HttpError(502, "The AI service returned nothing", JSON.stringify(data?.promptFeedback ?? {}));
    console.log("AI model used:", model);
    return parseJson<T>(text);
  };

  // The configured model first, then the usual names, then whatever Flash models the key can actually see.
  const tried = new Set<string>();
  for (const model of [Deno.env.get("GEMINI_MODEL"), "gemini-3.8-flash", "gemini-2.5-flash"]) {
    if (!model || tried.has(model)) continue;
    tried.add(model);
    const out = await tryModel(model);
    if (out !== null) return out;
  }
  for (const model of await discoverModels(key)) {
    if (tried.has(model)) continue;
    tried.add(model);
    const out = await tryModel(model);
    if (out !== null) return out;
  }
  if (lastStatus === 503 || lastStatus === 429) throw new HttpError(503, "The AI service is busy right now. Please try again in a minute.");
  throw new HttpError(502, "No AI model was available", lastDetail.slice(0, 300));
};

export const generateJson = <T>(req: JsonRequest): Promise<T> => {
  const provider = Deno.env.get("AI_PROVIDER") ?? "gemini";
  if (provider === "gemini") return gemini<T>(req);
  throw new HttpError(500, `AI provider "${provider}" is not set up`);
};
