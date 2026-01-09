import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Logbook from "./pages/Logbook";
import LogbookEntry from "./pages/LogbookEntry";
import Documents from "./pages/Documents";
import Students from "./pages/Students";
import StudentDetail from "./pages/StudentDetail";
import Reviews from "./pages/Reviews";
import ReviewEntry from "./pages/ReviewEntry";
import NotFound from "./pages/NotFound";
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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/logbook" element={<Logbook />} />
            <Route path="/logbook/new" element={<LogbookEntry />} />
            <Route path="/logbook/:id/edit" element={<LogbookEntry />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/students" element={<Students />} />
            <Route path="/students/:id" element={<StudentDetail />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/reviews/:id" element={<ReviewEntry />} />
            {/* Admin routes */}
            <Route path="/admin/students" element={<AllStudents />} />
            <Route path="/admin/students/:id" element={<StudentDetail />} />
            <Route path="/admin/supervisors" element={<Supervisors />} />
            <Route path="/admin/institutions" element={<Institutions />} />
            <Route path="/admin/organizations" element={<Organizations />} />
            <Route path="/admin/skills" element={<Skills />} />
            <Route path="/admin/analytics" element={<Analytics />} />
            <Route path="/admin/audit-logs" element={<AuditLogs />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
