// Tells the app how one M-Pesa prompt ended, so the student sees why a payment failed (cancelled, wrong PIN, no funds)
// instead of waiting out the full two minutes. Reads what mpesa-payment-callback stored; it never changes anything.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient, corsFor, reply } from "../_shared/guard.ts";

// Daraja STK result codes.
const OUTCOME_BY_CODE: Record<string, string> = {
  "1032": "cancelled",
  "2001": "wrong_pin",
  "1": "insufficient_funds",
  "1037": "timeout",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsFor(req) });
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return reply(req, { error: "Missing or invalid authorisation token" }, 401);
    const admin = adminClient();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return reply(req, { error: "Missing or invalid authorisation token" }, 401);

    const { checkout_request_id } = await req.json().catch(() => ({}));
    if (typeof checkout_request_id !== "string" || !checkout_request_id) return reply(req, { error: "checkout_request_id is required" }, 400);

    // Only the student who started the payment can read it.
    const { data: row } = await admin
      .from("pending_payments")
      .select("status, callback_payload")
      .eq("checkout_request_id", checkout_request_id)
      .eq("user_uuid", user.id)
      .maybeSingle();
    if (!row) return reply(req, { error: "Payment not found" }, 404);

    if (row.status === "completed" || row.status === "success") return reply(req, { outcome: "paid" });
    if (row.status === "pending") return reply(req, { outcome: "pending" });
    // Money was taken but the pass was not created: the student must contact support.
    if (row.status === "paid_subscription_failed") return reply(req, { outcome: "paid_not_activated" });

    const code = String(row.callback_payload?.Body?.stkCallback?.ResultCode ?? "");
    return reply(req, { outcome: OUTCOME_BY_CODE[code] ?? "failed" });
  } catch (err) {
    console.error("mpesa-payment-status:", err);
    return reply(req, { error: "Could not check the payment" }, 500);
  }
});
