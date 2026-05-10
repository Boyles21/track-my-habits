import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Printer,
  Download,
  User,
  Building2,
  GraduationCap,
  Calendar,
  Clock,
  BookOpen,
  Award,
  FileText,
  Loader2,
} from "lucide-react";

interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  faculty: string | null;
  department: string | null;
  programme: string | null;
  institution: string | null;
}

interface PlacementInfo {
  organization_name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
}

interface LogbookEntry {
  id: string;
  entry_date: string;
  activity_description: string;
  skills_learned: string | null;
  hours_worked: number | null;
  status: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  supervisor_name: string;
  entry_date: string;
}

interface ValidatedSkill {
  skill_name: string;
  category: string | null;
  rating: number | null;
  validated_at: string | null;
}

interface ReportData {
  student: StudentProfile;
  supervisor: { full_name: string; email: string } | null;
  placement: PlacementInfo | null;
  entries: LogbookEntry[];
  comments: Comment[];
  skills: ValidatedSkill[];
  stats: {
    totalEntries: number;
    approvedEntries: number;
    totalHours: number;
    totalDays: number;
  };
}

// Constants
const REQUIRED_WEEKS = 24;
const HOURS_PER_DAY = 8;
const DAYS_PER_WEEK = 5;
const TOTAL_REQUIRED_HOURS = REQUIRED_WEEKS * DAYS_PER_WEEK * HOURS_PER_DAY;
const TOTAL_REQUIRED_DAYS = REQUIRED_WEEKS * DAYS_PER_WEEK;

export default function FinalReport() {
  const { id } = useParams(); // Student ID (optional - for supervisors/admins)
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const studentId = id || user?.id;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && studentId) {
      fetchReportData();
    }
  }, [user, studentId]);

  const fetchReportData = async () => {
    try {
      // Fetch student profile
      const { data: studentProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, faculty, department, programme, institution")
        .eq("id", studentId)
        .single();

      if (profileError) throw profileError;

      // Verify access for supervisors
      if (role === "supervisor" && id) {
        const { data: assignment } = await supabase
          .from("supervisor_students")
          .select("id")
          .eq("supervisor_id", user?.id)
          .eq("student_id", id)
          .maybeSingle();

        if (!assignment) {
          toast.error("You don't have access to this student's report");
          navigate("/students");
          return;
        }
      }

      // Fetch supervisor info
      const { data: supervisorAssignment } = await supabase
        .from("supervisor_students")
        .select("supervisor_id")
        .eq("student_id", studentId)
        .maybeSingle();

      let supervisor = null;
      if (supervisorAssignment) {
        const { data: supervisorProfile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", supervisorAssignment.supervisor_id)
          .single();
        supervisor = supervisorProfile;
      }

      // Fetch placement info
      const { data: placementData } = await supabase
        .from("student_placements")
        .select(`
          start_date,
          end_date,
          status,
          organizations:organization_id (name)
        `)
        .eq("student_id", studentId)
        .eq("status", "active")
        .maybeSingle();

      const placement = placementData
        ? {
            organization_name: (placementData.organizations as any)?.name || "N/A",
            start_date: placementData.start_date,
            end_date: placementData.end_date,
            status: placementData.status,
          }
        : null;

      // Fetch all approved logbook entries
      const { data: entries } = await supabase
        .from("logbook_entries")
        .select("id, entry_date, activity_description, skills_learned, hours_worked, status")
        .eq("student_id", studentId)
        .eq("status", "approved")
        .order("entry_date", { ascending: true });

      // Fetch all comments (supervisor remarks)
      const { data: commentsData } = await supabase
        .from("comments")
        .select(`
          id,
          content,
          created_at,
          supervisor_id,
          entry_id
        `)
        .in("entry_id", (entries || []).map((e) => e.id));

      // Map comments with supervisor names and entry dates
      let comments: Comment[] = [];
      if (commentsData && commentsData.length > 0) {
        const supervisorIds = [...new Set(commentsData.map((c) => c.supervisor_id))];
        const { data: supervisorProfiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", supervisorIds);

        const supervisorMap = new Map(supervisorProfiles?.map((p) => [p.id, p.full_name]) || []);
        const entryMap = new Map((entries || []).map((e) => [e.id, e.entry_date]));

        comments = commentsData.map((c) => ({
          id: c.id,
          content: c.content,
          created_at: c.created_at,
          supervisor_name: supervisorMap.get(c.supervisor_id) || "Supervisor",
          entry_date: entryMap.get(c.entry_id) || "",
        }));
      }

      // Fetch validated skills
      const { data: entrySkillsData } = await supabase
        .from("entry_skills")
        .select(`
          rating,
          validated_at,
          skills:skill_id (name, category)
        `)
        .in("entry_id", (entries || []).map((e) => e.id))
        .not("validated_at", "is", null);

      const skills: ValidatedSkill[] = (entrySkillsData || []).map((es: any) => ({
        skill_name: es.skills?.name || "Unknown",
        category: es.skills?.category,
        rating: es.rating,
        validated_at: es.validated_at,
      }));

      // Aggregate skills (deduplicate and average ratings)
      const skillMap = new Map<string, { name: string; category: string | null; ratings: number[] }>();
      skills.forEach((s) => {
        const existing = skillMap.get(s.skill_name);
        if (existing) {
          if (s.rating) existing.ratings.push(s.rating);
        } else {
          skillMap.set(s.skill_name, {
            name: s.skill_name,
            category: s.category,
            ratings: s.rating ? [s.rating] : [],
          });
        }
      });

      const aggregatedSkills: ValidatedSkill[] = Array.from(skillMap.values()).map((s) => ({
        skill_name: s.name,
        category: s.category,
        rating: s.ratings.length > 0 ? Math.round(s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length) : null,
        validated_at: new Date().toISOString(),
      }));

      // Calculate stats
      const totalHours = (entries || []).reduce((sum, e) => sum + (e.hours_worked || 0), 0);

      setReportData({
        student: studentProfile,
        supervisor,
        placement,
        entries: entries || [],
        comments,
        skills: aggregatedSkills,
        stats: {
          totalEntries: (entries || []).length,
          approvedEntries: (entries || []).length,
          totalHours,
          totalDays: (entries || []).length,
        },
      });
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getRatingLabel = (rating: number) => {
    const labels = ["Poor", "Below Average", "Average", "Good", "Excellent"];
    return labels[rating - 1] || "N/A";
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!reportData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Unable to generate report</p>
          <Button asChild className="mt-4">
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const hoursProgress = Math.min(Math.round((reportData.stats.totalHours / TOTAL_REQUIRED_HOURS) * 100), 100);
  const daysProgress = Math.min(Math.round((reportData.stats.totalDays / TOTAL_REQUIRED_DAYS) * 100), 100);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header - Hidden in print */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to={role === "student" ? "/dashboard" : "/students"}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Final SIWES Report</h1>
              <p className="text-muted-foreground">{reportData.student.full_name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
          </div>
        </div>

        {/* Printable Report Content */}
        <div ref={printRef} className="space-y-6 print:space-y-4">
          {/* Report Header - Print Only */}
          <div className="hidden print:block text-center pb-4 border-b">
            <h1 className="text-2xl font-bold">SIWES FINAL REPORT</h1>
            <p className="text-lg mt-2">{reportData.student.full_name}</p>
            <p className="text-sm text-muted-foreground">
              Generated on {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}
            </p>
          </div>

          {/* Student Information */}
          <Card className="print:shadow-none print:border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Full Name</p>
                  <p className="font-medium">{reportData.student.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{reportData.student.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Institution</p>
                  <p className="font-medium">{reportData.student.institution || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Faculty</p>
                  <p className="font-medium">{reportData.student.faculty || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Department</p>
                  <p className="font-medium">{reportData.student.department || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Programme</p>
                  <p className="font-medium">{reportData.student.programme || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Placement Information */}
          <Card className="print:shadow-none print:border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Placement Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Organization</p>
                  <p className="font-medium">{reportData.placement?.organization_name || "Not Assigned"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Supervisor</p>
                  <p className="font-medium">{reportData.supervisor?.full_name || "Not Assigned"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {reportData.placement?.start_date
                      ? new Date(reportData.placement.start_date).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">End Date</p>
                  <p className="font-medium">
                    {reportData.placement?.end_date
                      ? new Date(reportData.placement.end_date).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Summary */}
          <Card className="print:shadow-none print:border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-secondary/50 rounded-lg">
                  <p className="text-2xl font-bold">{reportData.stats.totalDays}</p>
                  <p className="text-sm text-muted-foreground">Days Completed</p>
                  <p className="text-xs text-muted-foreground">of {TOTAL_REQUIRED_DAYS} required</p>
                </div>
                <div className="text-center p-4 bg-secondary/50 rounded-lg">
                  <p className="text-2xl font-bold">{reportData.stats.totalHours}</p>
                  <p className="text-sm text-muted-foreground">Hours Logged</p>
                  <p className="text-xs text-muted-foreground">of {TOTAL_REQUIRED_HOURS} required</p>
                </div>
                <div className="text-center p-4 bg-secondary/50 rounded-lg">
                  <p className="text-2xl font-bold">{daysProgress}%</p>
                  <p className="text-sm text-muted-foreground">Days Progress</p>
                </div>
                <div className="text-center p-4 bg-secondary/50 rounded-lg">
                  <p className="text-2xl font-bold">{hoursProgress}%</p>
                  <p className="text-sm text-muted-foreground">Hours Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills & Competencies */}
          {reportData.skills.length > 0 && (
            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Validated Skills & Competencies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {reportData.skills.map((skill, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{skill.skill_name}</p>
                        {skill.category && (
                          <p className="text-xs text-muted-foreground">{skill.category}</p>
                        )}
                      </div>
                      {skill.rating && (
                        <Badge variant="outline">
                          {skill.rating}/5 - {getRatingLabel(skill.rating)}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Approved Logbook Entries */}
          <Card className="print:shadow-none print:border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Approved Logbook Entries ({reportData.entries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportData.entries.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No approved entries yet.</p>
              ) : (
                <div className="space-y-4">
                  {reportData.entries.map((entry) => (
                    <div key={entry.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">
                          {new Date(entry.entry_date).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <span className="text-sm text-muted-foreground">
                          {entry.hours_worked} hours
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {entry.activity_description}
                      </p>
                      {entry.skills_learned && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <span className="font-medium">Skills:</span> {entry.skills_learned}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supervisor Remarks */}
          {reportData.comments.length > 0 && (
            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Supervisor Remarks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.comments.map((comment) => (
                    <div key={comment.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{comment.supervisor_name}</p>
                        <span className="text-sm text-muted-foreground">
                          {comment.entry_date
                            ? `Entry: ${new Date(comment.entry_date).toLocaleDateString()}`
                            : new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Signature Section - Print Only */}
          <div className="hidden print:block mt-8 pt-8 border-t">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="font-medium mb-8">Student Signature</p>
                <div className="border-t border-foreground pt-2">
                  <p>{reportData.student.full_name}</p>
                  <p className="text-sm text-muted-foreground">Date: _______________</p>
                </div>
              </div>
              <div>
                <p className="font-medium mb-8">Supervisor Signature</p>
                <div className="border-t border-foreground pt-2">
                  <p>{reportData.supervisor?.full_name || "_______________"}</p>
                  <p className="text-sm text-muted-foreground">Date: _______________</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}