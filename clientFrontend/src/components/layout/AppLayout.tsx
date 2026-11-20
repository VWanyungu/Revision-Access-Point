import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import SiteFooter from "./SiteFooter";
import MobileTabBar from "./MobileTabBar";

interface AppLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  studyContext?: {
    year: number;
    unit: number;
  };
}

const AppLayout = ({ children, currentPage, onNavigate, onLogout, studyContext }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Phones get a tab bar on the unit, billing and profile pages; the paper, answers and quiz screens have their own bottom controls.
  const showTabs = !!studyContext && ["dashboard", "resources", "subscriptions", "profile"].includes(currentPage);

  return (
    <div className={`w-screen min-h-screen bg-background ${showTabs ? "pb-24 md:pb-0" : ""}`}>
      <Navbar
        studyContext={studyContext}
        currentPage={currentPage}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />
      <div className="w-full">
        {/* <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentPage={currentPage}
          onNavigate={onNavigate}
        /> */}
        <main className="">
          {/* <div className="container max-w-7xl py-6"> */}
          <div className="min-w-screen h-full">
            {children}
          </div>
        </main>
      </div>
      <SiteFooter inApp />
      {showTabs && <MobileTabBar />}
    </div>
  );
};

export default AppLayout;
