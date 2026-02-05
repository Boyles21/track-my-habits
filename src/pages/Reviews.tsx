import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Calendar, Clock, AlertTriangle } from "lucide-react";
import { MAX_DAILY_HOURS } from "@/lib/hours-validation";

interface Entry {
  id: string;
  entry_date: string;
  activity_description: string;
  skills_learned: string | null;
  hours_worked: number;
  status: string;
  student_id: string;
  student_name: string;
  has_violation: boolean | null;
  violation_type: string | null;
  start_time: string | null;
  end_time: string | null;
}

export default function Reviews() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");

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
      fetchEntries();
    }
  }, [user, role]);

  const fetchEntries = async () => {
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
        setEntries([]);
        setLoading(false);
        return;
      }

      const studentIds = assignments.map((a) => a.student_id);

      // Step 2: Fetch entries from assigned students
      const { data: entriesData, error: entriesError } = await supabase
        .from("logbook_entries")
        .select("*")
        .in("student_id", studentIds)
        .order("has_violation", { ascending: false })
        .order("entry_date", { ascending: false });

      if (entriesError) {
        console.error("Error fetching entries:", entriesError);
        setLoading(false);
        return;
      }

      if (!entriesData || entriesData.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // Step 3: Fetch profiles for all students in entries
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

      const mappedEntries = entriesData.map((entry) => ({
        id: entry.id,
        entry_date: entry.entry_date,
        activity_description: entry.activity_description,
        skills_learned: entry.skills_learned,
        hours_worked: entry.hours_worked || 8,
        status: entry.status,
        student_id: entry.student_id,
        student_name: profileMap.get(entry.student_id) || "Unknown",
        has_violation: entry.has_violation,
        violation_type: entry.violation_type,
        start_time: entry.start_time,
        end_time: entry.end_time,
      }));
      setEntries(mappedEntries);
    } catch (error) {
      console.error("Error fetching entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, hasViolation: boolean | null) => {
    if (hasViolation && status === "pending") {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Violation
          </Badge>
          <Badge className="status-pending">Pending</Badge>
        </div>
      );
    }
    switch (status) {
      case "approved":
        return <Badge className="status-approved">Approved</Badge>;
      case "revision_needed":
        return <Badge className="status-revision">Revision Needed</Badge>;
      default:
        return <Badge className="status-pending">Pending</Badge>;
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return "";
    return time.slice(0, 5);
  };

  const filteredEntries = entries.filter((entry) => {
    if (activeTab === "pending") return entry.status === "pending";
    if (activeTab === "approved") return entry.status === "approved";
    if (activeTab === "revision") return entry.status === "revision_needed";
    if (activeTab === "violations") return entry.has_violation && entry.status !== "approved";
    return true;
  });

  const violationCount = entries.filter(e => e.has_violation && e.status !== "approved").length;

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
          <h1 className="text-2xl font-bold text-foreground">Reviews</h1>
          <p className="text-muted-foreground">
            Review and provide feedback on student logbook entries
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({entries.filter((e) => e.status === "pending").length})
            </TabsTrigger>
            {violationCount > 0 && (
              <TabsTrigger value="violations" className="text-destructive">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Violations ({violationCount})
              </TabsTrigger>
            )}
            <TabsTrigger value="approved">
              Approved ({entries.filter((e) => e.status === "approved").length})
            </TabsTrigger>
            <TabsTrigger value="revision">
              Revision (
              {entries.filter((e) => e.status === "revision_needed").length})
            </TabsTrigger>
            <TabsTrigger value="all">All ({entries.length})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredEntries.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No entries found
                    </h3>
                    <p className="text-muted-foreground">
                      {activeTab === "pending"
                        ? "No pending entries to review."
                        : activeTab === "violations"
                        ? "No entries with violations."
                        : `No ${activeTab} entries found.`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredEntries.map((entry) => (
                  <Card 
                    key={entry.id}
                    className={entry.has_violation && entry.status !== "approved" ? "border-destructive/50" : ""}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-semibold text-foreground">
                              {entry.student_name}
                            </span>
                            {getStatusBadge(entry.status, entry.has_violation)}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(entry.entry_date).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "short",
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </div>
                            <div className={`flex items-center gap-1 ${entry.hours_worked > MAX_DAILY_HOURS ? 'text-destructive font-medium' : ''}`}>
                              <Clock className="h-4 w-4" />
                              {entry.hours_worked} hours
                              {entry.hours_worked > MAX_DAILY_HOURS && (
                                <span className="text-xs">(exceeds max)</span>
                              )}
                            </div>
                            {entry.start_time && entry.end_time && (
                              <span className="text-xs">
                                {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                              </span>
                            )}
                          </div>

                          {entry.has_violation && entry.status !== "approved" && (
                            <div className="p-2 rounded bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              This entry exceeds the maximum {MAX_DAILY_HOURS} hours per day limit. 
                              Cannot be approved until corrected.
                            </div>
                          )}

                          <p className="text-muted-foreground line-clamp-2">
                            {entry.activity_description}
                          </p>
                        </div>

                        <Button variant="outline" asChild>
                          <Link to={`/reviews/${entry.id}`}>Review</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
