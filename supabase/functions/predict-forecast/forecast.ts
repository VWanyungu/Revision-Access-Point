// The forecast arithmetic. Pure functions (no Deno, no network) so they can be tested on their own.

export type Kind = "cat1" | "cat2" | "exam";
export interface Topic { id: number; title: string; position: number }
export interface Paper { id: number; kind: "cat1" | "cat2" | "exam" | "supplementary"; year: string; url: string }
export interface Question { number: string; text: string; marks: number; type: string; topic_id: number | null }
export interface Analysis { resource_id: number; questions: Question[]; total_marks: number }

const KIND_LABEL: Record<string, string> = { cat1: "CAT 1", cat2: "CAT 2", exam: "exam", supplementary: "supplementary exam" };

// ── Step 2: the forecast ─────────────────────────────────────────────────────

const startYear = (y: string) => Number(y.slice(0, 4));

/** How much a past paper counts towards predicting `target`. */
const weight = (target: Kind, p: Paper) => {
  if (target === "exam") return p.kind === "exam" ? 1 : p.kind === "supplementary" ? 0.5 : 0.3;
  if (p.kind === target) return 1;
  return p.kind === "cat1" || p.kind === "cat2" ? 0.4 : 0.3; // the other CAT, then exams (they show what matters in the unit)
};

const sameKind = (target: Kind, p: Paper) => (target === "exam" ? p.kind === "exam" || p.kind === "supplementary" : p.kind === target);

export const computeForecast = (target: Kind, topics: Topic[], papers: Paper[], analyses: Map<number, Analysis>) => {
  const used = papers.filter((p) => analyses.has(p.id));
  const latest = Math.max(...used.map((p) => startYear(p.year)));
  const same = used.filter((p) => sameKind(target, p)).sort((a, b) => startYear(b.year) - startYear(a.year));

  const marksBy = (p: Paper) => {
    const a = analyses.get(p.id)!;
    const m = new Map<number, number>();
    for (const q of a.questions) if (q.topic_id != null) m.set(q.topic_id, (m.get(q.topic_id) ?? 0) + (q.marks || 1));
    return { m, total: a.total_marks || a.questions.length || 1 };
  };

  const score = new Map<number, number>();
  const history = new Map<number, { year: string; kind: string; marks: number }[]>();
  for (const p of used) {
    const { m, total } = marksBy(p);
    const w = weight(target, p) * Math.pow(0.8, latest - startYear(p.year)); // newer papers count more
    for (const [topicId, marks] of m) {
      score.set(topicId, (score.get(topicId) ?? 0) + (w * marks) / total);
      history.set(topicId, [...(history.get(topicId) ?? []), { year: p.year, kind: p.kind, marks }]);
    }
  }

  // A topic that was skipped last time, but is a regular, is due: lift it a little.
  const lastSame = same[0];
  const seenIn = (topicId: number, ps: Paper[]) => ps.filter((p) => marksBy(p).m.has(topicId)).length;
  if (lastSame) {
    for (const t of topics) {
      if (!marksBy(lastSame).m.has(t.id) && seenIn(t.id, same.slice(1)) >= 2) score.set(t.id, (score.get(t.id) ?? 0) * 1.25);
    }
  }

  // CATs cover part of the syllabus. Learn the range from earlier CATs of the same kind; with none, assume the first half
  // for CAT 1 and the later part for CAT 2. Topics outside the range are held back.
  if (target !== "exam") {
    const n = topics.length;
    const position = new Map(topics.map((t, i) => [t.id, i]));
    let lo = target === "cat1" ? 0 : Math.floor(n * 0.35);
    let hi = target === "cat1" ? Math.ceil(n * 0.5) - 1 : n - 1;
    const seen = same.flatMap((p) => [...marksBy(p).m.keys()]).map((id) => position.get(id)).filter((i): i is number => i !== undefined);
    if (seen.length) { lo = Math.min(...seen); hi = Math.max(...seen); }
    for (const t of topics) {
      const i = position.get(t.id)!;
      if (i < lo || i > hi) score.set(t.id, (score.get(t.id) ?? 0) * 0.4);
    }
  }

  const max = Math.max(0, ...score.values());
  const ranked = topics
    .map((t) => {
      const s = score.get(t.id) ?? 0;
      const percent = max > 0 ? Math.round((100 * s) / max) : 0;
      const hist = (history.get(t.id) ?? []).sort((a, b) => startYear(b.year) - startYear(a.year));
      const histSame = hist.filter((h) => (target === "exam" ? h.kind === "exam" || h.kind === "supplementary" : h.kind === target));
      const inSame = seenIn(t.id, same);
      // "Latest" is the most recent paper of the kind being forecast; only if there is none does it fall back to any paper.
      const latestEntry = histSame[0] ?? hist[0];
      const reason = hist.length === 0
        ? "Not asked in the papers we have."
        : [
            same.length ? `Asked in ${inSame} of ${same.length} ${KIND_LABEL[target]}${same.length === 1 ? "" : "s"}.` : `Asked in ${hist.length} of ${used.length} earlier papers.`,
            lastSame && !marksBy(lastSame).m.has(t.id)
              ? `Not in the latest ${KIND_LABEL[target]} (${lastSame.year}).`
              : `Latest ${KIND_LABEL[latestEntry.kind]}: ${latestEntry.marks} marks (${latestEntry.year}).`,
          ].join(" ");
      return {
        topic_id: t.id, title: t.title, position: t.position, percent,
        level: percent >= 66 ? "high" : percent >= 33 ? "medium" : percent > 0 ? "low" : "none",
        reason, history: hist,
      };
    })
    .sort((a, b) => b.percent - a.percent || a.position - b.position);

  // The usual shape of this kind of paper, from the papers of the same kind (or all of them when there are none).
  const shape = (same.length ? same : used).map((p) => analyses.get(p.id)!);
  const avg = (f: (a: Analysis) => number) => Math.round(shape.reduce((n, a) => n + f(a), 0) / shape.length);
  const typeCount = new Map<string, number>();
  shape.flatMap((a) => a.questions).forEach((q) => typeCount.set(q.type, (typeCount.get(q.type) ?? 0) + 1));
  const typeTotal = [...typeCount.values()].reduce((n, c) => n + c, 0) || 1;

  return {
    kind: target,
    topics: ranked,
    structure: {
      questions: avg((a) => a.questions.length),
      total_marks: avg((a) => a.total_marks),
      types: [...typeCount.entries()].map(([type, c]) => ({ type, percent: Math.round((100 * c) / typeTotal) })).sort((a, b) => b.percent - a.percent),
    },
    based_on: used.map((p) => ({ kind: p.kind, year: p.year })).sort((a, b) => startYear(b.year) - startYear(a.year)),
  };
};


