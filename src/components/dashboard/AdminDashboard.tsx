import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  GraduationCap,
  Building2,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  BarChart3,
  FileText,
  Activity,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface SystemStats {
  totalStudents: number;
  totalSupervisors: number;
  totalInstitutions: number;
  totalOrganizations: number;
  totalEntries: number;
  approvedEntries: number;
  pendingEntries: number;
  revisionEntries: number;
  totalHoursLogged: number;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] as any },
  }),
};

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<SystemStats>({
    totalStudents: 0,
    totalSupervisors: 0,
    totalInstitutions: 0,
    totalOrganizations: 0,
    totalEntries: 0,
    approvedEntries: 0,
    pendingEntries: 0,
    revisionEntries: 0,
    totalHoursLogged: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [students, supervisors, institutions, organizations, entriesResult, audit] = await Promise.all([
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "supervisor"),
        supabase.from("institutions").select("id", { count: "exact", head: true }),
        supabase.from("organizations").select("id", { count: "exact", head: true }),
        supabase.from("logbook_entries").select("id, status, hours_worked"),
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(5),
      ]);

      const entries = entriesResult.data || [];
      const approved = entries.filter((e) => e.status === "approved").length;
      const pending = entries.filter((e) => e.status === "pending").length;
      const revision = entries.filter((e) => e.status === "revision_needed").length;
      const hours = entries.reduce((s, e) => s + (Number(e.hours_worked) || 0), 0);

      setStats({
        totalStudents: students.count || 0,
        totalSupervisors: supervisors.count || 0,
        totalInstitutions: institutions.count || 0,
        totalOrganizations: organizations.count || 0,
        totalEntries: entries.length,
        approvedEntries: approved,
        pendingEntries: pending,
        revisionEntries: revision,
        totalHoursLogged: hours,
      });
      setRecentActivity(audit.data || []);
    } catch (error) {
      console.error("[v0] Error fetching admin dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const approvalRate = stats.totalEntries > 0
    ? Math.round((stats.approvedEntries / stats.totalEntries) * 100)
    : 0;

  const healthy = stats.revisionEntries === 0 && approvalRate >= 75;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const kpis = [
    {
      label: "Total Students",
      value: stats.totalStudents,
      sub: "Across the platform",
      icon: GraduationCap,
      gradient: "from-primary/15 to-primary/5",
      iconBg: "bg-primary/15 text-primary",
    },
    {
      label: "Supervisors",
      value: stats.totalSupervisors,
      sub: "Managing students",
      icon: Users,
      gradient: "from-accent/15 to-accent/5",
      iconBg: "bg-accent/15 text-accent",
    },
    {
      label: "Institutions",
      value: stats.totalInstitutions,
      sub: "Registered",
      icon: Building2,
      gradient: "from-success/15 to-success/5",
      iconBg: "bg-success/15 text-success",
    },
    {
      label: "Organizations",
      value: stats.totalOrganizations,
      sub: "Placement companies",
      icon: Briefcase,
      gradient: "from-muted to-muted/30",
      iconBg: "bg-secondary text-secondary-foreground",
    },
  ];

  const logbookCards = [
    {
      label: "Approval Rate",
      value: `${approvalRate}%`,
      icon: CheckCircle2,
      iconBg: "bg-success/15 text-success",
      progress: approvalRate,
    },
    {
      label: "Total Entries",
      value: stats.totalEntries.toLocaleString(),
      icon: BarChart3,
      iconBg: "bg-primary/15 text-primary",
    },
    {
      label: "Pending",
      value: stats.pendingEntries,
      icon: Clock,
      iconBg: "bg-warning/15 text-warning",
    },
    {
      label: "Revision",
      value: stats.revisionEntries,
      icon: AlertCircle,
      iconBg: "bg-destructive/15 text-destructive",
    },
    {
      label: "Hours Logged",
      value: stats.totalHoursLogged.toLocaleString(),
      icon: TrendingUp,
      iconBg: "bg-accent/15 text-accent",
    },
  ];

  const quickActions = [
    { href: "/admin/students", icon: Users, label: "Manage Students", desc: "Profiles & assignments" },
    { href: "/admin/supervisors", icon: ShieldCheck, label: "Supervisors", desc: "Roles & workloads" },
    { href: "/admin/institutions", icon: Building2, label: "Institutions", desc: "School records" },
    { href: "/admin/organizations", icon: Briefcase, label: "Organizations", desc: "Placement firms" },
    { href: "/admin/analytics", icon: BarChart3, label: "Analytics", desc: "System insights" },
    { href: "/admin/audit-logs", icon: FileText, label: "Audit Logs", desc: "Activity trail" },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8"
      >
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-10 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" /> Admin Dashboard
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
              Welcome back, {profile?.full_name?.split(" ")[0] || "Admin"} 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {stats.totalStudents} Students · {stats.totalSupervisors} Supervisors · {stats.totalInstitutions} Institutions · {stats.totalOrganizations} Organizations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`px-3 py-2 text-xs ${
                healthy ? "border-success/40 text-success bg-success/10" : "border-warning/40 text-warning bg-warning/10"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
              System {healthy ? "healthy" : "needs attention"}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Card className={`relative overflow-hidden border bg-gradient-to-br ${k.gradient} shadow-sm hover:shadow-xl transition-shadow`}>
              <CardContent className="pt-6">
                <div className={`p-2.5 rounded-xl w-fit ${k.iconBg}`}>
                  <k.icon className="h-5 w-5" />
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-bold tracking-tight">{k.value}</p>
                  <p className="text-sm font-medium text-foreground/80 mt-1">{k.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Logbook stats + Quick actions */}
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" /> Logbook Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {logbookCards.map((c) => (
                  <motion.div
                    key={c.label}
                    whileHover={{ y: -2 }}
                    className="p-4 rounded-xl border bg-card/50 hover:shadow-md transition-all"
                  >
                    <div className={`p-2 rounded-lg w-fit ${c.iconBg}`}>
                      <c.icon className="h-4 w-4" />
                    </div>
                    <p className="text-xl font-bold mt-3">{c.value}</p>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    {typeof c.progress === "number" && (
                      <Progress value={c.progress} className="h-1.5 mt-2" />
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" /> Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                {quickActions.slice(0, 4).map((a) => (
                  <Link
                    key={a.href}
                    to={a.href}
                    className="group flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-secondary/50 hover:shadow-md transition-all"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <a.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{a.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Manage shortcuts */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickActions.map((a) => (
                <Link
                  key={a.href}
                  to={a.href}
                  className="group flex flex-col items-start gap-2 p-4 rounded-xl border bg-card hover:bg-secondary/40 hover:shadow-md transition-all"
                >
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <a.icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-medium">{a.label}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" /> Recent System Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentActivity.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-xl border bg-card/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{log.action_type}</p>
                      {log.table_name && (
                        <p className="text-xs text-muted-foreground">Table: {log.table_name}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
