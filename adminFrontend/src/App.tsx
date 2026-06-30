import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Schools from "./pages/Schools";
import Departments from "./pages/Departments";
import Units from "./pages/Units";
import Resources from "./pages/Resources";
import Admins from "./pages/Admins";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <NavigationProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Index />} />
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/schools" element={<Schools />} />
                  <Route path="/departments" element={<Departments />} />
                  <Route path="/units" element={<Units />} />
                  <Route path="/resources" element={<Resources />} />
                  <Route path="/admins" element={<Admins />} />
                </Route>  
                <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </NavigationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
