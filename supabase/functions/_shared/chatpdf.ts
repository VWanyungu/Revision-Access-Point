import { HttpError } from "./guard.ts";

const BASE = "https://api.chatpdf.com/v1";

/** Uploads a PDF link to ChatPDF and returns its source id. */
export const addSource = async (fileUrl: string, apiKey: string): Promise<string> => {
  const res = await fetch(`${BASE}/sources/add-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ url: fileUrl }),
  });
  if (!res.ok) throw new HttpError(502, "ChatPDF add-source failed", await res.text());
  return (await res.json()).sourceId as string;
};

/** Asks ChatPDF one question about a source and returns the reply text. */
export const ask = async (sourceId: string, apiKey: string, prompt: string): Promise<string> => {
  const res = await fetch(`${BASE}/chats/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ sourceId, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new HttpError(502, "ChatPDF chat failed", await res.text());
  const data = await res.json();
  if (!data.content) throw new HttpError(502, "ChatPDF returned no content");
  return data.content as string;
};

/** Takes the JSON object out of a reply that may have a sentence or a code fence around it. */
export const extractJson = <T = unknown>(text: string): T => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in the reply");
  return JSON.parse(text.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1")) as T;
};
