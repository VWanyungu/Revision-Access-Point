import { createClient } from "jsr:@supabase/supabase-js@2";

/** Origins allowed to call the functions from a browser. Add more with the EXTRA_ORIGINS secret (comma separated). */
const ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "https://revision-access-point.vercel.app",
  ...(Deno.env.get("EXTRA_ORIGINS") ?? "").split(",").map((o) => o.trim()).filter(Boolean),
];

export class HttpError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
  }
}

export const corsFor = (req: Request): Record<string, string> => {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    ...(ALLOWED_ORIGINS.includes(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
  };
};

/** Every response, errors included, carries the CORS headers, so the browser can read the message. */
export const reply = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsFor(req), "Content-Type": "application/json" } });

export const adminClient = () =>
  createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

/** The ChatPDF key lives in a Supabase secret (supabase secrets set CHATPDF_API_KEY=...), never in the code. */
export const chatPdfKey = () => {
  const key = Deno.env.get("CHATPDF_API_KEY");
  if (!key) throw new HttpError(500, "ChatPDF API key not set");
  return key;
};

/**
 * Who is calling, and may they use this file?
 *  - the token must belong to a signed-in user;
 *  - the file must be one of our own resources (an arbitrary URL is refused, so the function cannot be used as a free
 *    gateway to ChatPDF);
 *  - the student must hold a current pass for that resource's department, year and semester.
 * Returns the user and the resource.
 */
export const authorizeFile = async (req: Request, fileUrl: string) => {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) throw new HttpError(401, "Missing or invalid authorisation token");

  const admin = adminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) throw new HttpError(401, "Missing or invalid authorisation token");

  const { data: resource } = await admin
    .from("resources")
    .select("id, unit_id, department_id, units(department_id, year_of_study, semester_of_study)")
    .eq("public_access_url", fileUrl)
    .limit(1)
    .maybeSingle();
  if (!resource) throw new HttpError(404, "Unknown file");

  // Admins (anyone with an admin role in app_metadata) may use any file; students need a current pass.
  const role = user.app_metadata?.role;
  if (!role) {
    const unit = resource.units as { department_id: number; year_of_study: number; semester_of_study: number } | null;
    const today = new Date().toISOString().slice(0, 10);
    const { data: pass } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_uuid", user.id)
      .eq("department_id", unit?.department_id ?? resource.department_id)
      .eq("year_of_study", unit?.year_of_study ?? -1)
      .eq("semester_of_study", unit?.semester_of_study ?? -1)
      .gte("end_date", today)
      .limit(1)
      .maybeSingle();
    if (!pass) throw new HttpError(403, "You need a current semester pass for this unit");
  }

  return { user, resource };
};
