import { supabase } from "@/database/supabase";

/**
 * Calls an edge function with a plain request (the same way the answers page does), so only the headers the function allows are
 * sent. Errors come back as a message, not a thrown object.
 */
/** An error from an edge function. `aiRequired` is true when the student's pass does not include the AI add-on. */
export class ApiError extends Error {
  constructor(message: string, public aiRequired = false) {
    super(message);
  }
}

export const callFunction = async <T,>(name: string, body: unknown): Promise<T> => {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const body = json as { error?: string; detail?: unknown } | null;
    throw new ApiError(body?.error ?? "Something went wrong. Please try again.", body?.detail === "ai_required");
  }
  return json as T;
};
