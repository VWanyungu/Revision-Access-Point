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
import ProfilePage from "@/components/study/ProfilePage";
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
  const [selectedPdfType, setSelectedPdfType] = useState<number | null>(null);
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

  const handleSearch = async (selection: { institution?: string; school: string; department: string; year: number; semester: number; unit: string }) => {
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

      // A pass is for one department at one institution: MMUST Computer Science never unlocks KU Computer Science.
      const hasAccess = subs.some((sub: Record<string, any>) =>
        (!selection.institution || !sub.institution_id || String(selection.institution) === String(sub.institution_id)) &&
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

  // The viewer offers Quiz for notes and Model answers for past papers, so it needs the resource type. Callers that
  // only have a URL get it looked up.
  const openPaper = (url: string, title?: string, resourceTypeId?: number) => {
    setSelectedPdfUrl(url);
    setSelectedPdfTitle(title ?? "");
    setSelectedPdfType(resourceTypeId ?? null);
    setCurrentPage("pdf");
    if (resourceTypeId == null) {
      supabase.from("resources").select("resource_type_id").eq("public_access_url", url).limit(1).maybeSingle()
        .then(({ data }) => setSelectedPdfType(data?.resource_type_id ?? null));
    }
  };

  const handleGenerateQuiz = (publicAccessUrl: string, title: string) => {
    setSelectedResourceUrl(publicAccessUrl);
    setSelectedResourceTitle(title);
    setQuizReturnPage(currentPage);
    setCurrentPage("quiz");
  };

  /**
   * Opens the student's saved answers for a paper. They are pinned to one saved version, so the content never changes while
   * they read. "regenerate" writes a new version for this student only (capped); "switch" moves them to another version.
   */
  const handleGenerateAnswers = async (
    fileUrl: string,
    title: string,
    force = false,
    action: "get" | "regenerate" | "switch" = force ? "regenerate" : "get",
    version?: number,
  ) => {
    const previous = answersData;
    setAnswersSource({ url: fileUrl, title });
    setCurrentPage("answers");
    setAnswersData(null);
    setIsGeneratingAnswers(true);
    const started = Date.now();
    try {
      const tokenStr = localStorage.getItem("sb-ptktlornnngqvzbbisaq-auth-token");
      const accessToken = tokenStr ? JSON.parse(tokenStr).access_token : "";

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ fileUrl, title, action, version }),
      });
      const raw = await res.json();

      if (!res.ok) {
        toast({
          title: action === "regenerate" ? "Could not regenerate" : "Error loading answers",
          description: (raw as { error?: string }).error ?? "Something went wrong.",
          variant: "destructive",
        });
        // A refused regenerate (for example the cap) leaves the student on the answers they were reading.
        if (previous && action !== "get") setAnswersData(previous);
        else setCurrentPage("dashboard");
        return;
      }

      const meta = (raw.meta ?? {}) as { generated_at?: string; version?: number; latest_version?: number; regenerations_left?: number };
      setAnswersData({
        ...raw.data,
        savedAt: meta.generated_at,
        version: meta.version,
        latestVersion: meta.latest_version,
        regenerationsLeft: meta.regenerations_left,
      });
      // Opening saved answers is instant; if this took a while the answers were just written, so say so (the student
      // may have gone back to the paper while it ran).
      if (Date.now() - started > 4000) {
        sonnerToast.success("Model answers are ready", {
          action: { label: "View", onClick: () => setCurrentPage("answers") },
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load the answers. Please try again.",
        variant: "destructive",
      });
      if (previous && action !== "get") setAnswersData(previous);
      else setCurrentPage("dashboard");
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
            kind={selectedPdfType === 1 ? "note" : selectedPdfType === 2 || selectedPdfType === 3 ? "paper" : null}
            onQuiz={() => handleGenerateQuiz(selectedPdfUrl, selectedPdfTitle)}
            onModelAnswers={() => handleGenerateAnswers(selectedPdfUrl, selectedPdfTitle)}
          />
        );
      case "profile":
        return <ProfilePage onNavigate={setCurrentPage} />;
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
            onSwitchVersion={(v) => answersSource && handleGenerateAnswers(answersSource.url, answersSource.title, false, "switch", v)}
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
