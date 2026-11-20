// Checks for the practice-paper prompt and validation. Run with: deno run supabase/functions/predict-paper/paper.test.ts
import assert from "node:assert/strict";
import { buildAnswersPrompt, buildPrompt, targetSize, validateAnswers, validatePaper, type Forecast } from "./paper.ts";

const forecast: Forecast = {
  topics: [
    { topic_id: 1, title: "Time management", percent: 100, level: "high", reason: "Asked in 2 of 2 exams." },
    { topic_id: 2, title: "Risk management", percent: 50, level: "medium", reason: "Asked in 1 of 2 exams." },
    { topic_id: 3, title: "Reference texts", percent: 0, level: "none", reason: "Not asked." },
  ],
  structure: { questions: 19, total_marks: 125, types: [{ type: "theory", percent: 70 }, { type: "calculation", percent: 30 }] },
};

// Size is the usual size of the paper, kept within practice-friendly limits.
assert.deepEqual(targetSize(forecast), { questions: 12, marks: 100 });
assert.deepEqual(targetSize({ ...forecast, structure: { ...forecast.structure, questions: 2, total_marks: 10 } }), { questions: 4, marks: 30 });

// The prompt names likely topics only, quotes past phrasing, and states the size.
const prompt = buildPrompt("Software Project Management", "exam", forecast, [{ topic_id: 1, text: "Define the critical path." }]);
assert.match(prompt, /topic_id 1: Time management \(high\)/);
assert.match(prompt, /"Define the critical path\."/);
assert.doesNotMatch(prompt, /Reference texts/, "topics that were never asked are not offered");
assert.match(prompt, /About 12 questions/);

// Validation cleans a reply and rejects an unusable one.
const ids = new Set([1, 2]);
const good = validatePaper({
  title: "Practice exam", duration_minutes: 5, instructions: "",
  questions: [
    { number: 1, text: "Explain the steps of drawing a network diagram and finding its critical path.", marks: 10, topic_id: 1, type: "essay", reason: "Time is asked every year." },
    { number: "2", text: "Describe two ways a project team can respond to a negative risk.", marks: 8, topic_id: 99, type: "nonsense", reason: "" },
    { number: "3", text: "Too short", marks: 5, topic_id: 2, type: "theory", reason: "" },
    { number: "4", text: "State the purpose of a risk register in a software project.", marks: 6, topic_id: 2, type: "definition", reason: "x" },
  ],
}, "exam", ids);
assert.equal(good.questions.length, 3, "a question with almost no text is dropped");
assert.equal(good.total_marks, 24);
assert.equal(good.duration_minutes, 30, "duration is kept within 30 to 180 minutes");
assert.equal(good.questions[1].topic_id, null, "an unknown topic id becomes null");
assert.equal(good.questions[1].type, "theory", "an unknown type becomes theory");
assert.equal(good.instructions, "Answer all questions.");
assert.throws(() => validatePaper({ questions: [{ text: "only one decent question here", marks: 5, topic_id: 1 }] }, "exam", ids));

// Model answers line up with the paper and their mark breakdowns add up to each question's marks.
const answerFor = (n: string, marks: string[], final = "A full model answer for this question.") => ({
  question_number: n, question_text: "x", answer_type: "essay",
  marks_allocation: { total_marks: "0", breakdown: marks.map((m, i) => ({ step: `Point ${i + 1}`, marks: m })) },
  answer: { final_answer: final, working_steps: [{ text: "Step one", latex: "a = b" }], explanation: "Because." },
  key_points: ["one", " two "],
});
const answers = validateAnswers({ questions: [answerFor("1", ["5", "4"]), answerFor("2", ["3", "3"]), answerFor("4", ["6"], "")] }, good, );
assert.equal(answers.questions.length, 3, "one answer per paper question");
assert.deepEqual(answers.questions[0].marks_allocation.breakdown.map((b) => b.marks), ["5", "5"], "breakdown is forced to add up to the question's marks (10)");
assert.equal(answers.questions[0].marks_allocation.total_marks, "10");
assert.equal(answers.questions[2].answer.final_answer, "No model answer was written for this question.", "a blank answer is replaced, not shown empty");
assert.deepEqual(answers.questions[0].key_points, ["one", "two"]);
assert.equal(answers.questions[0].answer.working_steps[0].latex, "a = b");
assert.throws(() => validateAnswers({ questions: [] }, good), /too many questions/);
assert.match(buildAnswersPrompt("SPM", good, () => "Time management"), /Question 1 \(10 marks, topic: Time management\)/);

console.log("paper: all checks passed");
