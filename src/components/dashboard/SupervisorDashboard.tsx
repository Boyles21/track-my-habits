import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Target,
  Activity,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  TOTAL_REQUIRED_HOURS,
  formatHours,
  calculateCompletionPercentage,
} from "@/lib/hours-validation";

interface Student {
  id: string;
  full_name: string;
  institution: string;
  department: string;
  pendingEntries: number;
  violationCount: number;
  totalApprovedHours: number;
}

interface PendingEntry {
  id: string;
  entry_date: string;
  activity_description: string;
  student_name: string;
  student_id: string;
  hours_worked: number | null;
  has_violation: boolean | null;
  violation_type: string | null;
}

interface SupervisorStats {
  totalStudents: number;
  totalPendingReviews: number;
  totalApproved: number;
  totalViolations: number;
  totalHoursSupervised: number;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] as any },
  }),
};

export default function SupervisorDashboard() {
  const { profile, user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([]);
  const [stats, setStats] = useState<SupervisorStats>({
    totalStudents: 0,
    totalPendingReviews: 0,
    totalApproved: 0,
    totalViolations: 0,
    totalHoursSupervised: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const { data: assignments } = await supabase
        .from("supervisor_students")
        .select("student_id")
        .eq("supervisor_id", user?.id);

      if (!assignments || assignments.length === 0) {
        setStudents([]);
        setStats({ totalStudents: 0, totalPendingReviews: 0, totalApproved: 0, totalViolations: 0, totalHoursSupervised: 0 });
        setLoading(false);
        return;
      }

      const studentIds = assignments.map((a) => a.student_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, institution, department")
        .in("id", studentIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      const { data: allEntries } = await supabase
        .from("logbook_entries")
        .select("student_id, status, hours_worked, has_violation")
        .in("student_id", studentIds);

      const studentsWithStats = studentIds.map((studentId) => {
        const e = (allEntries || []).filter((x) => x.student_id === studentId);
        const pendingCount = e.filter((x) => x.status === "pending").length;
        const violationCount = e.filter((x) => x.has_violation && x.status !== "approved").length;
        const approvedHours = e.filter((x) => x.status === "approved").reduce((s, x) => s + (x.hours_worked || 0), 0);
        const p = profileMap.get(studentId);
        return {
          id: studentId,
          full_name: p?.full_name || "Unknown",
          institution: p?.institution || "",
          department: p?.department || "",
          pendingEntries: pendingCount,
          violationCount,
          totalApprovedHours: approvedHours,
        };
      });

      studentsWithStats.sort((a, b) => {
        if (b.violationCount !== a.violationCount) return b.violationCount - a.violationCount;
        return b.pendingEntries - a.pendingEntries;
      });

      setStudents(studentsWithStats);

      const { data: entries } = await supabase
        .from("logbook_entries")
        .select("id, entry_date, activity_description, student_id, hours_worked, has_violation, violation_type")
        .in("student_id", studentIds)
        .eq("status", "pending")
        .order("has_violation", { ascending: false })
        .order("entry_date", { ascending: false })
        .limit(5);

      if (entries) {
        setPendingEntries(
          entries.map((entry) => ({
            id: entry.id,
            entry_date: entry.entry_date,
            activity_description: entry.activity_description,
            student_id: entry.student_id,
            student_name: profileMap.get(entry.student_id)?.full_name || "Unknown",
            hours_worked: entry.hours_worked,
            has_violation: entry.has_violation,
            violation_type: entry.violation_type,
          }))
        );
      }

      const totalPending = (allEntries || []).filter((e) => e.status === "pending").length;
      const totalApproved = (allEntries || []).filter((e) => e.status === "approved").length;
      const totalViolations = (allEntries || []).filter((e) => e.has_violation && e.status !== "approved").length;
      const totalHours = (allEntries || [])
        .filter((e) => e.status === "approved")
        .reduce((s, e) => s + (e.hours_worked || 0), 0);

      setStats({
        totalStudents: studentsWithStats.length,
        totalPendingReviews: totalPending,
        totalApproved,
        totalViolations,
        totalHoursSupervised: totalHours,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

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
      label: "Students Supervised",
      value: `${stats.totalStudents}`,
      sub: stats.totalStudents === 1 ? "1 active" : `${stats.totalStudents} active`,
      icon: Users,
      gradient: "from-primary/15 to-primary/5",
      iconBg: "bg-primary/15 text-primary",
    },
    {
      label: "Pending Reviews",
      value: `${stats.totalPendingReviews}`,
      sub: stats.totalPendingReviews > 0 ? "Awaiting your action" : "All caught up",
      icon: Clock,
      gradient: "from-accent/15 to-accent/5",
      iconBg: "bg-accent/15 text-accent",
    },
    {
      label: "Approved Entries",
      value: `${stats.totalApproved}`,
      sub: "Across all students",
      icon: CheckCircle2,
      gradient: "from-success/15 to-success/5",
      iconBg: "bg-success/15 text-success",
    },
    {
      label: "Hours Approved",
      value: formatHours(stats.totalHoursSupervised),
      sub: "Supervised total",
      icon: Target,
      gradient: "from-muted to-muted/30",
      iconBg: "bg-secondary text-secondary-foreground",
    },
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
              <Activity className="h-4 w-4" /> Supervisor Dashboard
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
              Welcome back, {profile?.full_name?.split(" ")[0] || "Supervisor"} 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              You supervise {stats.totalStudents} {stats.totalStudents === 1 ? "student" : "students"} · {stats.totalApproved} approved · {stats.totalPendingReviews} awaiting review.
            </p>
          </div>
          <Button asChild size="lg" className="shadow-lg shadow-primary/20">
            <Link to="/reviews">
              Review queue <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
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

      {/* Violations alert */}
      {stats.totalViolations > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <Card className="border-destructive/40 bg-gradient-to-r from-destructive/10 via-warning/5 to-transparent overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="p-3 rounded-xl bg-destructive/15 text-destructive shrink-0">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {stats.totalViolations} entries flagged with violations
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Review the flagged submissions and request revisions where needed.
                  </p>
                </div>
                <Button variant="destructive" asChild>
                  <Link to="/reviews">
                    Review <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Students + Pending */}
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" /> My Students
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/students">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No students assigned yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {students.slice(0, 5).map((student) => {
                    const progress = calculateCompletionPercentage(student.totalApprovedHours);
                    return (
                      <motion.div
                        key={student.id}
                        whileHover={{ y: -2 }}
                        className={`p-4 rounded-xl border bg-card hover:shadow-md transition-all ${
                          student.violationCount > 0 ? "border-destructive/40" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3 gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{student.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {student.department} {student.institution && `· ${student.institution}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {student.violationCount > 0 && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {student.violationCount}
                              </Badge>
                            )}
                            {student.pendingEntries > 0 && (
                              <Badge className="status-pending">{student.pendingEntries} pending</Badge>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">
                              {formatHours(student.totalApprovedHours)} / {formatHours(TOTAL_REQUIRED_HOURS)} · {progress}%
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4 text-primary" /> Pending Reviews
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/reviews">All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {pendingEntries.length === 0 ? (
                <div className="text-center py-10">
                  <Sparkles className="h-10 w-10 text-success mx-auto mb-3" />
                  <p className="text-muted-foreground">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingEntries.map((entry) => (
                    <Link
                      key={entry.id}
                      to={`/reviews/${entry.id}`}
                      className={`block p-3 rounded-xl border bg-card hover:bg-secondary/50 transition-colors ${
                        entry.has_violation ? "border-destructive/40" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm truncate">{entry.student_name}</p>
                        {entry.has_violation ? (
                          <Badge variant="destructive" className="text-xs shrink-0">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {entry.hours_worked}h
                          </Badge>
                        ) : (
                          <Badge className="status-pending text-xs shrink-0">Pending</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {new Date(entry.entry_date).toLocaleDateString()} · {entry.activity_description}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
