import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Logbook from "./pages/Logbook";
import LogbookEntry from "./pages/LogbookEntry";
import Documents from "./pages/Documents";
import Students from "./pages/Students";
import StudentDetail from "./pages/StudentDetail";
import Reviews from "./pages/Reviews";
import ReviewEntry from "./pages/ReviewEntry";
import NotFound from "./pages/NotFound";
import FinalReport from "./pages/FinalReport";
import AdminRoute from "@/components/auth/AdminRoute";
// Admin pages
import Institutions from "./pages/admin/Institutions";
import Organizations from "./pages/admin/Organizations";
import Skills from "./pages/admin/Skills";
import AuditLogs from "./pages/admin/AuditLogs";
import AllStudents from "./pages/admin/AllStudents";
import Supervisors from "./pages/admin/Supervisors";
import Analytics from "./pages/admin/Analytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/logbook" element={<Logbook />} />
            <Route path="/logbook/new" element={<LogbookEntry />} />
            <Route path="/logbook/:id/edit" element={<LogbookEntry />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/students" element={<Students />} />
            <Route path="/students/:id" element={<StudentDetail />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/reviews/:id" element={<ReviewEntry />} />
            <Route path="/report" element={<FinalReport />} />
            <Route path="/report/:id" element={<FinalReport />} />
            {/* Admin routes */}
            <Route path="/admin/students" element={<AdminRoute><AllStudents /></AdminRoute>} />
            <Route path="/admin/students/:id" element={<AdminRoute><StudentDetail /></AdminRoute>} />
            <Route path="/admin/supervisors" element={<AdminRoute><Supervisors /></AdminRoute>} />
            <Route path="/admin/institutions" element={<AdminRoute><Institutions /></AdminRoute>} />
            <Route path="/admin/organizations" element={<AdminRoute><Organizations /></AdminRoute>} />
            <Route path="/admin/skills" element={<AdminRoute><Skills /></AdminRoute>} />
            <Route path="/admin/analytics" element={<AdminRoute><Analytics /></AdminRoute>} />
            <Route path="/admin/audit-logs" element={<AdminRoute><AuditLogs /></AdminRoute>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
