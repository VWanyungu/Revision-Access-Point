// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { getPrices } from "../_shared/pricing.ts";
 
function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
 
  if (/^07\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^01\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^2547\d{8}$/.test(digits)) return digits;
  if (/^7\d{8}$/.test(digits)) return `254${digits}`;
 
  return null;
}
 
async function getMpesaAccessToken(): Promise<string> {
  const key = Deno.env.get("MPESA_CONSUMER_KEY")!;
  const secret = Deno.env.get("MPESA_CONSUMER_SECRET")!;
  const baseUrl = Deno.env.get("MPESA_BASE_URL")!; // https://sandbox.safaricom.co.ke OR https://api.safaricom.co.ke
 
  const auth = btoa(`${key}:${secret}`);
 
  const res = await fetch(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );
 
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`M-PESA token error (${res.status}): ${body}`);
  }
 
  const data = await res.json();
  return data.access_token;
}
 
/**
 * M-PESA requires a password = base64(ShortCode + PassKey + Timestamp)
 * Timestamp format: YYYYMMDDHHmmss
 */
function generateMpesaPassword(timestamp: string): string {
  // const shortCode = Deno.env.get("MPESA_SHORTCODE")!;
  const shortCode = "174379"
  const passKey = Deno.env.get("MPESA_PASSKEY")!;
  return btoa(`${shortCode}${passKey}${timestamp}`);
}
 
function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}` +
    `${pad(now.getMonth() + 1)}` +
    `${pad(now.getDate())}` +
    `${pad(now.getHours())}` +
    `${pad(now.getMinutes())}` +
    `${pad(now.getSeconds())}`
  );
}
 
async function triggerStkPush(
  token: string,
  phoneNumber: string,
  amount: number,
  accountReference: string
): Promise<{ checkoutRequestId: string; merchantRequestId: string }> {
  const baseUrl = Deno.env.get("MPESA_BASE_URL")!;
  const callbackUrl = Deno.env.get("MPESA_PAYMENT_CALLBACK_URL")!;
  // const shortCode = Deno.env.get("MPESA_SHORTCODE")!;
  const shortCode = "174379"
 
  const timestamp = getTimestamp();
  const password = generateMpesaPassword(timestamp);
 
  const res = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.ceil(amount), // M-PESA only accepts whole numbers; the amount comes from the PRICE_* secrets
      PartyA: phoneNumber,        // Customer phone
      PartyB: shortCode,          // Your shortcode
      PhoneNumber: phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: accountReference, // Shows on customer's M-PESA message
      TransactionDesc: "Subscription payment",
    }),
  });
 
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`M-PESA STK Push error (${res.status}): ${body}`);
  }
 
  const data = await res.json();
 
  if (data.ResponseCode !== "0") {
    throw new Error(
      `STK Push rejected: ${data.ResponseDescription ?? "Unknown error"}`
    );
  }
 
  return {
    checkoutRequestId: data.CheckoutRequestID,
    merchantRequestId: data.MerchantRequestID,
  };
}

Deno.serve(async (req) => {

  const allowedOrigins = [
    "http://localhost:8080",
    "https://revision-access-point.vercel.app",
  ];

  const origin = req.headers.get("origin");

  const corsHeaders = {
    "Access-Control-Allow-Origin":
      origin && allowedOrigins.includes(origin) ? origin : "",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      req.headers.get("access-control-request-headers") ??
      "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
 
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  try {
    // ── 1. Authenticate the caller via Supabase JWT ──────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
 
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
 
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
 
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
 
    // ── 2. Parse & validate request body ────────────────────────────────────
    const body = await req.json();
    // The amount is NOT taken from the request: it is worked out below from the pricing secrets.
    // kind "pass": a new semester pass, with the AI add-on if ai is true. kind "ai_upgrade": the AI add-on for a pass already held.
    const { phone_number, department_id, year_of_study, semester_of_study } = body;
    const kind: "pass" | "ai_upgrade" = body.kind === "ai_upgrade" ? "ai_upgrade" : "pass";
    const wantsAi = kind === "ai_upgrade" || body.ai === true;

    if (!phone_number || !department_id || !year_of_study || !semester_of_study) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: phone_number, department_id, year_of_study, semester_of_study",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
 
    if (department_id <= 0 || year_of_study <= 0 || semester_of_study <= 0) {
      return new Response(
        JSON.stringify({ error: "department_id, year_of_study, and semester_of_study must be greater than 0" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
 
 
    const normalizedPhone = normalizePhone(String(phone_number));
    if (!normalizedPhone) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number. Use format: 07XXXXXXXX or 2547XXXXXXXX" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
 
    // ── Price and eligibility, decided on the server ─────────────────────────
    const prices = getPrices();
    const aiAmount = wantsAi ? prices.ai : 0;
    const amount = (kind === "pass" ? prices.access : 0) + aiAmount;

    const adminCheck = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const today = new Date().toISOString().slice(0, 10);
    // A pass can be renewed in its last 14 days (the app's RENEW_WINDOW_DAYS), so for a new pass only one that ends
    // after that window counts as already held. An AI upgrade still needs any pass that has not ended.
    const renewFrom = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
    const { data: held } = await adminCheck
      .from("subscriptions")
      .select("id, ai_access")
      .eq("user_uuid", user.id)
      .eq("department_id", Number(department_id))
      .eq("year_of_study", Number(year_of_study))
      .eq("semester_of_study", Number(semester_of_study))
      .gte("end_date", kind === "pass" ? renewFrom : today)
      .limit(1)
      .maybeSingle();
    const conflict = kind === "pass"
      ? (held ? "You already have an active pass for this semester. You can renew it in its last 14 days." : "")
      : !held ? "You need an active pass before adding the AI features."
      : held.ai_access ? "Your pass already includes the AI features." : "";
    if (conflict) {
      return new Response(
        JSON.stringify({ error: conflict }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // AccountReference shown to the customer on their M-PESA message
    const accountReference = `SUB-${user.id.slice(0, 8).toUpperCase()}`;
 
    // ── 3. Trigger M-PESA STK Push ───────────────────────────────────────────
    const mpesaToken = await getMpesaAccessToken();
    const { checkoutRequestId, merchantRequestId } = await triggerStkPush(
      mpesaToken,
      normalizedPhone,
      amount,
      accountReference
    );
 
    // ── 4. Store pending payment so callback can create the subscription ─────
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
 
    const { error: insertError } = await adminSupabase
      .from("pending_payments")
      .insert({
        checkout_request_id: checkoutRequestId,
        merchant_request_id: merchantRequestId,
        user_uuid: user.id,
        department_id: Number(department_id),
        year_of_study: Number(year_of_study),
        semester_of_study: Number(semester_of_study),
        amount,
        kind,
        ai: wantsAi,
        ai_amount: aiAmount,
        phone_number: normalizedPhone,
        status: "pending",
      });
 
    if (insertError) {
      console.error("Failed to store pending payment:", insertError);
      // STK push was already sent — log for reconciliation but don't fail
    }
 
    // ── 5. Return success ────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        message: "STK Push sent. Please enter your M-PESA PIN to complete payment.",
        checkout_request_id: checkoutRequestId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("mpesa-initiate-payment error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
