import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Check, RotateCcw, ChevronLeft, ChevronRight, Brain, Filter, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
  known: boolean;
}

const sampleFlashcards: Flashcard[] = [
  { id: "1", front: "What is the time complexity of binary search?", back: "O(log n) - Because it halves the search space with each comparison.", topic: "Algorithms", known: false },
  { id: "2", front: "Define a Stack data structure", back: "A linear data structure that follows LIFO (Last In First Out) principle. Elements are added and removed from the same end.", topic: "Data Structures", known: false },
  { id: "3", front: "What is recursion?", back: "A programming technique where a function calls itself to solve smaller instances of the same problem.", topic: "Programming", known: true },
  { id: "4", front: "Explain Big O notation", back: "A mathematical notation that describes the upper bound of an algorithm's time or space complexity in the worst case scenario.", topic: "Algorithms", known: false },
  { id: "5", front: "What is a Binary Search Tree?", back: "A tree data structure where each node has at most two children, and for each node, all left descendants are smaller and all right descendants are larger.", topic: "Data Structures", known: true },
];

const FlashcardSystem = () => {
  const [cards, setCards] = useState(sampleFlashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filter, setFilter] = useState<"all" | "review" | "known">("all");

  const filteredCards = cards.filter((card) => {
    if (filter === "review") return !card.known;
    if (filter === "known") return card.known;
    return true;
  });

  const currentCard = filteredCards[currentIndex];
  const progress = filteredCards.length > 0 ? ((currentIndex + 1) / filteredCards.length) * 100 : 0;
  const knownCount = cards.filter((c) => c.known).length;

  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleNext = () => {
    if (currentIndex < filteredCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleMarkKnown = () => {
    if (currentCard) {
      setCards(cards.map((c) => (c.id === currentCard.id ? { ...c, known: true } : c)));
      handleNext();
    }
  };

  const handleMarkReview = () => {
    if (currentCard) {
      setCards(cards.map((c) => (c.id === currentCard.id ? { ...c, known: false } : c)));
      handleNext();
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Flashcards
          </h2>
          <p className="text-muted-foreground mt-1">
            {knownCount} of {cards.length} cards mastered
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(["all", "review", "known"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFilter(f);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className="capitalize"
            >
              {f === "all" ? "All" : f === "review" ? "To Review" : "Known"}
            </Button>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">
            {currentIndex + 1} / {filteredCards.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {filteredCards.length > 0 ? (
        <>
          {/* Flashcard */}
          <div className="flex justify-center py-4">
            <div
              className="relative w-full max-w-lg h-72 cursor-pointer perspective-1000"
              onClick={handleFlip}
              style={{ perspective: "1000px" }}
            >
              <motion.div
                className="relative w-full h-full"
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Front */}
                <Card
                  className="absolute inset-0 flex flex-col items-center justify-center p-8 shadow-elevated"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <Badge variant="secondary" className="mb-4">
                    {currentCard?.topic}
                  </Badge>
                  <p className="text-xl font-medium text-center leading-relaxed">
                    {currentCard?.front}
                  </p>
                  <p className="absolute bottom-4 text-xs text-muted-foreground">
                    Click to flip
                  </p>
                </Card>

                {/* Back */}
                <Card
                  className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-primary text-primary-foreground shadow-elevated"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <Sparkles className="h-6 w-6 mb-4 opacity-50" />
                  <p className="text-lg text-center leading-relaxed">
                    {currentCard?.back}
                  </p>
                </Card>
              </motion.div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={handleMarkReview}
              className="min-w-32"
            >
              <RotateCcw className="h-4 w-4" />
              Review Again
            </Button>

            <Button
              variant="success"
              size="lg"
              onClick={handleMarkKnown}
              className="min-w-32"
            >
              <Check className="h-4 w-4" />
              Got it!
            </Button>

            <Button
              variant="ghost"
              size="icon-lg"
              onClick={handleNext}
              disabled={currentIndex === filteredCards.length - 1}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          {/* Keyboard hints */}
          <p className="text-center text-sm text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">Space</kbd> to flip,{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">←</kbd>{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">→</kbd> to navigate
          </p>
        </>
      ) : (
        <Card className="py-12 text-center">
          <CardContent>
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No flashcards found</h3>
            <p className="text-muted-foreground mb-4">
              {filter === "review"
                ? "Great job! You've mastered all your flashcards."
                : filter === "known"
                ? "No cards marked as known yet."
                : "Start by generating flashcards from your study materials."}
            </p>
            <Button onClick={() => setFilter("all")}>View All Cards</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FlashcardSystem;
