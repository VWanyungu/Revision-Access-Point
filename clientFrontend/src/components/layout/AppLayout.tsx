import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import SiteFooter from "./SiteFooter";

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

  return (
    <div className="w-screen min-h-screen bg-background">
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
      <SiteFooter />
    </div>
  );
};

export default AppLayout;
