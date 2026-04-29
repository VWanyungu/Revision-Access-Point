import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const cleanAndParseText = (text: string) => {
  const steps = [];

  const raw = String(text)

  if (!raw || !raw.trim()) {
    console.log("Input is empty.")
    return { json: null, parsed: null, steps, error: "Input is empty." };
  }

  let s = raw;

  // Step 1: Strip JS variable wrappers / leading "content:" assignments
  s = s.replace(/^[\s\S]*?(content\s*[:=]\s*)?["'`]?\s*\{/, "{");
  steps.push("Stripped JS variable wrappers and leading content assignments");

  // Step 2: Remove JS string concatenation operators (" + " style)
  s = s.replace(/[`'"]\s*\+\s*[`'"]/g, "");
  steps.push("Removed JS string concatenation operators (+)");

  // Step 3: Unescape escape sequences
  s = s.replace(/\\n/g, " ");
  s = s.replace(/\\t/g, " ");
  s = s.replace(/\\r/g, "");
  steps.push("Replaced \\n, \\t, \\r escape sequences with spaces");

  // Step 4: Replace backticks with double quotes
  s = s.replace(/`/g, '"');
  steps.push("Replaced backticks with double quotes");

  // Step 5: Replace smart/curly quotes with straight quotes
  s = s.replace(/[\u201C\u201D]/g, '"');
  s = s.replace(/[\u2018\u2019]/g, "'");
  steps.push("Replaced curly/smart quotes with straight ASCII quotes");

  // Step 6: Remove trailing commas before } or ]
  s = s.replace(/,\s*([\}\]])/g, "$1");
  steps.push("Removed trailing commas before } or ]");

  // Step 7: Trim anything after the last closing brace
  const lastBrace = s.lastIndexOf("}");
  if (lastBrace !== -1) s = s.substring(0, lastBrace + 1);
  steps.push("Trimmed content after final closing }");

  // Step 8: Collapse excessive whitespace
  s = s.replace(/[ \t]{2,}/g, " ");
  steps.push("Collapsed multiple spaces/tabs into single space");

  // --- First parse attempt ---
  try {
    const parsed = JSON.parse(s.endsWith("}") ? s : s + "}");
    return {
      json: JSON.stringify(parsed, null, 2),
      parsed,
      steps,
      error: null,
    };
  } catch (e1) {
    console.log(e1)
    steps.push(`First parse failed: ${e1.message} — trying aggressive fixes`);
  }

  // --- Aggressive pass ---

  // Step 9: Remove control characters
  s = s.replace(/[\x00-\x1F\x7F]/g, " ");
  steps.push("Removed control characters (0x00–0x1F, 0x7F)");

  // Step 10: Quote bare/unquoted object keys
  s = s.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');
  steps.push("Quoted bare/unquoted object keys");

  // Step 11: Fix single-quoted strings -> double-quoted
  // (simple heuristic — replaces outer single quotes on values)
  s = s.replace(/:[ \t]*'([^']*)'/g, ': "$1"');
  steps.push("Converted single-quoted string values to double-quoted");

  // Step 12: Remove duplicate quotes (""value"" artifacts)
  s = s.replace(/""+/g, '"');
  steps.push("Collapsed duplicate consecutive quote characters");

  // --- Second parse attempt ---
  try {
    const parsed = JSON.parse(s.endsWith("}") ? s : s + "}");
    return {
      json: JSON.stringify(parsed, null, 2),
      parsed,
      steps,
      error: null,
    };
  } catch (e2) {
    console.log(e2)
    steps.push(`Aggressive parse also failed: ${e2.message}`);
    return {
      json: s,       // return partially cleaned string for manual review
      parsed: null,
      steps,
      error: e2.message,
    };
  }
}
