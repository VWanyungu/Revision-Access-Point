import { useEffect, useState } from "react";
import PricingGate from "./PricingGate";
import AppLayout from "@/components/layout/AppLayout";
import ResourceSearch from "@/components/study/ResourceSearch";
import StudyDashboard from "@/components/study/StudyDashboard";
import FlashcardSystem from "@/components/study/FlashcardSystem";
import PomodoroTimer from "@/components/study/PomodoroTimer";
import ProgressDashboard from "@/components/study/ProgressDashboard";
import StudyCalendar from "@/components/study/StudyCalendar";
import QuizSystem from "@/components/study/QuizSystem";
import SubscriptionsPage from "@/components/study/SubscriptionsPage";
import PdfViewerPage from "./PdfViewerPage";
import AnswersPage, { type AnswersData } from "./AnswersPage";
import { supabase } from "@/database/supabase";
import { toast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { cleanAndParseText } from "@/lib/utils";
import { Loader } from "lucide-react";

type AppState = "loading" | "pricing-gate" | "search" | "main";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("loading");
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [studyContext, setStudyContext] = useState({ year: 1, unit: 0 });
  const [quizReturnPage, setQuizReturnPage] = useState("dashboard");
  const [selectedResourceUrl, setSelectedResourceUrl] = useState<string>();
  const [selectedResourceTitle, setSelectedResourceTitle] = useState<string>();
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string>("");
  const [selectedPdfTitle, setSelectedPdfTitle] = useState<string>("");
  const [answersSource, setAnswersSource] = useState<{ url: string; title: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<Record<string, any>>({});
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [answersData, setAnswersData] = useState<AnswersData | null>(null);
  const [isGeneratingAnswers, setIsGeneratingAnswers] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const sbTokenStr = localStorage.getItem("sb-ptktlornnngqvzbbisaq-auth-token");
      const sbToken = sbTokenStr ? JSON.parse(sbTokenStr) : null;
      const targetUserId = sbToken?.user?.id || user?.id;

      if (targetUserId) {
        if (user) {
          setCurrentUser(user);
          localStorage.setItem("user", JSON.stringify(user));
        }

        // Real subscription check from database
        const { data: subs } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_uuid", targetUserId)
          .gte("end_date", new Date().toISOString());

        const subscribed = subs && subs.length > 0;
        setIsSubscribed(subscribed);

        if (!subscribed) {
          setAppState("pricing-gate");
          return;
        }

        // Try local storage first
        const savedSelectionStr = localStorage.getItem("resourceSelection");
        if (savedSelectionStr) {
          try {
            const saved = JSON.parse(savedSelectionStr);
            const matchingSub = subs.find((s: Record<string, any>) =>
              String(saved.department) === String(s.department_id) &&
              Number(saved.year) === Number(s.year_of_study) &&
              Number(saved.semester) === Number(s.semester_of_study)
            );

            if (matchingSub) {
              setStudyContext({ year: Number(saved.year), unit: Number(saved.unit) });
              setAppState("main");
              return;
            }
          } catch (e) { }
        }

        const sub = subs[0];

        // Load random unit from the department, year and semester in the subscriptions table
        const { data: units } = await supabase
          .from("units")
          .select("id")
          .eq("department_id", sub.department_id)
          .eq("year_of_study", sub.year_of_study)
          .eq("semester_of_study", sub.semester_of_study)
          .limit(1);

        const unitId = units && units.length > 0 ? units[0].id : 0;
        const newContext = {
          department: String(sub.department_id),
          year: sub.year_of_study,
          semester: sub.semester_of_study,
          unit: String(unitId)
        };

        localStorage.setItem("resourceSelection", JSON.stringify(newContext));
        setStudyContext({ year: newContext.year, unit: Number(newContext.unit) });
        setAppState("main");
      }
    };
    checkUser();
  }, []);

  // Pages are swapped in place, so the window keeps its scroll position; start each page at the top
  // or its first content slides under the floating navbar.
  useEffect(() => { window.scrollTo(0, 0); }, [currentPage]);

  const handleLogout = () => {
    setStudyContext({ year: 1, unit: 0 });
    setCurrentPage("dashboard");
  };

  const handleSearch = async (selection: { school: string; department: string; year: number; semester: number; unit: string }) => {
    const { data: { user } } = await supabase.auth.getUser();

    const sbTokenStr = localStorage.getItem("sb-ptktlornnngqvzbbisaq-auth-token");
    const sbToken = sbTokenStr ? JSON.parse(sbTokenStr) : null;
    const targetUserId = sbToken?.user?.id || user?.id;

    if (targetUserId) {
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_uuid", targetUserId)
        .gte("end_date", new Date().toISOString());

      if (!subs || subs.length === 0) {
        setAppState("pricing-gate");
        return;
      }

      const hasAccess = subs.some((sub: Record<string, any>) =>
        String(selection.department) === String(sub.department_id) &&
        Number(selection.year) === Number(sub.year_of_study) &&
        Number(selection.semester) === Number(sub.semester_of_study)
      );

      if (!hasAccess) {
        toast({
          title: "Access Restricted",
          description: "You are not subscribed to access resources for this department and semester.",
          variant: "destructive"
        });
        return;
      }
    }

    // Notice we do NOT overwrite resourceSelection in localStorage here, 
    // because ResourceSearch components have already set it with full names!
    setStudyContext({ year: Number(selection.year), unit: Number(selection.unit) });
    setAppState("main");
    setCurrentPage("dashboard");
  };

  const openPaper = (url: string, title?: string) => {
    setSelectedPdfUrl(url);
    setSelectedPdfTitle(title ?? "");
    setCurrentPage("pdf");
  };

  const handleGenerateQuiz = (publicAccessUrl: string, title: string) => {
    setSelectedResourceUrl(publicAccessUrl);
    setSelectedResourceTitle(title);
    setQuizReturnPage(currentPage);
    setCurrentPage("quiz");
  };

  const answersKey = (url: string) => `rap-answers:${url}`;

  /** Shows the saved copy if there is one; `force` regenerates. */
  const handleGenerateAnswers = async (fileUrl: string, title: string, force = false) => {
    setAnswersSource({ url: fileUrl, title });
    setCurrentPage("answers");

    if (!force) {
      try {
        const saved = localStorage.getItem(answersKey(fileUrl));
        if (saved) {
          const { data, savedAt } = JSON.parse(saved);
          setAnswersData({ ...data, savedAt });
          return;
        }
      } catch { /* fall through and generate */ }
    }

    setAnswersData(null);
    setIsGeneratingAnswers(true);
    try {
      const tokenStr = localStorage.getItem("sb-ptktlornnngqvzbbisaq-auth-token");
      const accessToken = tokenStr ? JSON.parse(tokenStr).access_token : "";

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ fileUrl, title }),
      });
      const raw = await res.json();

      if (!res.ok) {
        toast({
          title: "Error generating answers",
          description: (raw as { error?: string }).error ?? "Something went wrong.",
          variant: "destructive",
        });
        setCurrentPage("dashboard");
        return;
      }

      const savedAt = new Date().toISOString();
      try { localStorage.setItem(answersKey(fileUrl), JSON.stringify({ data: raw.data, savedAt })); } catch { /* storage full */ }
      setAnswersData({ ...raw.data, savedAt });
      // The user may have gone back to the paper while this ran, so tell them it finished.
      sonnerToast.success("Model answers are ready", {
        action: { label: "View", onClick: () => setCurrentPage("answers") },
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to generate answers. Please try again.",
        variant: "destructive",
      });
      setCurrentPage("dashboard");
    } finally {
      setIsGeneratingAnswers(false);
    }
  };

  if (appState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  // Pricing gate for unsubscribed users
  if (appState === "pricing-gate") {
    return (
      <PricingGate
        onLogout={handleLogout}
        onSubscribed={() => {
          setIsSubscribed(true);
          const saved = localStorage.getItem("resourceSelection");
          if (saved) {
            setStudyContext(JSON.parse(saved));
            setAppState("main");
          } else {
            setAppState("search");
          }
        }}
      />
    );
  }

  // Resource search
  if (appState === "search") {
    return (
      <AppLayout currentPage="" onNavigate={() => { }} onLogout={handleLogout}>
        <ResourceSearch onSearch={handleSearch} />
      </AppLayout>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return (
          <StudyDashboard
            key={studyContext?.unit}
            unitId={Number(studyContext?.unit)}
            onNavigate={setCurrentPage}
            onGenerateQuiz={handleGenerateQuiz}
            onGenerateAnswers={handleGenerateAnswers}
            onViewResource={openPaper}
            onChangeUnit={handleSearch}
          />
        );
      case "quiz":
        return (
          <QuizSystem
            key={selectedResourceUrl}
            onClose={() => setCurrentPage(quizReturnPage)}
            resourcePublicAccessUrl={selectedResourceUrl}
            resourceTitle={selectedResourceTitle}
          />
        );
      case "resources":
        return (
          <StudyDashboard
            key={studyContext?.unit}
            unitId={Number(studyContext?.unit)}
            onNavigate={setCurrentPage}
            onGenerateQuiz={handleGenerateQuiz}
            onGenerateAnswers={handleGenerateAnswers}
            onViewResource={openPaper}
            onChangeUnit={handleSearch}
          />
        );
      case "flashcards":
        return <FlashcardSystem />;
      case "timer":
        return <PomodoroTimer />;
      case "progress":
        return <ProgressDashboard />;
      case "calendar":
        return <StudyCalendar />;
      case "pdf":
        return (
          <PdfViewerPage
            url={selectedPdfUrl}
            title={selectedPdfTitle}
            onBack={() => setCurrentPage("dashboard")}
            onModelAnswers={() => handleGenerateAnswers(selectedPdfUrl, selectedPdfTitle)}
          />
        );
      case "subscriptions":
        return <SubscriptionsPage onNavigate={setCurrentPage} />;
      case "answers":
        return (
          <AnswersPage
            data={answersData}
            generating={isGeneratingAnswers}
            title={answersSource?.title ?? selectedPdfTitle}
            onBack={() => { setCurrentPage(answersSource ? "pdf" : "dashboard"); }}
            onOpenPaper={() => { if (answersSource) openPaper(answersSource.url, answersSource.title); }}
            onRegenerate={() => answersSource && handleGenerateAnswers(answersSource.url, answersSource.title, true)}
            onQuiz={() => answersSource && handleGenerateQuiz(answersSource.url, answersSource.title)}
            downloadUrl={answersSource?.url}
          />
        );
      default:
        return (
          <StudyDashboard
            unitId={1}
            onNavigate={setCurrentPage}
            onGenerateQuiz={handleGenerateQuiz}
            onGenerateAnswers={handleGenerateAnswers}
            onViewResource={openPaper}
          />
        );
    }
  };

  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      onLogout={handleLogout}
      studyContext={studyContext}
    >
      {renderPage()}
    </AppLayout>
  );
};

export default Index;
