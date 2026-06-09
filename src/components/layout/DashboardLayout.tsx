import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  MessageSquare,
  Users,
  LogOut,
  Menu,
  X,
  Building2,
  Briefcase,
  BarChart3,
  ScrollText,
  Shield,
  ClipboardList,
  UserCircle2,
} from "lucide-react";
import { useState } from "react";
import NotificationBell from "@/components/notifications/NotificationBell";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const studentNavItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/logbook", icon: BookOpen, label: "Logbook" },
    { href: "/documents", icon: FileText, label: "Documents" },
    { href: "/report", icon: ClipboardList, label: "Final Report" },
    { href: "/profile", icon: UserCircle2, label: "Profile" },
  ];

  const supervisorNavItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/students", icon: Users, label: "My Students" },
    { href: "/reviews", icon: MessageSquare, label: "Reviews" },
    { href: "/profile", icon: UserCircle2, label: "Profile" },
  ];

  const adminNavItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/students", icon: Users, label: "All Students" },
    { href: "/admin/supervisors", icon: Shield, label: "Supervisors" },
    { href: "/admin/institutions", icon: Building2, label: "Institutions" },
    { href: "/admin/organizations", icon: Briefcase, label: "Organizations" },
    { href: "/admin/skills", icon: ScrollText, label: "Skills" },
    { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
    { href: "/admin/audit-logs", icon: FileText, label: "Audit Logs" },
  ];

  const navItems = role === "admin" 
    ? adminNavItems 
    : role === "supervisor" 
      ? supervisorNavItems 
      : studentNavItems;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b bg-card">
        <h1 className="text-xl font-bold text-primary">TrackMySIWES</h1>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b hidden lg:block">
              <h1 className="text-2xl font-bold text-primary">TrackMySIWES</h1>
            </div>

            {/* User info */}
            <div className="p-4 border-b">
              <p className="font-medium text-foreground truncate">
                {profile?.full_name || "User"}
              </p>
              <p className="text-sm text-muted-foreground capitalize">{role}</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Sign out */}
            <div className="p-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="hidden lg:flex items-center justify-end gap-2 px-8 h-14 border-b bg-card/50 backdrop-blur">
            <NotificationBell />
          </div>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 min-h-screen w-full min-w-0 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </div>
  );
}
