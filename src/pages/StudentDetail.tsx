import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  User,
  Mail,
  Building,
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Download,
  File,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  institution: string | null;
  faculty: string | null;
  department: string | null;
  programme: string | null;
}

interface LogbookEntry {
  id: string;
  entry_date: string;
  activity_description: string;
  hours_worked: number | null;
  status: string;
}

interface StudentStats {
  totalEntries: number;
  pendingEntries: number;
  approvedEntries: number;
  revisionEntries: number;
  totalDocuments: number;
  totalHours: number;
}

// Constants for SIWES calculation
const REQUIRED_WEEKS = 24;
const HOURS_PER_DAY = 8;
const DAYS_PER_WEEK = 5;
const TOTAL_REQUIRED_HOURS = REQUIRED_WEEKS * DAYS_PER_WEEK * HOURS_PER_DAY;
const TOTAL_REQUIRED_DAYS = REQUIRED_WEEKS * DAYS_PER_WEEK;

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
}

export default function StudentDetail() {
  const { id } = useParams();
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
    if (!authLoading && role && role !== "supervisor" && role !== "admin") {
      navigate("/dashboard");
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user && (role === "supervisor" || role === "admin") && id) {
      fetchStudentData();
    }
  }, [user, role, id]);

  const fetchStudentData = async () => {
    try {
      // Supervisors can only view their assigned students. Admins bypass this check.
      if (role === "supervisor") {
        const { data: assignment } = await supabase
          .from("supervisor_students")
          .select("student_id")
          .eq("supervisor_id", user?.id)
          .eq("student_id", id)
          .maybeSingle();

        if (!assignment) {
          toast.error("You don't have permission to view this student");
          navigate("/students");
          return;
        }
      }

      // Step 2: Fetch student profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, institution, faculty, department, programme")
        .eq("id", id)
        .maybeSingle();

      if (profileError || !profile) {
        toast.error("Student not found");
        navigate("/students");
        return;
      }

      setStudent(profile);

      // Step 3: Fetch all logbook entries
      const { data: entriesData } = await supabase
        .from("logbook_entries")
        .select("id, entry_date, activity_description, hours_worked, status")
        .eq("student_id", id)
        .order("entry_date", { ascending: false });

      setEntries(entriesData || []);

      // Step 4: Fetch documents
      const { data: documentsData } = await supabase
        .from("documents")
        .select("id, file_name, file_path, file_type, file_size, created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false });

      setDocuments(documentsData || []);

      // Step 5: Calculate stats
      const { count: totalEntries } = await supabase
        .from("logbook_entries")
        .select("*", { count: "exact", head: true })
        .eq("student_id", id);

      const { count: pendingEntries } = await supabase
        .from("logbook_entries")
        .select("*", { count: "exact", head: true })
        .eq("student_id", id)
        .eq("status", "pending");

      const { count: approvedEntries } = await supabase
        .from("logbook_entries")
        .select("*", { count: "exact", head: true })
        .eq("student_id", id)
        .eq("status", "approved");

      const { count: revisionEntries } = await supabase
        .from("logbook_entries")
        .select("*", { count: "exact", head: true })
        .eq("student_id", id)
        .eq("status", "revision_needed");

      const { count: totalDocuments } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", id);

      const totalHours = (entriesData || []).reduce(
        (sum, e) => sum + (e.hours_worked || 0),
        0
      );

      setStats({
        totalEntries: totalEntries || 0,
        pendingEntries: pendingEntries || 0,
        approvedEntries: approvedEntries || 0,
        revisionEntries: revisionEntries || 0,
        totalDocuments: totalDocuments || 0,
        totalHours,
      });
    } catch (error) {
      console.error("Error fetching student data:", error);
      toast.error("Failed to load student data");
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

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!student) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Student not found</p>
          <Button asChild className="mt-4">
            <Link to="/students">Back to My Students</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/students">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{student.full_name}</h1>
            <p className="text-muted-foreground">Student Details</p>
          </div>
        </div>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-foreground">{student.email}</p>
                </div>
              </div>

              {student.institution && (
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Institution</p>
                    <p className="text-foreground">{student.institution}</p>
                  </div>
                </div>
              )}

              {student.faculty && (
                <div className="flex items-start gap-3">
                  <GraduationCap className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Faculty</p>
                    <p className="text-foreground">{student.faculty}</p>
                  </div>
                </div>
              )}

              {student.department && (
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Department</p>
                    <p className="text-foreground">{student.department}</p>
                  </div>
                </div>
              )}

              {student.programme && (
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Programme</p>
                    <p className="text-foreground">{student.programme}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        {stats && (
          <>
            {/* Progress Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  SIWES Progress Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Hours Logged</span>
                      <span className="font-medium">{stats.totalHours} / {TOTAL_REQUIRED_HOURS} hrs</span>
                    </div>
                    <Progress value={Math.min((stats.totalHours / TOTAL_REQUIRED_HOURS) * 100, 100)} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Days Completed</span>
                      <span className="font-medium">{stats.totalEntries} / {TOTAL_REQUIRED_DAYS} days</span>
                    </div>
                    <Progress value={Math.min((stats.totalEntries / TOTAL_REQUIRED_DAYS) * 100, 100)} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-5">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.totalEntries}</p>
                      <p className="text-sm text-muted-foreground">Total Entries</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-yellow-500/10">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.pendingEntries}</p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <BookOpen className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.approvedEntries}</p>
                      <p className="text-sm text-muted-foreground">Approved</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-destructive/10">
                      <BookOpen className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.revisionEntries}</p>
                      <p className="text-sm text-muted-foreground">Needs Revision</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-secondary">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.totalDocuments}</p>
                      <p className="text-sm text-muted-foreground">Documents</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No documents uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <File className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{doc.file_name}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Badge variant="outline">{doc.file_type}</Badge>
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>
                            {new Date(doc.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      className="ml-4"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logbook Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Logbook Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No logbook entries yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(entry.entry_date).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        {entry.hours_worked && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {entry.hours_worked}h
                          </div>
                        )}
                        {getStatusBadge(entry.status)}
                      </div>
                      <p className="text-foreground truncate">
                        {entry.activity_description}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild className="ml-4">
                      <Link to={`/reviews/${entry.id}`}>Review</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
