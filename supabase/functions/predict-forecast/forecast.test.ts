// Checks for the forecast arithmetic. Run with: deno run supabase/functions/predict-forecast/forecast.test.ts
import assert from "node:assert/strict";
import { computeForecast, type Analysis, type Paper, type Topic } from "./forecast.ts";

// Five topics. Topic 1 is asked in every exam, topic 2 in two of three, topic 3 only long ago, topic 5 never.
const topics: Topic[] = [1, 2, 3, 4, 5].map((id) => ({ id, title: `Topic ${id}`, position: id }));
const paper = (id: number, kind: Paper["kind"], year: string): Paper => ({ id, kind, year, url: "" });
const q = (topic_id: number, marks: number, type = "theory") => ({ number: "1", text: "", marks, type, topic_id });
const analysis = (id: number, qs: ReturnType<typeof q>[]): Analysis => ({ resource_id: id, questions: qs, total_marks: qs.reduce((n, x) => n + x.marks, 0) });

const papers = [paper(1, "exam", "2022/23"), paper(2, "exam", "2023/24"), paper(3, "exam", "2024/25"), paper(4, "cat1", "2024/25")];
const analyses = new Map<number, Analysis>([
  [1, analysis(1, [q(1, 10), q(2, 10), q(3, 10)])],
  [2, analysis(2, [q(1, 10), q(2, 10), q(4, 10)])],
  [3, analysis(3, [q(1, 15), q(4, 15)])],            // topic 2 skipped in the latest exam, but a regular
  [4, analysis(4, [q(1, 10), q(2, 10)])],
]);

const exam = computeForecast("exam", topics, papers, analyses);
const by = (id: number) => exam.topics.find((t) => t.topic_id === id)!;

assert.equal(exam.topics[0].topic_id, 1, "the topic asked every time ranks first");
assert.equal(by(1).percent, 100);
assert.ok(by(2).percent > by(3).percent, "a regular outranks a topic asked once, long ago");
assert.equal(by(5).level, "none", "a topic never asked is not forecast");
assert.match(by(2).reason, /Asked in 2 of 3 exams/);
assert.match(by(2).reason, /Not in the latest exam \(2024\/25\)/);
assert.match(by(1).reason, /Latest exam: 15 marks \(2024\/25\)/, "an exam forecast quotes the latest exam, not a CAT");
assert.equal(exam.structure.questions, 3, "average questions per exam (3, 3, 2) rounds to 3");
assert.deepEqual(exam.based_on.map((b) => b.year), ["2024/25", "2024/25", "2023/24", "2022/23"]);

// A CAT 1 is held to the early topics: topic 4 (late) is held back relative to the exam forecast.
const cat = computeForecast("cat1", topics, papers, analyses);
const catBy = (id: number) => cat.topics.find((t) => t.topic_id === id)!;
assert.ok(catBy(4).percent < by(4).percent, "late topics are held back for a CAT 1");
assert.equal(cat.topics[0].topic_id, 1);

// With nothing but one paper it still returns a ranked list without throwing.
const solo = computeForecast("exam", topics, [paper(1, "exam", "2024/25")], new Map([[1, analyses.get(1)!]]));
assert.equal(solo.topics.length, 5);

console.log("forecast: all checks passed");
