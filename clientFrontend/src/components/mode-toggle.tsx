import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";
import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      className="relative border-border/50 bg-background/50 backdrop-blur-md overflow-hidden"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <motion.div
        initial={false}
        animate={{
          y: theme === "light" ? 0 : 40,
          opacity: theme === "light" ? 1 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="absolute inset-0 flex items-center justify-center text-primary"
      >
        <Sun className="h-5 w-5" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{
          y: theme === "dark" ? 0 : -40,
          opacity: theme === "dark" ? 1 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="absolute inset-0 flex items-center justify-center text-primary"
      >
        <Moon className="h-5 w-5" />
      </motion.div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
