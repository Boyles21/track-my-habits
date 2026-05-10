import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Users,
  GraduationCap,
  Building2,
  Briefcase,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  BarChart3,
  FileText,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SystemStats {
  totalStudents: number;
  totalSupervisors: number;
  totalInstitutions: number;
  totalOrganizations: number;
  activeStudents: number;
  totalEntries: number;
  approvedEntries: number;
  pendingEntries: number;
  revisionEntries: number;
  totalHoursLogged: number;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<SystemStats>({
    totalStudents: 0,
    totalSupervisors: 0,
    totalInstitutions: 0,
    totalOrganizations: 0,
    activeStudents: 0,
    totalEntries: 0,
    approvedEntries: 0,
    pendingEntries: 0,
    revisionEntries: 0,
    totalHoursLogged: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch all counts in parallel
      const [
        studentsResult,
        supervisorsResult,
        institutionsResult,
        organizationsResult,
        entriesResult,
        auditLogsResult,
      ] = await Promise.all([
        // Count students
        supabase
          .from("user_roles")
          .select("user_id", { count: "exact" })
          .eq("role", "student"),
        // Count supervisors
        supabase
          .from("user_roles")
          .select("user_id", { count: "exact" })
          .eq("role", "supervisor"),
        // Count institutions
        supabase.from("institutions").select("id", { count: "exact" }),
        // Count organizations
        supabase.from("organizations").select("id", { count: "exact" }),
        // Fetch all logbook entries for stats
        supabase
          .from("logbook_entries")
          .select("id, status, hours_worked"),
        // Fetch recent audit logs
        supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const entries = entriesResult.data || [];
      const approvedEntries = entries.filter((e) => e.status === "approved").length;
      const pendingEntries = entries.filter((e) => e.status === "pending").length;
      const revisionEntries = entries.filter((e) => e.status === "revision_needed").length;
      const totalHoursLogged = entries.reduce(
        (sum, e) => sum + (Number(e.hours_worked) || 0),
        0
      );

      setStats({
        totalStudents: studentsResult.count || 0,
        totalSupervisors: supervisorsResult.count || 0,
        totalInstitutions: institutionsResult.count || 0,
        totalOrganizations: organizationsResult.count || 0,
        activeStudents: studentsResult.count || 0, // Could be refined with SIWES settings
        totalEntries: entries.length,
        approvedEntries,
        pendingEntries,
        revisionEntries,
        totalHoursLogged,
      });

      setRecentActivity(auditLogsResult.data || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const approvalRate = stats.totalEntries > 0
    ? Math.round((stats.approvedEntries / stats.totalEntries) * 100)
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {profile?.full_name}. Here's your system overview.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeStudents} active in SIWES
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supervisors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSupervisors}</div>
            <p className="text-xs text-muted-foreground">
              Managing students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Institutions</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInstitutions}</div>
            <p className="text-xs text-muted-foreground">
              Registered institutions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrganizations}</div>
            <p className="text-xs text-muted-foreground">
              Placement companies
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Logbook Analytics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Logbook Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Approved</span>
                  <CheckCircle className="h-4 w-4 text-success" />
                </div>
                <p className="text-2xl font-bold text-success">{stats.approvedEntries}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <Clock className="h-4 w-4 text-warning" />
                </div>
                <p className="text-2xl font-bold text-warning">{stats.pendingEntries}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Needs Revision</span>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </div>
                <p className="text-2xl font-bold text-destructive">{stats.revisionEntries}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Approval Rate</span>
                <span className="font-medium">{approvalRate}%</span>
              </div>
              <Progress value={approvalRate} className="h-2" />
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Hours Logged</p>
                  <p className="text-xl font-bold">{stats.totalHoursLogged.toLocaleString()} hours</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary opacity-50" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/admin/students">
                <Users className="mr-2 h-4 w-4" />
                Manage Students
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/admin/institutions">
                <Building2 className="mr-2 h-4 w-4" />
                Manage Institutions
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/admin/organizations">
                <Briefcase className="mr-2 h-4 w-4" />
                Manage Organizations
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/admin/analytics">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Analytics
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/admin/audit-logs">
                <FileText className="mr-2 h-4 w-4" />
                View Audit Logs
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent System Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{log.action_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.table_name && `Table: ${log.table_name}`}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
