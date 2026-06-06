import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Calendar,
  Clock,
  AlertTriangle,
  Activity,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
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
  created_at: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] as any },
  }),
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

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

export default function Reviews() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
    if (!authLoading && role !== "supervisor") navigate("/dashboard");
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user && role === "supervisor") fetchEntries();
  }, [user, role]);

  const fetchEntries = async () => {
    try {
      const { data: assignments } = await supabase
        .from("supervisor_students")
        .select("student_id")
        .eq("supervisor_id", user?.id);

      if (!assignments || assignments.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }
      const studentIds = assignments.map((a) => a.student_id);

      const { data: entriesData } = await supabase
        .from("logbook_entries")
        .select("*")
        .in("student_id", studentIds)
        .order("has_violation", { ascending: false })
        .order("entry_date", { ascending: false });

      if (!entriesData) {
        setEntries([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);
      const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

      setEntries(
        entriesData.map((entry) => ({
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
          created_at: entry.created_at,
        }))
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = entries.filter((e) => {
    if (activeTab === "pending") return e.status === "pending";
    if (activeTab === "approved") return e.status === "approved";
    if (activeTab === "revision") return e.status === "revision_needed";
    if (activeTab === "violations") return e.has_violation && e.status !== "approved";
    return true;
  });

  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const approvedCount = entries.filter((e) => e.status === "approved").length;
  const revisionCount = entries.filter((e) => e.status === "revision_needed").length;
  const violationCount = entries.filter((e) => e.has_violation && e.status !== "approved").length;

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

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
                <Activity className="h-4 w-4" /> Reviews
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
                Review queue
              </h1>
              <p className="text-muted-foreground mt-1">
                {pendingCount} pending · {violationCount} flagged · {approvedCount} approved
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="status-pending">
                <Clock className="h-3 w-3 mr-1" /> {pendingCount} pending
              </Badge>
              {violationCount > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" /> {violationCount} violations
                </Badge>
              )}
            </div>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
            {violationCount > 0 && (
              <TabsTrigger value="violations" className="text-destructive">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Violations ({violationCount})
              </TabsTrigger>
            )}
            <TabsTrigger value="approved">Approved ({approvedCount})</TabsTrigger>
            <TabsTrigger value="revision">Revision ({revisionCount})</TabsTrigger>
            <TabsTrigger value="all">All ({entries.length})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filtered.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-medium">No entries found</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    {activeTab === "pending"
                      ? "All caught up — nothing waiting for review."
                      : `No ${activeTab} entries.`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {filtered.map((entry, i) => {
                  const priority = entry.has_violation && entry.status !== "approved";
                  return (
                    <motion.div
                      key={entry.id}
                      custom={i}
                      initial="hidden"
                      animate="visible"
                      variants={fadeUp}
                      whileHover={{ y: -2 }}
                    >
                      <Card
                        className={`hover:shadow-lg transition-all ${
                          priority ? "border-destructive/40 bg-destructive/[0.03]" : ""
                        }`}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center font-semibold text-sm shrink-0">
                              {initials(entry.student_name)}
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold">{entry.student_name}</span>
                                {priority && (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Priority
                                  </Badge>
                                )}
                                {entry.status === "approved" && (
                                  <Badge className="status-approved text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Approved
                                  </Badge>
                                )}
                                {entry.status === "pending" && !priority && (
                                  <Badge className="status-pending text-xs">Pending</Badge>
                                )}
                                {entry.status === "revision_needed" && (
                                  <Badge className="status-revision text-xs">Revision</Badge>
                                )}
                                <span className="text-xs text-muted-foreground ml-auto">
                                  Submitted {timeAgo(entry.created_at)}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {new Date(entry.entry_date).toLocaleDateString("en-US", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                                <span
                                  className={`flex items-center gap-1 ${
                                    entry.hours_worked > MAX_DAILY_HOURS ? "text-destructive font-medium" : ""
                                  }`}
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                  {entry.hours_worked}h
                                  {entry.hours_worked > MAX_DAILY_HOURS && " (exceeds limit)"}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {entry.activity_description}
                              </p>
                            </div>
                            <Button asChild size="sm" variant={priority ? "destructive" : "default"}>
                              <Link to={`/reviews/${entry.id}`}>
                                Review <ArrowRight className="h-3.5 w-3.5 ml-1" />
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
