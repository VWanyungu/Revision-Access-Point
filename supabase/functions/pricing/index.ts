// Tells the app what the two tiers cost, so the price is shown from the same secrets that set the amount charged.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsFor, reply } from "../_shared/guard.ts";
import { getPrices } from "../_shared/pricing.ts";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsFor(req) });
  try {
    return reply(req, getPrices());
  } catch (err) {
    console.error("pricing:", err);
    return reply(req, { error: "Prices are not available right now" }, 500);
  }
});
