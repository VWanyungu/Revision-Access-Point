import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Timer, Gauge, X, ChevronRight, ChevronLeft, CheckCircle2, XCircle, RotateCcw, BookOpen, PenBoxIcon, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";

interface QuizSystemProps {
  isOpen: boolean;
  onClose: () => void;
  resourcePublicAccessUrl: string;
  resourceTitle: string;
}

type QuizState = "setup" | "playing" | "results";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  topic: string;
}

const sampleQuestions: Question[] = [
  {
    id: 1,
    question: "What is the time complexity of accessing an element in an array by index?",
    options: ["O(1)", "O(n)", "O(log n)", "O(n²)"],
    correctAnswer: 0,
    topic: "Arrays",
  },
  {
    id: 2,
    question: "Which data structure uses LIFO (Last In First Out) principle?",
    options: ["Queue", "Stack", "Linked List", "Tree"],
    correctAnswer: 1,
    topic: "Stacks",
  },
  {
    id: 3,
    question: "What is the worst-case time complexity of Quick Sort?",
    options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"],
    correctAnswer: 2,
    topic: "Sorting",
  },
  {
    id: 4,
    question: "In a binary search tree, where is the smallest element located?",
    options: ["Root node", "Leftmost leaf", "Rightmost leaf", "Any leaf node"],
    correctAnswer: 1,
    topic: "Trees",
  },
  {
    id: 5,
    question: "Which traversal visits the root node first?",
    options: ["Inorder", "Preorder", "Postorder", "Level order"],
    correctAnswer: 1,
    topic: "Trees",
  },
];

const QuizSystem = ({ isOpen, onClose, resourcePublicAccessUrl, resourceTitle }: QuizSystemProps) => {
  const [state, setState] = useState<QuizState>("setup");
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [timerEnabled, setTimerEnabled] = useState(true);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeRemaining, setTimeRemaining] = useState(30);

  // const questions = sampleQuestions.slice(0, questionCount);
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const generateQuiz = async () => {
    const response = await fetch(
      "https://ptktlornnngqvzbbisaq.supabase.co/functions/v1/generate-quiz",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${JSON.parse(localStorage.getItem('sb-ptktlornnngqvzbbisaq-auth-token')).access_token}`,
        },
        body: JSON.stringify({
          fileUrl: resourcePublicAccessUrl,
          numberOfQuestions: questionCount,
          difficulty: difficulty,
        }),
      }
    ).then((res) => res.json())
      .then((data) => {
        if (data.error) {
          toast({
            title: "Error",
            description: `${data.error}`,
          });
          setIsLoading(false)
          return
        }

        setQuestions(data.data)
        setIsLoading(false)
        return
      })
  }

  const handleStartQuiz = async () => {
    setIsLoading(true)
    await generateQuiz()
    setIsLoading(false)

    setState("playing");
    setCurrentQuestion(0);
    setAnswers({});
    setTimeRemaining(30);
  };

  const handleAnswer = (answerIndex: number) => {
    setAnswers({ ...answers, [currentQuestion]: answerIndex });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setTimeRemaining(30);
    } else {
      setState("results");
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) correct++;
    });
    return { correct, total: questions.length, percentage: Math.round((correct / questions.length) * 100) };
  };

  const getWeakTopics = () => {
    const topicScores: Record<string, { correct: number; total: number }> = {};
    questions.forEach((q, idx) => {
      if (!topicScores[q.topic]) {
        topicScores[q.topic] = { correct: 0, total: 0 };
      }
      topicScores[q.topic].total++;
      if (answers[idx] === q.correctAnswer) {
        topicScores[q.topic].correct++;
      }
    });
    return Object.entries(topicScores)
      .filter(([_, score]) => score.correct / score.total < 0.7)
      .map(([topic]) => topic);
  };

  const handleRestart = () => {
    setState("setup");
    setAnswers({});
    setCurrentQuestion(0);
  };

  const handleRetry = () => {
    setState("playing");
    setAnswers({});
    setCurrentQuestion(0);
  };

  const handleClose = () => {
    handleRestart();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-2rem)] rounded-lg md:max-w-2xl md:h-auto md:max-h-[90vh] overflow-auto flex flex-col md:block justify-center">
        <AnimatePresence mode="wait">
          {/* Setup Screen */}
          {state === "setup" && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 justify-center">
                  Generate Quiz
                </DialogTitle>
                <DialogDescription className="text-center">
                  {resourceTitle && `${resourceTitle}`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {/* Question count */}
                <div className="space-y-3">
                  <Label className="flex items-center justify-between">
                    Number of Questions
                    <span className="font-bold text-primary">{questionCount}</span>
                  </Label>
                  <Slider
                    value={[questionCount]}
                    onValueChange={([v]) => setQuestionCount(v)}
                    min={5}
                    max={20}
                    step={5}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5</span>
                    <span>10</span>
                    <span>15</span>
                    <span>20</span>
                  </div>
                </div>

                {/* Difficulty */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    Difficulty
                  </Label>
                  <RadioGroup
                    value={difficulty}
                    onValueChange={setDifficulty}
                    className="grid grid-cols-3 gap-2"
                  >
                    {["easy", "medium", "hard"].map((level) => (
                      <div key={level}>
                        <RadioGroupItem value={level} id={level} className="peer sr-only" />
                        <Label
                          htmlFor={level}
                          className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 capitalize cursor-pointer transition-colors"
                        >
                          {level}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Cominf soon */}
                <div className="relative">

                  {/* Timer toggle */}
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Timer className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Timer</p>
                        <p className="text-sm text-muted-foreground">30 seconds per question</p>
                      </div>
                    </div>
                    <Button
                      variant={timerEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimerEnabled(!timerEnabled)}
                    >
                      {timerEnabled ? "On" : "Off"}
                    </Button>
                  </div>

                  <div className="absolute inset-0 z-10 flex items-center justify-center
                                  bg-black/20 backdrop-blur-sm rounded-xl">
                    <span className="text-white font-semibold tracking-wide">
                      Question timer coming soon
                    </span>
                  </div>
                </div>

                <Button variant="accent" size="xl" className="w-full" disabled={isLoading} onClick={handleStartQuiz}>
                  {isLoading ? (
                    <Loader className="h-5 w-5 animate-spin" />
                  ) : (<> Generate Quiz</>)}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Playing Screen */}
          {state === "playing" && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <DialogHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base">
                    Question {currentQuestion + 1} of {questions.length}
                  </DialogTitle>
                  {timerEnabled && (
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <span className={timeRemaining <= 10 ? "text-accent" : ""}>{timeRemaining}s</span>
                    </div>
                  )}
                </div>
                <Progress value={progress} className="h-2 mt-3" />
              </DialogHeader>

              <div className="py-6">
                <motion.div
                  key={currentQuestion}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="text-lg font-medium mb-6">
                    {questions[currentQuestion]?.question}
                  </p>

                  <RadioGroup
                    value={answers[currentQuestion]?.toString()}
                    onValueChange={(v) => handleAnswer(parseInt(v))}
                    className="space-y-3"
                  >
                    {questions[currentQuestion]?.options.map((option, idx) => (
                      <div key={idx}>
                        <RadioGroupItem value={idx.toString()} id={`option-${idx}`} className="peer sr-only" />
                        <Label
                          htmlFor={`option-${idx}`}
                          className="flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-secondary peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm font-medium peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </motion.div>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <Button
                  variant="ghost"
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant={currentQuestion === questions.length - 1 ? "accent" : "default"}
                  onClick={handleNext}
                  disabled={answers[currentQuestion] === undefined}
                >
                  {currentQuestion === questions.length - 1 ? "Finish" : "Next"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Results Screen */}
          {state === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <DialogHeader>
                <DialogTitle>Quiz Complete!</DialogTitle>
              </DialogHeader>

              <div className="py-8">
                {/* Score circle */}
                <div className="relative mx-auto w-40 h-40 mb-6">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-muted"
                    />
                    <motion.circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      strokeLinecap="round"
                      className={calculateScore().percentage >= 70 ? "text-success" : "text-accent"}
                      initial={{ strokeDasharray: "0 440" }}
                      animate={{
                        strokeDasharray: `${(calculateScore().percentage / 100) * 440} 440`,
                      }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold">{calculateScore().percentage}%</span>
                    <span className="text-sm text-muted-foreground">
                      {calculateScore().correct}/{calculateScore().total} correct
                    </span>
                  </div>
                </div>

                {/* Weak topics */}
                {getWeakTopics().length > 0 && (
                  <Card className="text-left mb-6">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-accent" />
                        Topics to Review
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {getWeakTopics().map((topic) => (
                          <span key={topic} className="px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button variant="outline" onClick={handleRetry}>
                    <RotateCcw className="h-4 w-4" />
                    Retry Quiz
                  </Button>
                  <Button variant="outline" onClick={handleRestart}>
                    <PenBoxIcon className="h-4 w-4" />
                    Generate New Quiz
                  </Button>
                  <div className="relative">
                    <Button variant="accent" className="w-full md:w-auto">
                      <BookOpen className="h-4 w-4" />
                      Create Flashcards
                    </Button>

                    <div className="absolute inset-0 z-10 flex items-center justify-center
                                    bg-black/10 backdrop-blur-sm rounded-xl">
                      <span className="text-white font-semibold tracking-wide">
                        Flashcards Coming Soon
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default QuizSystem;
