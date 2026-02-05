import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  FileText,
  Plus,
  AlertTriangle,
} from "lucide-react";
import HoursProgressCard from "./HoursProgressCard";
import WeeklyHoursTable from "./WeeklyHoursTable";
import { calculateWeeklyHours, MAX_DAILY_HOURS, WeeklyHoursSummary } from "@/lib/hours-validation";

interface LogbookEntry {
  id: string;
  entry_date: string;
  activity_description: string;
  status: string;
  created_at: string;
  hours_worked: number | null;
  has_violation: boolean | null;
  violation_type: string | null;
  start_time: string | null;
  end_time: string | null;
}

interface Stats {
  totalEntries: number;
  approvedEntries: number;
  pendingEntries: number;
  revisionEntries: number;
  totalDocuments: number;
  totalHours: number;
  dailyViolations: number;
  weeklyViolations: number;
}

export default function StudentDashboard() {
  const { profile, user } = useAuth();
  const [recentEntries, setRecentEntries] = useState<LogbookEntry[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyHoursSummary[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalEntries: 0,
    approvedEntries: 0,
    pendingEntries: 0,
    revisionEntries: 0,
    totalDocuments: 0,
    totalHours: 0,
    dailyViolations: 0,
    weeklyViolations: 0,
  });
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
        .select("id, entry_date, activity_description, status, created_at, hours_worked, has_violation, violation_type, start_time, end_time")
        .eq("student_id", user?.id)
        .order("entry_date", { ascending: false })
        .limit(5);

      if (entries) {
        setRecentEntries(entries);
      }

      // Fetch all entries for stats calculation
      const { data: allEntries } = await supabase
        .from("logbook_entries")
        .select("hours_worked, status, entry_date, has_violation")
        .eq("student_id", user?.id);

      // Calculate stats from all entries
      const approvedEntries = allEntries?.filter(e => e.status === "approved") || [];
      const totalHours = approvedEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
      const approvedCount = approvedEntries.length;
      const pendingCount = (allEntries || []).filter(e => e.status === "pending").length;
      const revisionCount = (allEntries || []).filter(e => e.status === "revision_needed").length;
      const dailyViolations = (allEntries || []).filter(e => e.has_violation && e.status !== "approved").length;

      // Calculate weekly data
      const weekly = calculateWeeklyHours(allEntries || []);
      setWeeklyData(weekly);
      const weeklyViolations = weekly.filter(w => w.hasViolation).length;

      const { count: docsCount } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id);

      setStats({
        totalEntries: allEntries?.length || 0,
        approvedEntries: approvedCount,
        pendingEntries: pendingCount,
        revisionEntries: revisionCount,
        totalDocuments: docsCount || 0,
        totalHours,
        dailyViolations,
        weeklyViolations,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, hasViolation: boolean | null) => {
    if (hasViolation && status === "pending") {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Violation
        </Badge>
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

      {/* Hours Progress Card */}
      <HoursProgressCard
        totalHours={stats.totalHours}
        totalEntries={stats.totalEntries}
        approvedEntries={stats.approvedEntries}
        pendingEntries={stats.pendingEntries}
        revisionEntries={stats.revisionEntries}
        dailyViolations={stats.dailyViolations}
        weeklyViolations={stats.weeklyViolations}
      />

      {/* Weekly Hours Summary */}
      {weeklyData.length > 0 && (
        <WeeklyHoursTable weeklyData={weeklyData} maxRows={4} />
      )}

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

        {stats.dailyViolations > 0 && (
          <Card className="border-warning">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">{stats.dailyViolations}</p>
                  <p className="text-sm text-muted-foreground">Hour Violations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {stats.weeklyViolations > 0 && (
          <Card className="border-warning">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">{stats.weeklyViolations}</p>
                  <p className="text-sm text-muted-foreground">Low-Hour Weeks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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
                  className={`flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-secondary/50 transition-colors ${
                    entry.has_violation ? 'border-warning/50' : ''
                  }`}
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
                      {entry.start_time && entry.end_time && (
                        <span className="text-sm text-muted-foreground">
                          {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                        </span>
                      )}
                      {entry.hours_worked && (
                        <span className={`text-sm ${entry.hours_worked > MAX_DAILY_HOURS ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                          • {entry.hours_worked}h
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {entry.activity_description}
                    </p>
                  </div>
                  <div className="ml-4">{getStatusBadge(entry.status, entry.has_violation)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
