import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Timer, Play, Pause, RotateCcw, Coffee, Brain, SkipForward, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type TimerMode = "focus" | "break";

const PomodoroTimer = () => {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // 25 minutes in seconds
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  const focusTime = 25 * 60;
  const breakTime = 5 * 60;

  const totalTime = mode === "focus" ? focusTime : breakTime;
  const progress = ((totalTime - timeRemaining) / totalTime) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);

  const handleReset = () => {
    setIsRunning(false);
    setTimeRemaining(mode === "focus" ? focusTime : breakTime);
  };

  const switchMode = useCallback(() => {
    if (mode === "focus") {
      setSessionsCompleted((s) => s + 1);
      setMode("break");
      setTimeRemaining(breakTime);
    } else {
      setMode("focus");
      setTimeRemaining(focusTime);
    }
    setIsRunning(false);
  }, [mode]);

  const handleSkip = () => {
    switchMode();
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((t) => t - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      // Auto switch mode
      switchMode();
    }

    return () => clearInterval(interval);
  }, [isRunning, timeRemaining, switchMode]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Timer className="h-6 w-6 text-primary" />
            Pomodoro Timer
          </h2>
          <p className="text-muted-foreground mt-1">
            Stay focused with timed study sessions
          </p>
        </div>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Brain className="h-5 w-5 mx-auto text-primary mb-2" />
            <p className="text-xl font-bold">{sessionsCompleted}</p>
            <p className="text-xs text-muted-foreground">Sessions Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Timer className="h-5 w-5 mx-auto text-primary mb-2" />
            <p className="text-xl font-bold">{sessionsCompleted * 25}</p>
            <p className="text-xs text-muted-foreground">Focus Minutes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Coffee className="h-5 w-5 mx-auto text-primary mb-2" />
            <p className="text-xl font-bold">{Math.floor(sessionsCompleted / 4)}</p>
            <p className="text-xs text-muted-foreground">Long Breaks</p>
          </CardContent>
        </Card>
      </div>

      {/* Timer Display */}
      <Card className={`overflow-hidden ${mode === "focus" ? "" : "bg-success/5"}`}>
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2">
            {mode === "focus" ? (
              <Brain className="h-5 w-5 text-primary" />
            ) : (
              <Coffee className="h-5 w-5 text-success" />
            )}
            <CardTitle className="text-lg capitalize">{mode} Time</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-center pb-8">
          {/* Circular progress */}
          <div className="relative mx-auto w-64 h-64 mb-6">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted"
              />
              <motion.circle
                cx="128"
                cy="128"
                r="110"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className={mode === "focus" ? "text-primary" : "text-success"}
                initial={{ strokeDasharray: "0 692" }}
                animate={{
                  strokeDasharray: `${(progress / 100) * 692} 692`,
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold font-mono tracking-tight">
                {formatTime(timeRemaining)}
              </span>
              <span className="text-sm text-muted-foreground mt-2 capitalize">
                {mode === "focus" ? "Stay focused!" : "Take a break"}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="icon-lg" onClick={handleReset}>
              <RotateCcw className="h-5 w-5" />
            </Button>

            {isRunning ? (
              <Button
                size="xl"
                className="w-32"
                onClick={handlePause}
              >
                <Pause className="h-5 w-5" />
                Pause
              </Button>
            ) : (
              <Button
                size="xl"
                className="w-32"
                onClick={handleStart}
              >
                <Play className="h-5 w-5" />
                Start
              </Button>
            )}

            <Button variant="outline" size="icon-lg" onClick={handleSkip}>
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>

        {/* Progress bar at bottom */}
        <Progress value={progress} className="h-1 rounded-none" />
      </Card>

      {/* Current session info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Current Study Session</p>
              <p className="text-sm text-muted-foreground">Data Structures & Algorithms</p>
            </div>
            <Button variant="outline" size="sm">
              Change Unit
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PomodoroTimer;
