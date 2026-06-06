import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Calendar,
  Activity,
  Sparkles,
} from "lucide-react";

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

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] as any },
  }),
};

const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "12px",
    fontSize: "12px",
    boxShadow: "0 10px 30px -10px hsl(var(--foreground) / 0.15)",
  },
  labelStyle: { color: "hsl(var(--foreground))", fontWeight: 600 },
  itemStyle: { color: "hsl(var(--muted-foreground))" },
};

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      const [students, supervisors, entriesResult, skillsResult] = await Promise.all([
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "supervisor"),
        supabase.from("logbook_entries").select("id, status, hours_worked, created_at, entry_date"),
        supabase.from("entry_skills").select("skill_id, skills(name)"),
      ]);

      const entries = entriesResult.data || [];
      let filtered = entries;
      if (dateRange !== "all") {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - parseInt(dateRange));
        filtered = entries.filter((e) => new Date(e.entry_date) >= cutoff);
      }

      const approved = filtered.filter((e) => e.status === "approved").length;
      const pending = filtered.filter((e) => e.status === "pending").length;
      const revision = filtered.filter((e) => e.status === "revision_needed").length;
      const hours = filtered.reduce((s, e) => s + (Number(e.hours_worked) || 0), 0);

      const monthly: Record<string, { entries: number; approved: number }> = {};
      filtered.forEach((entry) => {
        const key = new Date(entry.entry_date).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        if (!monthly[key]) monthly[key] = { entries: 0, approved: 0 };
        monthly[key].entries++;
        if (entry.status === "approved") monthly[key].approved++;
      });
      const entriesByMonth = Object.entries(monthly).map(([month, d]) => ({ month, ...d })).slice(-6);

      const skillCounts: Record<string, number> = {};
      (skillsResult.data || []).forEach((es: any) => {
        const n = es.skills?.name;
        if (n) skillCounts[n] = (skillCounts[n] || 0) + 1;
      });
      const skillsDistribution = Object.entries(skillCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setData({
        totalStudents: students.count || 0,
        totalSupervisors: supervisors.count || 0,
        totalEntries: filtered.length,
        approvedEntries: approved,
        pendingEntries: pending,
        revisionEntries: revision,
        totalHoursLogged: hours,
        entriesByStatus: [
          { name: "Approved", value: approved, color: "hsl(142, 71%, 45%)" },
          { name: "Pending", value: pending, color: "hsl(38, 92%, 50%)" },
          { name: "Revision", value: revision, color: "hsl(0, 84%, 60%)" },
        ],
        entriesByMonth,
        skillsDistribution,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) return null;

  const approvalRate = data.totalEntries > 0 ? Math.round((data.approvedEntries / data.totalEntries) * 100) : 0;

  const kpis = [
    {
      label: "Total Entries",
      value: data.totalEntries.toLocaleString(),
      sub: `${data.totalHoursLogged.toLocaleString()} hours`,
      icon: BarChart3,
      gradient: "from-primary/15 to-primary/5",
      iconBg: "bg-primary/15 text-primary",
    },
    {
      label: "Approval Rate",
      value: `${approvalRate}%`,
      sub: `${data.approvedEntries} approved`,
      icon: CheckCircle2,
      gradient: "from-success/15 to-success/5",
      iconBg: "bg-success/15 text-success",
      progress: approvalRate,
    },
    {
      label: "Pending",
      value: data.pendingEntries,
      sub: "Awaiting supervisor",
      icon: Clock,
      gradient: "from-accent/15 to-accent/5",
      iconBg: "bg-warning/15 text-warning",
    },
    {
      label: "Revision",
      value: data.revisionEntries,
      sub: "Returned to students",
      icon: AlertCircle,
      gradient: data.revisionEntries > 0 ? "from-destructive/15 to-destructive/5" : "from-muted to-muted/30",
      iconBg: "bg-destructive/15 text-destructive",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Hero */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8"
        >
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" /> Analytics
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">System Insights</h1>
              <p className="text-muted-foreground mt-1">
                {data.totalStudents} students · {data.totalSupervisors} supervisors · {data.totalEntries} entries logged.
              </p>
            </div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-44">
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
        </motion.div>

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k, i) => (
            <motion.div
              key={k.label}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Card className={`overflow-hidden border bg-gradient-to-br ${k.gradient} shadow-sm hover:shadow-xl transition-shadow`}>
                <CardContent className="pt-6">
                  <div className={`p-2.5 rounded-xl w-fit ${k.iconBg}`}>
                    <k.icon className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-bold tracking-tight mt-4">{k.value}</p>
                  <p className="text-sm font-medium text-foreground/80 mt-1">{k.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
                  {typeof k.progress === "number" && <Progress value={k.progress} className="h-1.5 mt-3" />}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-2">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4 text-primary" /> Entries Over Time
                </CardTitle>
                <Badge variant="outline" className="text-xs">Last {data.entriesByMonth.length} months</Badge>
              </CardHeader>
              <CardContent>
                {data.entriesByMonth.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.entriesByMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <Tooltip {...chartTooltipStyle} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="entries" name="Total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="approved" name="Approved" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                    <Sparkles className="h-8 w-8 opacity-40" />
                    No data available yet
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" /> Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.totalEntries > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.entriesByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="hsl(var(--card))"
                        strokeWidth={3}
                      >
                        {data.entriesByStatus.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip {...chartTooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                    <Sparkles className="h-8 w-8 opacity-40" />
                    No data available yet
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Skills */}
        {data.skillsDistribution.length > 0 && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" /> Top Skills Tracked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data.skillsDistribution} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip {...chartTooltipStyle} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
