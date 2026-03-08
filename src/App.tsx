import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Aptitude from "./pages/Aptitude";
import Technical from "./pages/Technical";
import Coding from "./pages/Coding";
import GroupDiscussion from "./pages/GroupDiscussion";
import GDTopicPage from "./pages/GDTopicPage";
import MockTests from "./pages/MockTests";
import MockTest from "./pages/MockTest";
import Admin from "./pages/Admin";
import GDAdmin from "./pages/GDAdmin";
import AptitudeCheatCodes from "./pages/AptitudeCheatCodes";
import PerformanceReport from "./pages/PerformanceReport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? <ProtectedRoute><Dashboard /></ProtectedRoute> : <Navigate to="/auth" replace />} />
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/aptitude" element={<ProtectedRoute><Aptitude /></ProtectedRoute>} />
      <Route path="/technical" element={<ProtectedRoute><Technical /></ProtectedRoute>} />
      <Route path="/coding" element={<ProtectedRoute><Coding /></ProtectedRoute>} />
      <Route path="/group-discussion" element={<ProtectedRoute><GroupDiscussion /></ProtectedRoute>} />
      <Route path="/group-discussion/:topicId" element={<ProtectedRoute><GDTopicPage /></ProtectedRoute>} />
      <Route path="/mock-tests" element={<ProtectedRoute><MockTests /></ProtectedRoute>} />
      <Route path="/mock-test/:testId" element={<ProtectedRoute><MockTest /></ProtectedRoute>} />
      <Route path="/cheat-codes" element={<ProtectedRoute><AptitudeCheatCodes /></ProtectedRoute>} />
      <Route path="/performance" element={<ProtectedRoute><PerformanceReport /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
      <Route path="/admin/gd" element={<AdminRoute><GDAdmin /></AdminRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
