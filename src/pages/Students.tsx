import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, FileText } from "lucide-react";

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
  };
}

export default function Students() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
    if (!authLoading && role !== "supervisor") {
      navigate("/dashboard");
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user && role === "supervisor") {
      fetchStudents();
    }
  }, [user, role]);

  const fetchStudents = async () => {
    try {
      // Step 1: Get assigned student IDs
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
        setLoading(false);
        return;
      }

      const studentIds = assignments.map((a) => a.student_id);

      // Step 2: Fetch profiles for assigned students
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, institution, department, programme")
        .in("id", studentIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        setLoading(false);
        return;
      }

      if (!profiles) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Step 3: Get stats for each student
      const studentsWithStats = await Promise.all(
        profiles.map(async (profile) => {
          // Fetch entry stats
          const { count: totalEntries } = await supabase
            .from("logbook_entries")
            .select("*", { count: "exact", head: true })
            .eq("student_id", profile.id);

          const { count: pendingEntries } = await supabase
            .from("logbook_entries")
            .select("*", { count: "exact", head: true })
            .eq("student_id", profile.id)
            .eq("status", "pending");

          const { count: approvedEntries } = await supabase
            .from("logbook_entries")
            .select("*", { count: "exact", head: true })
            .eq("student_id", profile.id)
            .eq("status", "approved");

          const { count: totalDocuments } = await supabase
            .from("documents")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id);

          return {
            id: profile.id,
            full_name: profile.full_name || "Unknown",
            email: profile.email || "",
            institution: profile.institution,
            department: profile.department,
            programme: profile.programme,
            stats: {
              totalEntries: totalEntries || 0,
              pendingEntries: pendingEntries || 0,
              approvedEntries: approvedEntries || 0,
              totalDocuments: totalDocuments || 0,
            },
          };
        })
      );

      setStudents(studentsWithStats);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Students</h1>
          <p className="text-muted-foreground">
            View and monitor your assigned students' progress
          </p>
        </div>

        {/* Students List */}
        {students.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No students assigned
                </h3>
                <p className="text-muted-foreground">
                  Students will appear here once they are assigned to you.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {students.map((student) => (
              <Card key={student.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-foreground">
                        {student.full_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {student.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {student.department} • {student.institution}
                      </p>
                      {student.programme && (
                        <p className="text-sm text-muted-foreground">
                          {student.programme}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span>{student.stats.totalEntries} entries</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{student.stats.totalDocuments} docs</span>
                      </div>
                      {student.stats.pendingEntries > 0 && (
                        <Badge className="status-pending">
                          {student.stats.pendingEntries} pending
                        </Badge>
                      )}
                    </div>

                    <Button variant="outline" asChild>
                      <Link to={`/students/${student.id}`}>View Details</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
