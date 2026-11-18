import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const Splash = () => (
  <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
    <Loader className="h-5 w-5 animate-spin text-primary" />
  </div>
);

/** Signed-in users only. Everyone else goes to /login and comes back after. */
export const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
};

/** Signed-out users only (login, signup, forgot password). */
export const GuestRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return user ? <Navigate to="/app" replace /> : <Outlet />;
};
