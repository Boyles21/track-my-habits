import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  BookOpen,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Activity,
} from "lucide-react";
import { TOTAL_REQUIRED_HOURS, formatHours, calculateCompletionPercentage } from "@/lib/hours-validation";

interface Student {
  id: string;
  full_name: string;
  email: string;
  institution: string | null;
  department: string | null;
  programme: string | null;
  stats: {
    totalEntries: number;
    pendingEntries: number;
    approvedEntries: number;
    totalDocuments: number;
    approvedHours: number;
    violations: number;
  };
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] as any },
  }),
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export default function Students() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
    if (!authLoading && role !== "supervisor") navigate("/dashboard");
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user && role === "supervisor") fetchStudents();
  }, [user, role]);

  const fetchStudents = async () => {
    try {
      const { data: assignments } = await supabase
        .from("supervisor_students")
        .select("student_id")
        .eq("supervisor_id", user?.id);

      if (!assignments || assignments.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }
      const studentIds = assignments.map((a) => a.student_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, institution, department, programme")
        .in("id", studentIds);

      if (!profiles) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const { data: entries } = await supabase
        .from("logbook_entries")
        .select("student_id, status, hours_worked, has_violation")
        .in("student_id", studentIds);

      const { data: docs } = await supabase
        .from("documents")
        .select("user_id")
        .in("user_id", studentIds);

      const result = profiles.map((p) => {
        const e = (entries || []).filter((x) => x.student_id === p.id);
        const approved = e.filter((x) => x.status === "approved");
        return {
          id: p.id,
          full_name: p.full_name || "Unknown",
          email: p.email || "",
          institution: p.institution,
          department: p.department,
          programme: p.programme,
          stats: {
            totalEntries: e.length,
            pendingEntries: e.filter((x) => x.status === "pending").length,
            approvedEntries: approved.length,
            totalDocuments: (docs || []).filter((d) => d.user_id === p.id).length,
            approvedHours: approved.reduce((s, x) => s + (x.hours_worked || 0), 0),
            violations: e.filter((x) => x.has_violation && x.status !== "approved").length,
          },
        };
      });

      setStudents(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="grid md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Hero */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8"
        >
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" /> My Students
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
              {students.length} {students.length === 1 ? "Student" : "Students"} under your supervision
            </h1>
            <p className="text-muted-foreground mt-1">
              Track progress, compliance, and approvals across your assigned cohort.
            </p>
          </div>
        </motion.div>

        {students.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-medium">No students assigned</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Students will appear here once they are assigned to you.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {students.map((student, i) => {
              const progress = calculateCompletionPercentage(student.stats.approvedHours);
              const approvalRate =
                student.stats.totalEntries > 0
                  ? Math.round((student.stats.approvedEntries / student.stats.totalEntries) * 100)
                  : 0;
              const hasIssue = student.stats.violations > 0;
              return (
                <motion.div
                  key={student.id}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Card className={`h-full hover:shadow-xl transition-shadow ${hasIssue ? "border-destructive/40" : ""}`}>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center font-semibold shrink-0">
                          {initials(student.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{student.full_name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {student.department || "—"}
                            {student.institution && ` · ${student.institution}`}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          {hasIssue && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {student.stats.violations}
                            </Badge>
                          )}
                          {student.stats.pendingEntries > 0 && (
                            <Badge className="status-pending text-xs">
                              {student.stats.pendingEntries} pending
                            </Badge>
                          )}
                          {!hasIssue && student.stats.pendingEntries === 0 && (
                            <Badge className="status-approved text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              On track
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">SIWES Progress</span>
                          <span className="font-medium">
                            {formatHours(student.stats.approvedHours)} / {formatHours(TOTAL_REQUIRED_HOURS)} · {progress}%
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <BookOpen className="h-3 w-3" /> Entries
                          </p>
                          <p className="font-semibold text-sm">{student.stats.totalEntries}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Approval
                          </p>
                          <p className="font-semibold text-sm">{approvalRate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <FileText className="h-3 w-3" /> Docs
                          </p>
                          <p className="font-semibold text-sm">{student.stats.totalDocuments}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button asChild variant="default" size="sm" className="flex-1">
                          <Link to={`/students/${student.id}`}>
                            View Details <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </Link>
                        </Button>
                        {student.stats.pendingEntries > 0 && (
                          <Button asChild variant="outline" size="sm">
                            <Link to="/reviews">
                              <Clock className="h-3.5 w-3.5 mr-1" />
                              Review
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
