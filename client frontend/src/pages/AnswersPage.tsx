import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Calculator,
  FileText,
  Lightbulb,
  PenLine,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Hash,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { StepRenderer } from "@/components/study/StepRenderer";
import { MixedContentRenderer } from "@/components/study/MixedContentRenderer";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MarksBreakdown {
  step: string;
  marks: string;
}

interface MarksAllocation {
  total_marks: string;
  breakdown: MarksBreakdown[];
}

interface Step {
  text: string;
  latex?: string;
  code?: string;
  language?: string;
}

interface Answer {
  final_answer: string;
  working_steps: Step[];
  explanation: string;
}

export interface AnswerQuestion {
  question_number: string;
  question_text: string;
  answer_type: "calculation" | "theory" | "definition" | "essay";
  marks_allocation: MarksAllocation;
  answer: Answer;
  key_points: string[];
}

export interface AnswersData {
  document_title: string;
  questions: AnswerQuestion[];
}

interface AnswersPageProps {
  data: AnswersData;
  onBack: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const answerTypeConfig: Record<
  AnswerQuestion["answer_type"],
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  calculation: {
    label: "Calculation",
    icon: Calculator,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  theory: {
    label: "Theory",
    icon: BookOpen,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  definition: {
    label: "Definition",
    icon: FileText,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  essay: {
    label: "Essay",
    icon: PenLine,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
};

// ─── Question Card ───────────────────────────────────────────────────────────

const QuestionCard = ({
  question,
  index,
}: {
  question: AnswerQuestion;
  index: number;
}) => {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = answerTypeConfig[question.answer_type] ?? answerTypeConfig.theory;
  const TypeIcon = typeConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        {/* Question Header */}
        <CardHeader
          className="cursor-pointer select-none p-4 pb-3"
          onClick={() => setExpanded((p) => !p)}
        >
          <div className="flex items-start gap-3">
            {/* Number badge */}
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold text-sm ${typeConfig.bg} ${typeConfig.color}`}
            >
              {question.question_number}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge
                  variant="secondary"
                  className={`text-xs gap-1 ${typeConfig.color} ${typeConfig.bg} border-0`}
                >
                  <TypeIcon className="h-3 w-3" />
                  {typeConfig.label}
                </Badge>
                <Badge variant="outline" className="text-xs gap-1">
                  {/* <Star className="h-3 w-3 text-yellow-500" /> */}
                  {question.marks_allocation.total_marks} marks
                </Badge>
              </div>

              <CardTitle className="text-sm font-normal">
                {question.question_text}
                {/* <p className="text-sm">{question.question_text}</p> */}
              </CardTitle>
            </div>

            <button className="shrink-0 text-muted-foreground ml-1 mt-1">
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </CardHeader>

        {/* Expanded Answer Content */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0 px-4 pb-4 space-y-4">
                <div className="border-t border-border pt-4 space-y-4">

                  {/* Final Answer */}
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                      Final Answer
                    </p>
                    {/* <p className="text-sm">{question.answer.final_answer}</p> */}
                    <MixedContentRenderer text={question.answer.final_answer} />
                  </div>

                  {/* Working Steps */}
                  {question.answer.working_steps?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        Working / Steps
                      </p>
                      <ol className="space-y-2">
                        {question.answer.working_steps.map((step, i) => (
                          <li key={i} className="flex gap-2 text-sm">
                            <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                              {i + 1}
                            </span>
                            {/* <span className="leading-snug">{step}</span> */}
                              <StepRenderer key={i} step={step} />
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Explanation */}
                  {question.answer.explanation && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                        <Lightbulb className="h-3 w-3" />
                        Explanation
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {question.answer.explanation}
                      </p>
                    </div>
                  )}

                  {/* Key Points */}
                  {question.key_points?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Key Points
                      </p>
                      <ul className="space-y-1">
                        {question.key_points.map((point, i) => (
                          <li key={i} className="flex gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Marks Breakdown */}
                  {question.marks_allocation.breakdown?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Marks Breakdown
                      </p>
                      <div className="space-y-1">
                        {question.marks_allocation.breakdown.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-sm rounded-md px-3 py-1.5 bg-muted/40"
                          >
                            <span className="text-muted-foreground">{item.step}</span>
                            <Badge variant="secondary" className="text-xs">
                              {item.marks} mark{Number(item.marks) !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AnswersPage({ data, onBack }: AnswersPageProps) {
  const totalMarks = data.questions.reduce(
    (sum, q) => sum + (Number(q.marks_allocation.total_marks) || 0),
    0
  );

  return (
    <div className="space-y-6 w-full md:px-6 lg:px-72 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 md:px-0"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-4 gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Resources
        </Button>

        <Card className="gradient-primary text-primary-foreground overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col gap-2">
              <p className="text-primary-foreground/70 text-sm">Generated Answers</p>
              <h1 className="text-2xl font-bold leading-snug">{data.document_title}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge
                  variant="default"
                  className="font-light border border-primary-foreground/20"
                >
                  {data.questions.length} question{data.questions.length !== 1 ? "s" : ""}
                </Badge>
                {totalMarks > 0 && (
                  <Badge
                    variant="default"
                    className="font-light border border-primary-foreground/20"
                  >
                    {totalMarks} total marks
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Questions */}
      <div className="px-6 md:px-0 space-y-3">
        {data.questions.map((q, i) => (
          <QuestionCard key={q.question_number ?? i} question={q} index={i} />
        ))}
      </div>
    </div>
  );
}
