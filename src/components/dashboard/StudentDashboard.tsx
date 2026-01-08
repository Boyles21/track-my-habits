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
  Calendar,
  Target,
} from "lucide-react";

interface LogbookEntry {
  id: string;
  entry_date: string;
  activity_description: string;
  status: string;
  created_at: string;
  hours_worked: number | null;
}

interface Stats {
  totalEntries: number;
  approvedEntries: number;
  pendingEntries: number;
  revisionEntries: number;
  totalDocuments: number;
  totalHours: number;
}

interface SiwesSettings {
  start_date: string;
  required_weeks: number;
}

// Constants for SIWES calculation
const REQUIRED_WEEKS = 24;
const HOURS_PER_DAY = 8;
const DAYS_PER_WEEK = 5;
const TOTAL_REQUIRED_HOURS = REQUIRED_WEEKS * DAYS_PER_WEEK * HOURS_PER_DAY; // 960 hours
const TOTAL_REQUIRED_DAYS = REQUIRED_WEEKS * DAYS_PER_WEEK; // 120 days

export default function StudentDashboard() {
  const { profile, user } = useAuth();
  const [recentEntries, setRecentEntries] = useState<LogbookEntry[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalEntries: 0,
    approvedEntries: 0,
    pendingEntries: 0,
    revisionEntries: 0,
    totalDocuments: 0,
    totalHours: 0,
  });
  const [siwesSettings, setSiwesSettings] = useState<SiwesSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch recent entries with hours
      const { data: entries } = await supabase
        .from("logbook_entries")
        .select("id, entry_date, activity_description, status, created_at, hours_worked")
        .eq("student_id", user?.id)
        .order("entry_date", { ascending: false })
        .limit(5);

      if (entries) {
        setRecentEntries(entries);
      }

      // Fetch all entries for stats calculation
      const { data: allEntries } = await supabase
        .from("logbook_entries")
        .select("hours_worked, status")
        .eq("student_id", user?.id);

      // Calculate stats from all entries
      const totalHours = (allEntries || []).reduce(
        (sum, e) => sum + (e.hours_worked || 0),
        0
      );
      const approvedCount = (allEntries || []).filter(e => e.status === "approved").length;
      const pendingCount = (allEntries || []).filter(e => e.status === "pending").length;
      const revisionCount = (allEntries || []).filter(e => e.status === "revision_needed").length;

      const { count: docsCount } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id);

      // Fetch SIWES settings
      const { data: settings } = await supabase
        .from("siwes_settings")
        .select("start_date, required_weeks")
        .eq("student_id", user?.id)
        .maybeSingle();

      setSiwesSettings(settings);

      setStats({
        totalEntries: allEntries?.length || 0,
        approvedEntries: approvedCount,
        pendingEntries: pendingCount,
        revisionEntries: revisionCount,
        totalDocuments: docsCount || 0,
        totalHours,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate progress percentages
  const hoursProgress = Math.min(Math.round((stats.totalHours / TOTAL_REQUIRED_HOURS) * 100), 100);
  const daysProgress = Math.min(Math.round((stats.totalEntries / TOTAL_REQUIRED_DAYS) * 100), 100);
  const approvalProgress = stats.totalEntries > 0
    ? Math.round((stats.approvedEntries / stats.totalEntries) * 100)
    : 0;

  // Calculate remaining
  const remainingHours = Math.max(TOTAL_REQUIRED_HOURS - stats.totalHours, 0);
  const remainingDays = Math.max(TOTAL_REQUIRED_DAYS - stats.totalEntries, 0);

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

      {/* Overall Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            SIWES Progress ({REQUIRED_WEEKS} Weeks Program)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hours Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Total Hours Logged
              </span>
              <span className="font-medium">
                {stats.totalHours} / {TOTAL_REQUIRED_HOURS} hrs
              </span>
            </div>
            <Progress value={hoursProgress} className="h-3" />
            <p className="text-sm text-muted-foreground">
              {hoursProgress}% complete • {remainingHours} hours remaining
            </p>
          </div>

          {/* Days Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Days Completed
              </span>
              <span className="font-medium">
                {stats.totalEntries} / {TOTAL_REQUIRED_DAYS} days
              </span>
            </div>
            <Progress value={daysProgress} className="h-3" />
            <p className="text-sm text-muted-foreground">
              {daysProgress}% complete • {remainingDays} days remaining
            </p>
          </div>

          {/* Approval Rate */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Entries Approved
              </span>
              <span className="font-medium">
                {stats.approvedEntries} / {stats.totalEntries}
              </span>
            </div>
            <Progress value={approvalProgress} className="h-3" />
            <p className="text-sm text-muted-foreground">
              {approvalProgress}% approval rate
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.revisionEntries}</p>
                <p className="text-sm text-muted-foreground">Needs Revision</p>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">
                        {new Date(entry.entry_date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      {entry.hours_worked && (
                        <span className="text-sm text-muted-foreground">
                          • {entry.hours_worked}h
                        </span>
                      )}
                    </div>
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
