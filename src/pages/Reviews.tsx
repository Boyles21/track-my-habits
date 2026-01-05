import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Calendar, Clock } from "lucide-react";

interface Entry {
  id: string;
  entry_date: string;
  activity_description: string;
  skills_learned: string | null;
  hours_worked: number;
  status: string;
  student_id: string;
  student_name: string;
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
      // Get assigned student IDs
      const { data: assignments } = await supabase
        .from("supervisor_students")
        .select("student_id")
        .eq("supervisor_id", user?.id);

      if (!assignments || assignments.length === 0) {
        setLoading(false);
        return;
      }

      const studentIds = assignments.map((a) => a.student_id);

      // Fetch entries from assigned students
      const { data: entriesData } = await supabase
        .from("logbook_entries")
        .select(`
          *,
          profiles!logbook_entries_student_id_fkey (
            full_name
          )
        `)
        .in("student_id", studentIds)
        .order("entry_date", { ascending: false });

      if (entriesData) {
        const mappedEntries = entriesData.map((entry) => ({
          id: entry.id,
          entry_date: entry.entry_date,
          activity_description: entry.activity_description,
          skills_learned: entry.skills_learned,
          hours_worked: entry.hours_worked || 8,
          status: entry.status,
          student_id: entry.student_id,
          student_name: (entry.profiles as any)?.full_name || "Unknown",
        }));
        setEntries(mappedEntries);
      }
    } catch (error) {
      console.error("Error fetching entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="status-approved">Approved</Badge>;
      case "revision_needed":
        return <Badge className="status-revision">Revision Needed</Badge>;
      default:
        return <Badge className="status-pending">Pending</Badge>;
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (activeTab === "pending") return entry.status === "pending";
    if (activeTab === "approved") return entry.status === "approved";
    if (activeTab === "revision") return entry.status === "revision_needed";
    return true;
  });

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
                        : `No ${activeTab} entries found.`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredEntries.map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-semibold text-foreground">
                              {entry.student_name}
                            </span>
                            {getStatusBadge(entry.status)}
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
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {entry.hours_worked} hours
                            </div>
                          </div>

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
