import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Brain, Timer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ViewMode = "week" | "month";

interface CalendarEvent {
  id: string;
  title: string;
  type: "quiz" | "study" | "exam";
  date: Date;
  time?: string;
}

const events: CalendarEvent[] = [
  { id: "1", title: "Data Structures Quiz", type: "quiz", date: new Date(2024, 0, 15), time: "10:00" },
  { id: "2", title: "Study Session: Trees", type: "study", date: new Date(2024, 0, 16), time: "14:00" },
  { id: "3", title: "Mid-term Exam", type: "exam", date: new Date(2024, 0, 20), time: "09:00" },
  { id: "4", title: "Algorithm Practice", type: "study", date: new Date(2024, 0, 17) },
  { id: "5", title: "Sorting Quiz", type: "quiz", date: new Date(2024, 0, 18), time: "11:00" },
];

const getEventTypeIcon = (type: string) => {
  switch (type) {
    case "quiz":
      return Brain;
    case "study":
      return Timer;
    case "exam":
      return FileText;
    default:
      return CalendarIcon;
  }
};

const getEventTypeColor = (type: string) => {
  switch (type) {
    case "quiz":
      return "bg-primary text-primary-foreground";
    case "study":
      return "bg-success text-success-foreground";
    case "exam":
      return "bg-accent text-accent-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const StudyCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");

  const getDaysInWeek = (date: Date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add padding for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      const d = new Date(year, month, -i);
      days.unshift(d);
    }

    // Add all days in the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "week") {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setMonth(currentDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "week") {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const days = viewMode === "week" ? getDaysInWeek(currentDate) : getDaysInMonth(currentDate);
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getEventsForDay = (date: Date) => {
    return events.filter((e) => e.date.toDateString() === date.toDateString());
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Study Calendar
          </h2>
          <p className="text-muted-foreground mt-1">
            Plan and track your study sessions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("week")}
          >
            Week
          </Button>
          <Button
            variant={viewMode === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("month")}
          >
            Month
          </Button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={navigatePrevious}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-lg">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className={`grid grid-cols-7 gap-1 ${viewMode === "week" ? "" : ""}`}>
            {days.map((day, index) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();

              return (
                <motion.div
                  key={day.toISOString()}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className={`min-h-24 p-2 rounded-lg border transition-colors ${
                    isToday(day)
                      ? "bg-primary/5 border-primary"
                      : isCurrentMonth
                      ? "bg-card border-border hover:bg-secondary/50"
                      : "bg-muted/30 border-transparent"
                  }`}
                >
                  <p
                    className={`text-sm font-medium mb-1 ${
                      isToday(day)
                        ? "text-primary"
                        : isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {day.getDate()}
                  </p>

                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((event) => {
                      const Icon = getEventTypeIcon(event.type);
                      return (
                        <div
                          key={event.id}
                          className={`text-xs p-1 rounded flex items-center gap-1 truncate ${getEventTypeColor(
                            event.type
                          )}`}
                        >
                          <Icon className="h-3 w-3 shrink-0" />
                          <span className="truncate">{event.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <p className="text-xs text-muted-foreground">+{dayEvents.length - 2} more</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events.slice(0, 4).map((event) => {
              const Icon = getEventTypeIcon(event.type);
              return (
                <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getEventTypeColor(event.type)}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.date.toLocaleDateString()} {event.time && `at ${event.time}`}
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {event.type}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudyCalendar;
