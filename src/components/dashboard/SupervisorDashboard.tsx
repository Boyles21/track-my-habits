import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, Clock, CheckCircle2 } from "lucide-react";

interface Student {
  id: string;
  full_name: string;
  institution: string;
  department: string;
  pendingEntries: number;
}

interface PendingEntry {
  id: string;
  entry_date: string;
  activity_description: string;
  student_name: string;
  student_id: string;
}

export default function SupervisorDashboard() {
  const { profile, user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalPendingReviews: 0,
    totalApproved: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch assigned students
      const { data: assignments } = await supabase
        .from("supervisor_students")
        .select(`
          student_id,
          profiles!supervisor_students_student_id_fkey (
            id,
            full_name,
            institution,
            department
          )
        `)
        .eq("supervisor_id", user?.id);

      if (assignments) {
        const studentIds = assignments.map((a) => a.student_id);

        // Get pending entries count for each student
        const studentsWithCounts = await Promise.all(
          assignments.map(async (assignment) => {
            const { count } = await supabase
              .from("logbook_entries")
              .select("*", { count: "exact", head: true })
              .eq("student_id", assignment.student_id)
              .eq("status", "pending");

            const studentProfile = assignment.profiles as any;
            return {
              id: assignment.student_id,
              full_name: studentProfile?.full_name || "Unknown",
              institution: studentProfile?.institution || "",
              department: studentProfile?.department || "",
              pendingEntries: count || 0,
            };
          })
        );

        setStudents(studentsWithCounts);
        setStats((prev) => ({ ...prev, totalStudents: studentsWithCounts.length }));

        // Fetch all pending entries from assigned students
        if (studentIds.length > 0) {
          const { data: entries } = await supabase
            .from("logbook_entries")
            .select(`
              id,
              entry_date,
              activity_description,
              student_id,
              profiles!logbook_entries_student_id_fkey (
                full_name
              )
            `)
            .in("student_id", studentIds)
            .eq("status", "pending")
            .order("entry_date", { ascending: false })
            .limit(5);

          if (entries) {
            const mappedEntries = entries.map((entry) => ({
              id: entry.id,
              entry_date: entry.entry_date,
              activity_description: entry.activity_description,
              student_id: entry.student_id,
              student_name: (entry.profiles as any)?.full_name || "Unknown",
            }));
            setPendingEntries(mappedEntries);
          }

          // Get total pending count
          const { count: pendingCount } = await supabase
            .from("logbook_entries")
            .select("*", { count: "exact", head: true })
            .in("student_id", studentIds)
            .eq("status", "pending");

          const { count: approvedCount } = await supabase
            .from("logbook_entries")
            .select("*", { count: "exact", head: true })
            .in("student_id", studentIds)
            .eq("status", "approved");

          setStats((prev) => ({
            ...prev,
            totalPendingReviews: pendingCount || 0,
            totalApproved: approvedCount || 0,
          }));
        }
      }
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
                <p className="text-sm text-muted-foreground">Assigned Students</p>
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
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
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
                <p className="text-sm text-muted-foreground">Entries Approved</p>
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
              {students.slice(0, 5).map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-secondary/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground">{student.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {student.department} • {student.institution}
                    </p>
                  </div>
                  {student.pendingEntries > 0 && (
                    <Badge className="status-pending">
                      {student.pendingEntries} pending
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Reviews */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Pending Reviews</CardTitle>
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
                  className="block p-4 rounded-lg border bg-card hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {entry.student_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(entry.entry_date).toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
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
