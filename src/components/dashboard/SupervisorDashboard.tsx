import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, BookOpen, Clock, CheckCircle2, AlertTriangle, Target } from "lucide-react";
import { TOTAL_REQUIRED_HOURS, formatHours, calculateCompletionPercentage } from "@/lib/hours-validation";

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
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Step 1: Fetch assigned student IDs
      const { data: assignments, error: assignmentError } = await supabase
        .from("supervisor_students")
        .select("student_id")
        .eq("supervisor_id", user?.id);

      if (assignmentError) {
        console.error("Error fetching assignments:", assignmentError);
        setLoading(false);
        return;
      }

      if (!assignments || assignments.length === 0) {
        setStudents([]);
        setStats({ totalStudents: 0, totalPendingReviews: 0, totalApproved: 0, totalViolations: 0, totalHoursSupervised: 0 });
        setLoading(false);
        return;
      }

      const studentIds = assignments.map((a) => a.student_id);

      // Step 2: Fetch profiles for assigned students
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, institution, department")
        .in("id", studentIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      // Step 3: Get all entries for assigned students
      const { data: allEntries } = await supabase
        .from("logbook_entries")
        .select("student_id, status, hours_worked, has_violation")
        .in("student_id", studentIds);

      // Step 4: Calculate stats for each student
      const studentsWithStats = studentIds.map((studentId) => {
        const studentEntries = (allEntries || []).filter(e => e.student_id === studentId);
        const pendingCount = studentEntries.filter(e => e.status === "pending").length;
        const violationCount = studentEntries.filter(e => e.has_violation && e.status !== "approved").length;
        const approvedHours = studentEntries
          .filter(e => e.status === "approved")
          .reduce((sum, e) => sum + (e.hours_worked || 0), 0);

        const profile = profileMap.get(studentId);
        return {
          id: studentId,
          full_name: profile?.full_name || "Unknown",
          institution: profile?.institution || "",
          department: profile?.department || "",
          pendingEntries: pendingCount,
          violationCount,
          totalApprovedHours: approvedHours,
        };
      });

      // Sort by violation count and pending entries
      studentsWithStats.sort((a, b) => {
        if (b.violationCount !== a.violationCount) return b.violationCount - a.violationCount;
        return b.pendingEntries - a.pendingEntries;
      });

      setStudents(studentsWithStats);

      // Step 5: Fetch pending entries from assigned students (prioritize violations)
      const { data: entries } = await supabase
        .from("logbook_entries")
        .select("id, entry_date, activity_description, student_id, hours_worked, has_violation, violation_type")
        .in("student_id", studentIds)
        .eq("status", "pending")
        .order("has_violation", { ascending: false })
        .order("entry_date", { ascending: false })
        .limit(5);

      if (entries) {
        const mappedEntries = entries.map((entry) => ({
          id: entry.id,
          entry_date: entry.entry_date,
          activity_description: entry.activity_description,
          student_id: entry.student_id,
          student_name: profileMap.get(entry.student_id)?.full_name || "Unknown",
          hours_worked: entry.hours_worked,
          has_violation: entry.has_violation,
          violation_type: entry.violation_type,
        }));
        setPendingEntries(mappedEntries);
      }

      // Step 6: Calculate total stats
      const totalPending = (allEntries || []).filter(e => e.status === "pending").length;
      const totalApproved = (allEntries || []).filter(e => e.status === "approved").length;
      const totalViolations = (allEntries || []).filter(e => e.has_violation && e.status !== "approved").length;
      const totalHours = (allEntries || [])
        .filter(e => e.status === "approved")
        .reduce((sum, e) => sum + (e.hours_worked || 0), 0);

      setStats({
        totalStudents: studentsWithStats.length,
        totalPendingReviews: totalPending,
        totalApproved: totalApproved,
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {profile?.full_name?.split(" ")[0] || "Supervisor"}!
        </h1>
        <p className="text-muted-foreground">
          Monitor your students' SIWES progress
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
                <p className="text-sm text-muted-foreground">Students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalPendingReviews}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalApproved}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {stats.totalViolations > 0 && (
          <Card className="border-destructive/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{stats.totalViolations}</p>
                  <p className="text-sm text-muted-foreground">Violations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <Target className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatHours(stats.totalHoursSupervised)}</p>
                <p className="text-sm text-muted-foreground">Hours Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">My Students</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/students">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No students assigned yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Students will appear here once they are assigned to you.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {students.slice(0, 5).map((student) => {
                const progressPercent = calculateCompletionPercentage(student.totalApprovedHours);
                return (
                  <div
                    key={student.id}
                    className={`p-4 rounded-lg border bg-card hover:bg-secondary/50 transition-colors ${
                      student.violationCount > 0 ? 'border-destructive/50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-foreground">{student.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.department} • {student.institution}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {student.violationCount > 0 && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {student.violationCount}
                          </Badge>
                        )}
                        {student.pendingEntries > 0 && (
                          <Badge className="status-pending">
                            {student.pendingEntries} pending
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Hours Progress</span>
                        <span className="font-medium">
                          {formatHours(student.totalApprovedHours)} / {formatHours(TOTAL_REQUIRED_HOURS)}
                        </span>
                      </div>
                      <Progress value={progressPercent} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Reviews - Prioritize violations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            Recent Pending Reviews
            {stats.totalViolations > 0 && (
              <Badge variant="destructive" className="text-xs">
                {stats.totalViolations} with violations
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/reviews">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {pendingEntries.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pending reviews</p>
              <p className="text-sm text-muted-foreground mt-2">
                All caught up! Student entries will appear here when submitted.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingEntries.map((entry) => (
                <Link
                  key={entry.id}
                  to={`/reviews/${entry.id}`}
                  className={`block p-4 rounded-lg border bg-card hover:bg-secondary/50 transition-colors ${
                    entry.has_violation ? 'border-destructive/50 bg-destructive/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {entry.student_name}
                        </p>
                        {entry.has_violation && (
                          <Badge variant="destructive" className="text-xs flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {entry.hours_worked}h exceeded
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(entry.entry_date).toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                        {entry.hours_worked && (
                          <span className={entry.has_violation ? 'text-destructive font-medium' : ''}>
                            {" "}• {entry.hours_worked}h
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {entry.activity_description}
                      </p>
                    </div>
                    <Badge className="status-pending">Pending</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
