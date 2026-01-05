import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
} from "lucide-react";

interface LogbookEntry {
  id: string;
  entry_date: string;
  activity_description: string;
  status: string;
  created_at: string;
}

interface Stats {
  totalEntries: number;
  approvedEntries: number;
  pendingEntries: number;
  totalDocuments: number;
}

export default function StudentDashboard() {
  const { profile, user } = useAuth();
  const [recentEntries, setRecentEntries] = useState<LogbookEntry[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalEntries: 0,
    approvedEntries: 0,
    pendingEntries: 0,
    totalDocuments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch recent entries
      const { data: entries } = await supabase
        .from("logbook_entries")
        .select("*")
        .eq("student_id", user?.id)
        .order("entry_date", { ascending: false })
        .limit(5);

      if (entries) {
        setRecentEntries(entries);
      }

      // Fetch stats
      const { count: totalCount } = await supabase
        .from("logbook_entries")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user?.id);

      const { count: approvedCount } = await supabase
        .from("logbook_entries")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user?.id)
        .eq("status", "approved");

      const { count: pendingCount } = await supabase
        .from("logbook_entries")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user?.id)
        .eq("status", "pending");

      const { count: docsCount } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id);

      setStats({
        totalEntries: totalCount || 0,
        approvedEntries: approvedCount || 0,
        pendingEntries: pendingCount || 0,
        totalDocuments: docsCount || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage =
    stats.totalEntries > 0
      ? Math.round((stats.approvedEntries / stats.totalEntries) * 100)
      : 0;

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {profile?.full_name?.split(" ")[0] || "Student"}!
          </h1>
          <p className="text-muted-foreground">
            Track your SIWES internship progress
          </p>
        </div>
        <Button asChild>
          <Link to="/logbook/new">
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Link>
        </Button>
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Internship Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Entries Approved</span>
              <span className="font-medium">
                {stats.approvedEntries} / {stats.totalEntries}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {progressPercentage}% of your logbook entries have been approved
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalEntries}</p>
                <p className="text-sm text-muted-foreground">Total Entries</p>
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
                <p className="text-2xl font-bold">{stats.approvedEntries}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
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
                <p className="text-2xl font-bold">{stats.pendingEntries}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <FileText className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalDocuments}</p>
                <p className="text-sm text-muted-foreground">Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Entries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Entries</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/logbook">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No entries yet</p>
              <Button asChild className="mt-4">
                <Link to="/logbook/new">Create Your First Entry</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-secondary/50 transition-colors"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {new Date(entry.entry_date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {entry.activity_description}
                    </p>
                  </div>
                  <div className="ml-4">{getStatusBadge(entry.status)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
