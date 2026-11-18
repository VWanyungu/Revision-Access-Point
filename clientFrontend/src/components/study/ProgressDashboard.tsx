import { motion } from "framer-motion";
import { TrendingUp, Brain, Timer, Target, BookOpen, Trophy, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const quizData = [
  { date: "Mon", score: 65 },
  { date: "Tue", score: 72 },
  { date: "Wed", score: 68 },
  { date: "Thu", score: 78 },
  { date: "Fri", score: 82 },
  { date: "Sat", score: 75 },
  { date: "Sun", score: 88 },
];

const topicData = [
  { topic: "Arrays", mastery: 85, color: "hsl(var(--primary))" },
  { topic: "Trees", mastery: 72, color: "hsl(var(--primary))" },
  { topic: "Graphs", mastery: 58, color: "hsl(var(--accent))" },
  { topic: "Sorting", mastery: 90, color: "hsl(var(--primary))" },
  { topic: "DP", mastery: 45, color: "hsl(var(--accent))" },
];

const studyTimeData = [
  { day: "Mon", minutes: 120 },
  { day: "Tue", minutes: 90 },
  { day: "Wed", minutes: 150 },
  { day: "Thu", minutes: 80 },
  { day: "Fri", minutes: 110 },
  { day: "Sat", minutes: 180 },
  { day: "Sun", minutes: 60 },
];

const stats = [
  { label: "Quizzes Taken", value: "24", icon: Brain, change: "+12%", positive: true },
  { label: "Study Hours", value: "18.5", icon: Timer, change: "+8%", positive: true },
  { label: "Topics Mastered", value: "8/12", icon: Target, change: "+2", positive: true },
  { label: "Current Streak", value: "7 days", icon: Trophy, change: "Best!", positive: true },
];

const ProgressDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Progress Dashboard
        </h2>
        <p className="text-muted-foreground mt-1">Track your academic performance over time</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className="h-5 w-5 text-primary" />
                  <span
                    className={`text-xs font-medium flex items-center gap-1 ${
                      stat.positive ? "text-success" : "text-accent"
                    }`}
                  >
                    {stat.positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {stat.change}
                  </span>
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quiz Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quiz Performance</CardTitle>
            <CardDescription>Your quiz scores over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={quizData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Study Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Study Time</CardTitle>
            <CardDescription>Minutes studied per day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studyTimeData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Topic Mastery */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Topic Mastery
          </CardTitle>
          <CardDescription>
            Topics in <span className="text-accent font-medium">red</span> need more practice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topicData.map((topic) => (
              <div key={topic.topic} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{topic.topic}</span>
                  <span
                    className={`font-bold ${
                      topic.mastery >= 70 ? "text-primary" : "text-accent"
                    }`}
                  >
                    {topic.mastery}%
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={`absolute left-0 top-0 h-full rounded-full ${
                      topic.mastery >= 70 ? "bg-primary" : "bg-accent"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${topic.mastery}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressDashboard;
