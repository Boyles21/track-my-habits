import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  BarChart3,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsData {
  totalStudents: number;
  totalSupervisors: number;
  totalEntries: number;
  approvedEntries: number;
  pendingEntries: number;
  revisionEntries: number;
  totalHoursLogged: number;
  entriesByStatus: { name: string; value: number; color: string }[];
  entriesByMonth: { month: string; entries: number; approved: number }[];
  skillsDistribution: { name: string; count: number }[];
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      // Fetch all data in parallel
      const [
        studentsResult,
        supervisorsResult,
        entriesResult,
        skillsResult,
      ] = await Promise.all([
        supabase.from("user_roles").select("user_id", { count: "exact" }).eq("role", "student"),
        supabase.from("user_roles").select("user_id", { count: "exact" }).eq("role", "supervisor"),
        supabase.from("logbook_entries").select("id, status, hours_worked, created_at, entry_date"),
        supabase.from("entry_skills").select("skill_id, skills(name)"),
      ]);

      const entries = entriesResult.data || [];
      
      // Filter by date range if needed
      let filteredEntries = entries;
      if (dateRange !== "all") {
        const daysAgo = parseInt(dateRange);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysAgo);
        filteredEntries = entries.filter((e) => new Date(e.entry_date) >= cutoff);
      }

      const approved = filteredEntries.filter((e) => e.status === "approved").length;
      const pending = filteredEntries.filter((e) => e.status === "pending").length;
      const revision = filteredEntries.filter((e) => e.status === "revision_needed").length;
      const totalHours = filteredEntries.reduce((sum, e) => sum + (Number(e.hours_worked) || 0), 0);

      // Group entries by month
      const monthlyData: Record<string, { entries: number; approved: number }> = {};
      filteredEntries.forEach((entry) => {
        const date = new Date(entry.entry_date);
        const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { entries: 0, approved: 0 };
        }
        monthlyData[monthKey].entries++;
        if (entry.status === "approved") {
          monthlyData[monthKey].approved++;
        }
      });

      const entriesByMonth = Object.entries(monthlyData)
        .map(([month, data]) => ({ month, ...data }))
        .slice(-6); // Last 6 months

      // Skills distribution
      const skillCounts: Record<string, number> = {};
      (skillsResult.data || []).forEach((es: any) => {
        const skillName = es.skills?.name;
        if (skillName) {
          skillCounts[skillName] = (skillCounts[skillName] || 0) + 1;
        }
      });
      const skillsDistribution = Object.entries(skillCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setData({
        totalStudents: studentsResult.count || 0,
        totalSupervisors: supervisorsResult.count || 0,
        totalEntries: filteredEntries.length,
        approvedEntries: approved,
        pendingEntries: pending,
        revisionEntries: revision,
        totalHoursLogged: totalHours,
        entriesByStatus: [
          { name: "Approved", value: approved, color: "hsl(142, 71%, 45%)" },
          { name: "Pending", value: pending, color: "hsl(38, 92%, 50%)" },
          { name: "Needs Revision", value: revision, color: "hsl(0, 84%, 60%)" },
        ],
        entriesByMonth,
        skillsDistribution,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) return null;

  const approvalRate = data.totalEntries > 0
    ? Math.round((data.approvedEntries / data.totalEntries) * 100)
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground">System-wide performance metrics</p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="180">Last 6 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalEntries.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {data.totalHoursLogged.toLocaleString()} hours logged
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvalRate}%</div>
              <Progress value={approvalRate} className="h-2 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{data.pendingEntries}</div>
              <p className="text-xs text-muted-foreground">Awaiting supervisor action</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Needs Revision</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{data.revisionEntries}</div>
              <p className="text-xs text-muted-foreground">Returned to students</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Entries by Month */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Entries Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.entriesByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.entriesByMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="entries" name="Total" fill="hsl(168, 76%, 36%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="approved" name="Approved" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.totalEntries > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.entriesByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.entriesByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Skills Distribution */}
        {data.skillsDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Skills Tracked</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.skillsDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(168, 76%, 36%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
