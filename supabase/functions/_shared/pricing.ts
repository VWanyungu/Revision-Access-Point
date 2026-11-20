/**
 * The two prices, in whole Kenyan shillings, from Supabase secrets:
 *   supabase secrets set PRICE_ACCESS=100 PRICE_AI=150
 * They are read here and nowhere in the browser, so the amount charged can never be chosen by the client.
 */
export interface Prices { access: number; ai: number }

export const getPrices = (): Prices => {
  const read = (name: string) => {
    const n = Number(Deno.env.get(name));
    if (!Number.isInteger(n) || n <= 0) throw new Error(`${name} is not set to a whole number above 0`);
    return n;
  };
  return { access: read("PRICE_ACCESS"), ai: read("PRICE_AI") };
};
