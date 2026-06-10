import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  FileText,
  Plus,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Upload,
  Target,
  Sparkles,
  ShieldAlert,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  calculateWeeklyHours,
  TOTAL_REQUIRED_HOURS,
  TOTAL_REQUIRED_DAYS,
  MIN_WEEKLY_HOURS,
  MAX_DAILY_HOURS,
  formatHours,
  calculateCompletionPercentage,
  WeeklyHoursSummary,
} from "@/lib/hours-validation";

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

interface DocumentItem {
  id: string;
  file_name: string;
  created_at: string;
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

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] as any },
  }),
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function StudentDashboard() {
  const { profile, user } = useAuth();
  const [recentEntries, setRecentEntries] = useState<LogbookEntry[]>([]);
  const [recentDocs, setRecentDocs] = useState<DocumentItem[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyHoursSummary[]>([]);
  const [chartWeeklyData, setChartWeeklyData] = useState<WeeklyHoursSummary[]>([]);
  const [chartRange, setChartRange] = useState<number>(8);
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
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const { data: entries } = await supabase
        .from("logbook_entries")
        .select(
          "id, entry_date, activity_description, status, created_at, hours_worked, has_violation, violation_type, start_time, end_time"
        )
        .eq("student_id", user?.id)
        .order("entry_date", { ascending: false })
        .limit(5);

      if (entries) setRecentEntries(entries);

      const { data: allEntries } = await supabase
        .from("logbook_entries")
        .select("hours_worked, status, entry_date, has_violation")
        .eq("student_id", user?.id);

      const approvedEntries = allEntries?.filter((e) => e.status === "approved") || [];
      const totalHours = approvedEntries.reduce((s, e) => s + (e.hours_worked || 0), 0);
      const approvedCount = approvedEntries.length;
      const pendingCount = (allEntries || []).filter((e) => e.status === "pending").length;
      const revisionCount = (allEntries || []).filter((e) => e.status === "revision_needed").length;
      const dailyViolations = (allEntries || []).filter((e) => e.has_violation && e.status !== "approved").length;

      const weekly = calculateWeeklyHours(allEntries || []);
      setWeeklyData(weekly);
      setChartWeeklyData(calculateWeeklyHours(allEntries || [], { includeAllStatuses: true }));
      const weeklyViolations = weekly.filter((w) => w.hasViolation).length;

      const { count: docsCount } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id);

      const { data: docs } = await supabase
        .from("documents")
        .select("id, file_name, created_at")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (docs) setRecentDocs(docs as DocumentItem[]);

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

  const hoursProgress = calculateCompletionPercentage(stats.totalHours);
  const daysProgress = Math.min(Math.round((stats.totalEntries / TOTAL_REQUIRED_DAYS) * 100), 100);
  const approvalRate =
    stats.totalEntries > 0 ? Math.round((stats.approvedEntries / stats.totalEntries) * 100) : 0;
  const remainingHours = Math.max(TOTAL_REQUIRED_HOURS - stats.totalHours, 0);
  const totalViolations = stats.dailyViolations + stats.weeklyViolations;

  const estimatedCompletion = useMemo(() => {
    if (stats.totalHours <= 0) return "—";
    const weeksLogged = Math.max(weeklyData.length, 1);
    const avgPerWeek = stats.totalHours / weeksLogged;
    if (avgPerWeek <= 0) return "—";
    const weeksLeft = Math.ceil(remainingHours / avgPerWeek);
    const d = new Date();
    d.setDate(d.getDate() + weeksLeft * 7);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }, [stats.totalHours, weeklyData.length, remainingHours]);

  const chartData = useMemo(() => {
    const source = chartWeeklyData.length ? chartWeeklyData : weeklyData;
    const sorted = [...source].sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
    const sliced = chartRange === 0 ? sorted : sorted.slice(-chartRange);
    return sliced.map((w) => ({
      week: w.weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      hours: Math.round(w.totalHours * 10) / 10,
      target: MIN_WEEKLY_HOURS,
    }));
  }, [chartWeeklyData, weeklyData, chartRange]);

  const currentWeek = weeklyData[0];
  const currentWeekHours = currentWeek?.totalHours || 0;
  const weeklyDeficit = Math.max(MIN_WEEKLY_HOURS - currentWeekHours, 0);

  const nextActions = useMemo(() => {
    const actions: { label: string; href: string; icon: any; tone: string }[] = [];
    const today = new Date().toISOString().slice(0, 10);
    const loggedToday = recentEntries.some((e) => e.entry_date === today);
    if (!loggedToday)
      actions.push({ label: "Submit today's logbook entry", href: "/logbook/new", icon: BookOpen, tone: "primary" });
    if (weeklyDeficit > 0)
      actions.push({
        label: `Log ${formatHours(weeklyDeficit)} more this week`,
        href: "/logbook/new",
        icon: Clock,
        tone: "accent",
      });
    if (totalViolations > 0)
      actions.push({ label: "Resolve outstanding violations", href: "/logbook", icon: ShieldAlert, tone: "warning" });
    if (stats.totalDocuments === 0)
      actions.push({ label: "Upload your weekly report", href: "/documents", icon: Upload, tone: "primary" });
    if (actions.length === 0)
      actions.push({ label: "You're on track — keep going!", href: "/logbook", icon: Sparkles, tone: "success" });
    return actions.slice(0, 4);
  }, [recentEntries, weeklyDeficit, totalViolations, stats.totalDocuments]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <div className="grid lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: "Hours Completed",
      value: formatHours(stats.totalHours),
      sub: `of ${formatHours(TOTAL_REQUIRED_HOURS)}`,
      icon: Clock,
      gradient: "from-primary/15 to-primary/5",
      iconBg: "bg-primary/15 text-primary",
    },
    {
      label: "Days Completed",
      value: `${stats.totalEntries}`,
      sub: `of ${TOTAL_REQUIRED_DAYS} days`,
      icon: Calendar,
      gradient: "from-accent/15 to-accent/5",
      iconBg: "bg-accent/15 text-accent",
    },
    {
      label: "Approval Rate",
      value: `${approvalRate}%`,
      sub: `${stats.approvedEntries}/${stats.totalEntries} approved`,
      icon: CheckCircle2,
      gradient: "from-success/15 to-success/5",
      iconBg: "bg-success/15 text-success",
    },
    {
      label: "Active Violations",
      value: `${totalViolations}`,
      sub: totalViolations > 0 ? "Needs attention" : "All clear",
      icon: AlertTriangle,
      gradient: totalViolations > 0 ? "from-destructive/15 to-destructive/5" : "from-muted to-muted/30",
      iconBg: totalViolations > 0 ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8"
      >
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-10 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" /> Student Dashboard
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
              Welcome back, {profile?.full_name?.split(" ")[0] || "Student"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {hoursProgress}% through your SIWES — {formatHours(remainingHours)} to go.
            </p>
          </div>
          <Button asChild size="lg" className="shadow-lg shadow-primary/20">
            <Link to="/logbook/new">
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards */}
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
            <Card className={`relative overflow-hidden border bg-gradient-to-br ${k.gradient} shadow-sm hover:shadow-xl transition-shadow`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-xl ${k.iconBg}`}>
                    <k.icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-bold tracking-tight">{k.value}</p>
                  <p className="text-sm font-medium text-foreground/80 mt-1">{k.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Violations warning */}
      {totalViolations > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <Card className="border-destructive/40 bg-gradient-to-r from-destructive/10 via-warning/5 to-transparent overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="p-3 rounded-xl bg-destructive/15 text-destructive shrink-0">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg">Compliance Issues Detected</h3>
                    <Badge variant="destructive" className="text-xs">
                      {totalViolations > 2 ? "High" : "Medium"} severity
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.dailyViolations > 0 && (
                      <>• {stats.dailyViolations} {stats.dailyViolations === 1 ? "entry exceeds" : "entries exceed"} the {MAX_DAILY_HOURS}h daily limit. </>
                    )}
                    {stats.weeklyViolations > 0 && (
                      <>• {stats.weeklyViolations} {stats.weeklyViolations === 1 ? "week is" : "weeks are"} below the {MIN_WEEKLY_HOURS}h minimum. </>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong className="text-foreground">Recommended:</strong> Edit the affected entries or add make-up hours to restore compliance.
                  </p>
                </div>
                <Button variant="destructive" asChild>
                  <Link to="/logbook">
                    Review <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Analytics: Progress + Chart */}
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-primary" />
                Progress Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Hours</span>
                  <span className="font-semibold">{hoursProgress}%</span>
                </div>
                <Progress value={hoursProgress} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Days</span>
                  <span className="font-semibold">{daysProgress}%</span>
                </div>
                <Progress value={daysProgress} className="h-2" />
              </div>
              <div className="pt-2 border-t grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Weekly Target</p>
                  <p className="font-semibold">{MIN_WEEKLY_HOURS}h</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Hours Remaining</p>
                  <p className="font-semibold">{formatHours(remainingHours)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Est. Completion</p>
                  <p className="font-semibold flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    {estimatedCompletion}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Weekly Hours Analytics
                </span>
                <div className="flex items-center gap-1">
                  {[4, 8, 12, 0].map((r) => (
                    <button
                      key={r}
                      onClick={() => setChartRange(r)}
                      className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                        chartRange === r
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {r === 0 ? "All" : `${r}w`}
                    </button>
                  ))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                  No data yet — log your first entry to see trends.
                </div>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        formatter={(v: any) => [`${v}h`, "Hours"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="hours"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        fill="url(#hoursGrad)"
                        animationDuration={900}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity + Next Actions */}
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Recent Activity
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/logbook">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentEntries.length === 0 && recentDocs.length === 0 ? (
                <div className="text-center py-10">
                  <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No activity yet</p>
                  <Button asChild className="mt-3" size="sm">
                    <Link to="/logbook/new">Create your first entry</Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y">
                  {recentEntries.map((e) => (
                    <li key={e.id} className="py-3 flex items-start gap-3">
                      <div className={`mt-0.5 p-2 rounded-lg ${e.status === "approved" ? "bg-success/15 text-success" : e.has_violation ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"}`}>
                        {e.status === "approved" ? <CheckCircle2 className="h-4 w-4" /> : e.has_violation ? <AlertTriangle className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {e.status === "approved" ? "Entry approved" : e.has_violation ? "Entry flagged" : "Logbook entry"} • {new Date(e.entry_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{e.activity_description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(e.created_at)}</span>
                    </li>
                  ))}
                  {recentDocs.map((d) => (
                    <li key={d.id} className="py-3 flex items-start gap-3">
                      <div className="mt-0.5 p-2 rounded-lg bg-accent/15 text-accent">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Document uploaded</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{d.file_name}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(d.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <Card className="h-full bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Next Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {nextActions.map((a, i) => (
                <Link
                  key={i}
                  to={a.href}
                  className="group flex items-center gap-3 rounded-xl border bg-card p-3 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <a.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium flex-1">{a.label}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
