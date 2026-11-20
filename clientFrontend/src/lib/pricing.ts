import { useQuery } from "@tanstack/react-query";
import { callFunction } from "./callFunction";

export interface Prices { access: number; ai: number }

/** What the two tiers cost, from the same secrets that set the amount charged. */
export const usePrices = () =>
  useQuery({ queryKey: ["prices"], queryFn: () => callFunction<Prices>("pricing", {}), staleTime: 10 * 60 * 1000, retry: 1 });

export const ksh = (n: number) => `KSh ${n.toLocaleString("en-KE")}`;
