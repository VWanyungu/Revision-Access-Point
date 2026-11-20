import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import PricingGate from "./PricingGate";
import AiUpgradePage from "./AiUpgradePage";
import AppLayout from "@/components/layout/AppLayout";
import ResourceSearch from "@/components/study/ResourceSearch";
import StudyDashboard from "@/components/study/StudyDashboard";
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
import LoadFailed from "@/components/layout/LoadFailed";

type AppState = "loading" | "error" | "pricing-gate" | "search" | "main";

// Page names (used by the navbar and the pages) and the URLs they live at.
const PATH_OF_PAGE: Record<string, string> = {
  dashboard: "/app", resources: "/app", pdf: "/app/paper", answers: "/app/answers", quiz: "/app/quiz", subscriptions: "/app/billing", profile: "/app/profile",
};
const PAGE_OF_PATH: Record<string, string> = {
  "/app/paper": "pdf", "/app/answers": "answers", "/app/quiz": "quiz", "/app/billing": "subscriptions", "/app/profile": "profile",
};
const TITLE_OF_PAGE: Record<string, string> = {
  dashboard: "Unit", pdf: "Paper", answers: "Model answers", quiz: "Quiz", subscriptions: "Billing", profile: "Profile",
};

const Index = () => {
  const [appState, setAppState] = useState<AppState>("loading");
  // The page lives in the URL, so refresh, deep links and the back button work. The paper being read, the quiz source and the
  // answers source live in the query string (?u=<file>&t=<title>&k=<resource type>) so a refresh of those pages still works.
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const currentPage = PAGE_OF_PATH[location.pathname.replace(/\/+$/, "")] ?? "dashboard";
  const go = (page: string, search = "") => navigate(PATH_OF_PAGE[page] + search);
  const setCurrentPage = (page: string) => go(page);
  // Back goes to the previous screen; a deep link opened in a fresh tab has none, so it goes to the unit page.
  const goBack = () => (location.key !== "default" ? navigate(-1) : navigate("/app", { replace: true }));
  const link = (url: string, title?: string, extra: Record<string, string> = {}) =>
    "?" + new URLSearchParams({ u: url, t: title ?? "", ...extra }).toString();

  const [studyContext, setStudyContext] = useState({ year: 1, unit: 0 });
  const selectedResourceUrl = params.get("u") ?? undefined;
  const selectedResourceTitle = params.get("t") ?? undefined;
  const selectedPdfUrl = params.get("u") ?? "";
  const selectedPdfTitle = params.get("t") ?? "";
  const [lookedUpType, setLookedUpType] = useState<number | null>(null);
  const kParam = params.get("k");
  const selectedPdfType = kParam ? Number(kParam) : lookedUpType;
  const answersSource = currentPage === "answers" && selectedPdfUrl ? { url: selectedPdfUrl, title: selectedPdfTitle } : null;
  // "paper" shows a past paper's saved answers; "practice" shows the answers to a student's own practice paper.
  const answersMode: "paper" | "practice" = params.get("practice") ? "practice" : "paper";
  const [practiceTitle, setPracticeTitle] = useState("");
  // Which file the answers in state belong to ("practice" for a practice paper), and why loading them failed.
  const [answersFor, setAnswersFor] = useState<string | null>(null);
  const [answersError, setAnswersError] = useState<string | null>(null);
  // Bumped to restart the quiz after an AI upgrade.
  const [quizRun, setQuizRun] = useState(0);
  const [currentUser, setCurrentUser] = useState<Record<string, any>>({});
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [answersData, setAnswersData] = useState<AnswersData | null>(null);
  const [isGeneratingAnswers, setIsGeneratingAnswers] = useState(false);
  // Set when the student tries an AI feature their pass does not include: shows the AI add-on page. `retry` re-runs what they
  // tried once the upgrade is paid.
  const [upgrade, setUpgrade] = useState<{ unitId?: number; fileUrl?: string; retry?: () => void } | null>(null);
  // Bumped by "Try again" to re-run the pass check.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setAppState("loading");
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const sbTokenStr = localStorage.getItem("sb-ptktlornnngqvzbbisaq-auth-token");
      const sbToken = (() => { try { return sbTokenStr ? JSON.parse(sbTokenStr) : null; } catch { return null; } })();
      const targetUserId = sbToken?.user?.id || user?.id;

      if (targetUserId) {
        if (user) {
          setCurrentUser(user);
          localStorage.setItem("user", JSON.stringify(user));
        }

        // Real subscription check from database
        const { data: subs, error: subsError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_uuid", targetUserId)
          .gte("end_date", new Date().toISOString());

        // A failed request is not "no pass": sending a paying student to the pricing gate risks a second payment.
        if (subsError) {
          setAppState("error");
          return;
        }

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
          .order("code", { ascending: true })
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
    checkUser().catch(() => setAppState("error"));
  }, [attempt]);

  // Pages are swapped in place, so the window keeps its scroll position; start each page at the top
  // or its first content slides under the floating navbar.
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  // The tab title names the page. Leaving the page also closes the AI add-on page that was open on top of it.
  useEffect(() => {
    document.title = `${TITLE_OF_PAGE[currentPage] ?? "Unit"} · Revision Access Point`;
    setUpgrade(null);
  }, [currentPage]);

  // A paper opened by link or refresh has no resource type yet: look it up.
  useEffect(() => {
    if (currentPage !== "pdf" || !selectedPdfUrl || kParam) return;
    supabase.from("resources").select("resource_type_id").eq("public_access_url", selectedPdfUrl).limit(1).maybeSingle()
      .then(({ data }) => setLookedUpType(data?.resource_type_id ?? null));
  }, [currentPage, selectedPdfUrl, kParam]);

  // Answers opened by refresh, link or the back button: load the ones for this paper. Practice answers only live in memory, so
  // a refresh of those returns to the Practice tab.
  useEffect(() => {
    if (appState !== "main" || currentPage !== "answers" || isGeneratingAnswers) return;
    if (answersMode === "practice") {
      if (answersFor !== "practice") navigate("/app?view=predictions", { replace: true });
    } else if (selectedPdfUrl && answersFor !== selectedPdfUrl) {
      handleGenerateAnswers(selectedPdfUrl, selectedPdfTitle);
    } else if (!selectedPdfUrl) {
      navigate("/app", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState, currentPage, selectedPdfUrl, answersMode, answersFor, isGeneratingAnswers]);

  const handleLogout = () => {
    setStudyContext({ year: 1, unit: 0 });
    setCurrentPage("dashboard");
  };

  const handleSearch = async (selection: { institution?: string; school: string; department: string; year: number; semester: number; unit: string }) => {
    const { data: { user } } = await supabase.auth.getUser();

    const sbTokenStr = localStorage.getItem("sb-ptktlornnngqvzbbisaq-auth-token");
    const sbToken = (() => { try { return sbTokenStr ? JSON.parse(sbTokenStr) : null; } catch { return null; } })();
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
    setLookedUpType(null);
    go("pdf", link(url, title, resourceTypeId != null ? { k: String(resourceTypeId) } : {}));
  };

  const handleGenerateQuiz = (publicAccessUrl: string, title: string) => go("quiz", link(publicAccessUrl, title));

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
    // Regenerating or switching version happens on the answers page already; opening from elsewhere adds a history entry.
    if (!(currentPage === "answers" && selectedPdfUrl === fileUrl)) go("answers", link(fileUrl, title));
    setAnswersFor(fileUrl);
    setAnswersError(null);
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
        if ((raw as { detail?: string }).detail === "ai_required") {
          // After paying, the student comes back to these answers and the request runs again.
          setUpgrade({ fileUrl, retry: () => handleGenerateAnswers(fileUrl, title, force, action, version) });
          return;
        }
        const message = (raw as { error?: string }).error ?? "Something went wrong.";
        // A refused regenerate (for example the cap) leaves the student on the answers they were reading, with a toast.
        if (previous && action !== "get") {
          setAnswersData(previous);
          toast({ title: "Could not regenerate", description: message, variant: "destructive" });
        } else setAnswersError(message);
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
          action: { label: "View", onClick: () => go("answers", link(fileUrl, title)) },
        });
      }
    } catch (err) {
      const message = "We could not reach the server. Check your connection and try again.";
      if (previous && action !== "get") {
        setAnswersData(previous);
        toast({ title: "Could not update the answers", description: message, variant: "destructive" });
      } else setAnswersError(message);
    } finally {
      setIsGeneratingAnswers(false);
    }
  };

  /** Opens a practice paper's model answers in the same screen as a past paper's. */
  const openPracticeAnswers = (data: AnswersData, title: string) => {
    setPracticeTitle(title);
    setAnswersData(data);
    setAnswersFor("practice");
    setAnswersError(null);
    setIsGeneratingAnswers(false);
    go("answers", "?practice=1");
  };

  if (appState === "error") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-5">
        <LoadFailed
          title="Couldn't check your pass"
          message="We could not reach the server. Your pass is safe, and you do not need to pay again. Check your connection and try again."
          onRetry={() => setAttempt((n) => n + 1)}
        />
      </div>
    );
  }

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

  // The AI add-on page replaces the app until the student pays or goes back.
  if (upgrade) {
    return (
      <AiUpgradePage
        unitId={upgrade.unitId}
        fileUrl={upgrade.fileUrl}
        // Cancelling from a page that was waiting on AI (answers, quiz) leaves it; from the unit page it just closes.
        onBack={() => { setUpgrade(null); if (currentPage === "answers" || currentPage === "quiz") goBack(); }}
        // Paid: the pass now has AI, so refresh it and run what the student tried.
        onDone={() => { const retry = upgrade.retry; setUpgrade(null); queryClient.invalidateQueries({ queryKey: ["pass"] }); retry?.(); }}
      />
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
            onViewPracticeAnswers={openPracticeAnswers}
            onUpgradeAi={() => setUpgrade({ unitId: Number(studyContext?.unit) })}
          />
        );
      case "quiz":
        return (
          <QuizSystem
            key={`${selectedResourceUrl}-${quizRun}`}
            onClose={goBack}
            resourcePublicAccessUrl={selectedResourceUrl}
            resourceTitle={selectedResourceTitle}
            onNeedAi={() => setUpgrade({ fileUrl: selectedResourceUrl, retry: () => setQuizRun((n) => n + 1) })}
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
            onViewPracticeAnswers={openPracticeAnswers}
            onUpgradeAi={() => setUpgrade({ unitId: Number(studyContext?.unit) })}
          />
        );
      case "pdf":
        return (
          <PdfViewerPage
            url={selectedPdfUrl}
            title={selectedPdfTitle}
            onBack={goBack}
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
            title={answersMode === "practice" ? practiceTitle : answersSource?.title ?? selectedPdfTitle}
            error={answersError}
            onRetry={() => answersSource && handleGenerateAnswers(answersSource.url, answersSource.title)}
            onBack={goBack}
            // The paper actions (open the PDF, regenerate, switch version, quiz, download) only make sense for a past paper.
            onOpenPaper={answersMode === "paper" ? () => { if (answersSource) openPaper(answersSource.url, answersSource.title); } : undefined}
            onRegenerate={answersMode === "paper" ? () => answersSource && handleGenerateAnswers(answersSource.url, answersSource.title, true) : undefined}
            onSwitchVersion={answersMode === "paper" ? (v) => answersSource && handleGenerateAnswers(answersSource.url, answersSource.title, false, "switch", v) : undefined}
            onQuiz={answersMode === "paper" ? () => answersSource && handleGenerateQuiz(answersSource.url, answersSource.title) : undefined}
            downloadUrl={answersMode === "paper" ? answersSource?.url : undefined}
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
            onViewPracticeAnswers={openPracticeAnswers}
            onUpgradeAi={() => setUpgrade({ unitId: Number(studyContext?.unit) })}
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
