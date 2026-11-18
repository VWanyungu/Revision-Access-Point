// Fails when a font size sits outside the type scale defined in tailwind.config.ts (theme.fontSize).
// Tailwind itself accepts any `text-[13px]`, so this is what keeps the scale honest. Run by `npm run lint`.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..", "src");

const RULES = [
  { re: /(?<![\w-])(?:[a-z0-9-]+:)*text-\[[0-9.]+(?:px|rem|em)\]/g, why: "arbitrary text size" },
  { re: /(?<![\w-])(?:[a-z0-9-]+:)*text-(?:2xs|xxs|md|6xl|7xl|8xl|9xl)(?![\w-])/g, why: "size is not in the scale" },
  { re: /fontSize\s*:/g, why: "inline fontSize" },
];

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(p) ? [p] : [];
});

const problems = [];
for (const file of walk(root)) {
  readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    for (const { re, why } of RULES) {
      for (const m of line.matchAll(re)) problems.push(`${file.replace(root, "src")}:${i + 1}  ${m[0]}  (${why})`);
    }
  });
}

if (problems.length) {
  console.error(`Type scale: ${problems.length} problem(s). Use text-xs, sm, base, lg, xl, 2xl, 3xl, 4xl or 5xl (see tailwind.config.ts).\n`);
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("Type scale: ok");
