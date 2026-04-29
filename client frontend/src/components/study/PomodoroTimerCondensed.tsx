import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Timer, Play, Pause, RotateCcw, Coffee, Brain, SkipForward, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type TimerMode = "focus" | "break";

const PomodoroTimerCondensed = () => {
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
    // <div className="space-y-6 border border-primary-foreground/20 rounded-lg">
    //   <Card className={`overflow-hidden ${mode === "focus" ? "" : "bg-success/5"}`}>
    //     <CardHeader className="text-center pb-2">
    //       {/* <div className="flex items-center justify-center gap-2">
    //         {mode === "focus" ? (
    //           <Brain className="h-5 w-5 text-primary" />
    //         ) : (
    //           <Coffee className="h-5 w-5 text-success" />
    //         )}
    //         <CardTitle className="text-lg capitalize">{mode} Time</CardTitle>
    //       </div> */}
    //     </CardHeader>
    //     <CardContent className="text-center pb-8 flex">
    //         {/* <div className="absolute inset-0 flex flex-col items-center justify-center">
    //           <span className="text-6xl font-bold font-mono tracking-tight">
    //             {formatTime(timeRemaining)}
    //           </span>
    //           <span className="text-sm text-muted-foreground mt-2 capitalize">
    //             {mode === "focus" ? "Stay focused!" : "Take a break"}
    //           </span>
    //         </div> */}

    //       {/* Controls */}
    //       {/* <div className="flex items-center justify-center gap-3">
    //         <Button variant="outline" size="icon-lg" onClick={handleReset}>
    //           <RotateCcw className="h-5 w-5" />
    //         </Button>

    //         {isRunning ? (
    //           <Button
    //             size="xl"
    //             className="w-32"
    //             onClick={handlePause}
    //           >
    //             <Pause className="h-5 w-5" />
    //             Pause
    //           </Button>
    //         ) : (
    //           <Button
    //             size="xl"
    //             className="w-32"
    //             onClick={handleStart}
    //           >
    //             <Play className="h-5 w-5" />
    //             Start
    //           </Button>
    //         )}

    //         <Button variant="outline" size="icon-lg" onClick={handleSkip}>
    //           <SkipForward className="h-5 w-5" />
    //         </Button>
    //       </div> */}
    //     </CardContent>

    //     {/* Progress bar at bottom */}
    //     <Progress value={progress} className="h-1 rounded-none" />
    //   </Card>

    // </div>
    <div className="flex gap-4">
      <motion.div
        className="w-full flex items-center justify-center bg-primary-foreground backdrop-blur-md border-gray-800/50 rounded-lg"
      >
        {/* Progress background */}
        <motion.div
          className={`
                absolute inset-0 origin-left
                ${progress / 100 >= 1 ? 'bg-white' : 'bg-green-400'}
                transition-colors duration-700 rounded-lg
                `}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress / 100 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />

        {/* Content layer */}
        <div className="relative z-10 flex items-center justify-center gap-10 md:gap-16 w-full max-w-4xl px-4 sm:px-6">
          {/* Timer display */}
          {/* <div
                className={`
                    text-3xl md:text-4xl font-mono font-bold tracking-wider drop-shadow-md transition-colors
                    ${progress >= 1 ? 'text-gray-900' : 'text-white'}
                `}
                >
                    {formatTime(timeRemaining)}
                </div> */}

          <span className={`text-3xl font-bold font-mono tracking-tight text-primary`}>
            {formatTime(timeRemaining)}
          </span>

          {/* Controls */}
          {/* <div className="flex gap-4">
                <button
                    className={`
                    w-11 h-11 rounded-full flex items-center justify-center text-white transition-all active:scale-95
                    ${isRunning ? 'bg-red-600/80 hover:bg-red-600' : 'bg-emerald-600/80 hover:bg-emerald-600'}
                    `}
                    aria-label={isRunning ? "Pause" : "Play"}
                >
                    {isRunning ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                    ) : (
                    <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5.14v14.72l11-7.36z" />
                    </svg>
                    )}
                </button>

                <button
                    className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95"
                    aria-label="Skip"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M9 5l7 7-7 7M5 5l7 7-7 7"
                    />
                    </svg>
                </button>
                </div> */}
        </div>
      </motion.div>

      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" size="icon-lg" onClick={handleReset}>
          <RotateCcw className="h-5 w-5" />
        </Button>

        {isRunning ? (
          <Button
            size="xl"
            className="w-20 md:w-32"
            onClick={handlePause}
          >
            <Pause className="h-5 w-5" />
            <span className="hidden md:block">Pause</span>
          </Button>
        ) : (
          <Button
            size="xl"
            className="w-20 md:w-32"
            onClick={handleStart}
          >
            <Play className="h-5 w-5" />
            <span className="hidden md:block">Start</span>
          </Button>
        )}

        <Button variant="outline" size="icon-lg" onClick={handleSkip}>
          <SkipForward className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default PomodoroTimerCondensed;
