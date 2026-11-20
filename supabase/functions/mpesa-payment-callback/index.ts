// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {

 if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
 
  const adminSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
 
  let rawBody: string;
  try {
    rawBody = await req.text();
    console.log("M-PESA callback raw body:", rawBody);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }
 
  let payload: MpesaCallbackPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("Failed to parse callback JSON");
    return new Response("Bad Request", { status: 400 });
  }
 
  // ── 1. Navigate the Daraja callback envelope ─────────────────────────────
  // Safaricom wraps the result in: { Body: { stkCallback: { ... } } }
  const stkCallback = payload?.Body?.stkCallback;
 
  if (!stkCallback) {
    console.error("Unexpected callback shape — missing Body.stkCallback:", payload);
    return new Response("OK", { status: 200 }); // Acknowledge so Safaricom stops retrying
  }
 
  const {
    ResultCode,
    ResultDesc,
    CheckoutRequestID,
    MerchantRequestID,
    CallbackMetadata,
  } = stkCallback;
 
  if (!CheckoutRequestID) {
    console.error("Callback missing CheckoutRequestID:", stkCallback);
    return new Response("OK", { status: 200 });
  }
 
  // ── 2. Look up the pending payment ──────────────────────────────────────
  const { data: pending, error: lookupError } = await adminSupabase
    .from("pending_payments")
    .select("*")
    .eq("checkout_request_id", CheckoutRequestID)
    .maybeSingle();
 
  if (lookupError) {
    console.error("DB lookup error:", lookupError);
    return new Response("OK", { status: 200 });
  }
 
  if (!pending) {
    console.warn("No pending payment found for CheckoutRequestID:", CheckoutRequestID);
    return new Response("OK", { status: 200 });
  }
 
  // ── 3. Handle result ─────────────────────────────────────────────────────
  if (String(ResultCode) === "0") {
    // ✅ Payment successful
 
    // Extract M-PESA receipt number and actual amount from CallbackMetadata
    // Metadata items: { Name: "MpesaReceiptNumber", Value: "..." }, etc.
    const meta = extractMetadata(CallbackMetadata);
    const mpesaReceiptNumber = meta["MpesaReceiptNumber"] ?? MerchantRequestID;
    const paidAmount = meta["Amount"] ?? pending.amount;
 
    console.log(
      `✅ M-PESA payment confirmed | Receipt: ${mpesaReceiptNumber} | Amount: ${paidAmount}`
    );
 
    // A new pass gets a fixed 6-month window from the payment date. An AI upgrade adds AI to the pass the student already
    // holds, for the rest of its term (the 70/30 split stays as it was; the AI part goes entirely to the platform).
    const startDate = new Date();
    const endDate = addMonths(startDate, 6);
    const aiAmount = Number(pending.ai_amount ?? 0);

    let subscriptionError: unknown = null;
    if (pending.kind === "ai_upgrade") {
      const { data: held } = await adminSupabase
        .from("subscriptions")
        .select("id, amount, app_share")
        .eq("user_uuid", pending.user_uuid)
        .eq("department_id", pending.department_id)
        .eq("year_of_study", pending.year_of_study)
        .eq("semester_of_study", pending.semester_of_study)
        .gte("end_date", formatDate(startDate))
        .order("end_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!held) {
        subscriptionError = "no active pass to add the AI features to";
      } else {
        const { error } = await adminSupabase
          .from("subscriptions")
          .update({
            ai_access: true,
            ai_amount: aiAmount,
            amount: Number(held.amount ?? 0) + Number(pending.amount),
            app_share: Number(held.app_share ?? 0) + aiAmount,
          })
          .eq("id", held.id);
        subscriptionError = error;
      }
    } else {
      const { error } = await adminSupabase
        .from("subscriptions")
        .insert({
          user_uuid: pending.user_uuid,
          start_date: formatDate(startDate),
          end_date: formatDate(endDate),
          payment_ref: String(mpesaReceiptNumber),
          department_id: pending.department_id,
          year_of_study: pending.year_of_study,
          semester_of_study: pending.semester_of_study,
          ai_access: !!pending.ai,
          ai_amount: aiAmount,
          amount: Number(pending.amount),
        });
      subscriptionError = error;
    }
 
    if (subscriptionError) {
      console.error("Failed to create subscription:", subscriptionError);
      // Payment confirmed by Safaricom but DB insert failed — flag for manual recovery
      await adminSupabase
        .from("pending_payments")
        .update({
          status: "paid_subscription_failed",
          callback_payload: payload,
          resolved_at: new Date().toISOString(),
        })
        .eq("checkout_request_id", CheckoutRequestID);
 
      return new Response("OK", { status: 200 });
    }
 
    // Mark pending payment as completed
    await adminSupabase
      .from("pending_payments")
      .update({
        status: "completed",
        callback_payload: payload,
        resolved_at: new Date().toISOString(),
      })
      .eq("checkout_request_id", CheckoutRequestID);
 
    console.log(
      `Subscription created for user ${pending.user_uuid} | ref: ${mpesaReceiptNumber}`
    );
  } else {
    // ❌ Payment failed or cancelled
    // Common M-PESA result codes:
    //  1032 — cancelled by user
    //  1037 — timeout waiting for customer
    //  2001 — wrong PIN
    console.log(
      `❌ M-PESA payment failed for ${CheckoutRequestID}: [${ResultCode}] ${ResultDesc}`
    );
 
    await adminSupabase
      .from("pending_payments")
      .update({
        status: "failed",
        callback_payload: payload,
        resolved_at: new Date().toISOString(),
      })
      .eq("checkout_request_id", CheckoutRequestID);
  }
 
  // Safaricom expects a 200 OK — always acknowledge
  return new Response(
    JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
 
// ── Utilities ──────────────────────────────────────────────────────────────────
 
/**
 * Converts Daraja's CallbackMetadata.Item array into a plain key-value object.
 * e.g. [{ Name: "Amount", Value: 500 }] → { Amount: 500 }
 */
function extractMetadata(
  metadata: MpesaCallbackMetadata | undefined
): Record<string, string | number> {
  if (!metadata?.Item) return {};
  return Object.fromEntries(
    metadata.Item.map((item) => [item.Name, item.Value])
  );
}
 
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
 
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}
 
// ── Types ──────────────────────────────────────────────────────────────────────
 
interface MpesaCallbackMetadata {
  Item: Array<{ Name: string; Value: string | number }>;
}
 
interface MpesaStkCallback {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number | string;
  ResultDesc: string;
  CallbackMetadata?: MpesaCallbackMetadata;
}
 
interface MpesaCallbackPayload {
  Body: {
    stkCallback: MpesaStkCallback;
  };
}