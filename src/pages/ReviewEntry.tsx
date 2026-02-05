import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Calendar, Clock, Loader2, CheckCircle, XCircle, Award, AlertTriangle, Ban } from "lucide-react";
import SkillValidation from "@/components/logbook/SkillValidation";
import { MAX_DAILY_HOURS, formatHours } from "@/lib/hours-validation";

interface Entry {
  id: string;
  entry_date: string;
  activity_description: string;
  skills_learned: string | null;
  hours_worked: number;
  challenges: string | null;
  status: string;
  student_id: string;
  student_name: string;
  start_time: string | null;
  end_time: string | null;
  has_violation: boolean | null;
  violation_type: string | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  supervisor_name: string;
}

const commentSchema = z.object({
  content: z.string().min(5, "Feedback must be at least 5 characters"),
});

type CommentFormValues = z.infer<typeof commentSchema>;

export default function ReviewEntry() {
  const { id } = useParams();
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: "",
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
    if (!authLoading && role !== "supervisor") {
      navigate("/dashboard");
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user && role === "supervisor" && id) {
      fetchEntry();
    }
  }, [user, role, id]);

  const fetchEntry = async () => {
    try {
      // Step 1: Fetch the entry
      const { data: entryData } = await supabase
        .from("logbook_entries")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!entryData) {
        toast.error("Entry not found");
        navigate("/reviews");
        return;
      }

      // Step 2: Verify this entry belongs to an assigned student
      const { data: assignment } = await supabase
        .from("supervisor_students")
        .select("student_id")
        .eq("supervisor_id", user?.id)
        .eq("student_id", entryData.student_id)
        .maybeSingle();

      if (!assignment) {
        toast.error("You don't have permission to view this entry");
        navigate("/reviews");
        return;
      }

      // Step 3: Fetch student profile
      const { data: studentProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", entryData.student_id)
        .maybeSingle();

      setEntry({
        id: entryData.id,
        entry_date: entryData.entry_date,
        activity_description: entryData.activity_description,
        skills_learned: entryData.skills_learned,
        hours_worked: entryData.hours_worked || 8,
        challenges: entryData.challenges,
        status: entryData.status,
        student_id: entryData.student_id,
        student_name: studentProfile?.full_name || "Unknown",
        start_time: entryData.start_time,
        end_time: entryData.end_time,
        has_violation: entryData.has_violation,
        violation_type: entryData.violation_type,
      });

      // Step 4: Fetch comments
      const { data: commentsData } = await supabase
        .from("comments")
        .select("*")
        .eq("entry_id", id)
        .order("created_at", { ascending: true });

      if (commentsData && commentsData.length > 0) {
        // Fetch supervisor profiles for comments
        const supervisorIds = [...new Set(commentsData.map((c) => c.supervisor_id))];
        const { data: supervisorProfiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", supervisorIds);

        const supervisorMap = new Map(supervisorProfiles?.map((p) => [p.id, p.full_name]) || []);

        const mappedComments = commentsData.map((c) => ({
          id: c.id,
          content: c.content,
          created_at: c.created_at,
          supervisor_name: supervisorMap.get(c.supervisor_id) || "Supervisor",
        }));
        setComments(mappedComments);
      }
    } catch (error) {
      console.error("Error fetching entry:", error);
      toast.error("Failed to load entry");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!entry || !user) return;

    // Prevent approval if entry has violations
    if (entry.has_violation) {
      toast.error("Cannot approve entry with hour violations. Student must correct the entry first.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("logbook_entries")
        .update({ 
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .eq("id", entry.id);

      if (error) throw error;

      setEntry({ ...entry, status: "approved" });
      toast.success("Entry approved successfully");
    } catch (error) {
      console.error("Error approving entry:", error);
      toast.error("Failed to approve entry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (comment: string) => {
    if (!entry || !user) return;

    setSubmitting(true);
    try {
      // First add the mandatory comment
      const { error: commentError } = await supabase
        .from("comments")
        .insert({
          entry_id: entry.id,
          supervisor_id: user.id,
          content: comment,
        });

      if (commentError) throw commentError;

      // Then update the status
      const { error } = await supabase
        .from("logbook_entries")
        .update({ status: "revision_needed" })
        .eq("id", entry.id);

      if (error) throw error;

      // Fetch supervisor profile for the new comment
      const { data: supervisorProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      setComments([
        ...comments,
        {
          id: crypto.randomUUID(),
          content: comment,
          created_at: new Date().toISOString(),
          supervisor_name: supervisorProfile?.full_name || "Supervisor",
        },
      ]);

      setEntry({ ...entry, status: "revision_needed" });
      toast.success("Entry marked for revision");
    } catch (error) {
      console.error("Error rejecting entry:", error);
      toast.error("Failed to reject entry");
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitComment = async (data: CommentFormValues) => {
    if (!entry || !user) return;

    setSubmitting(true);
    try {
      const { data: newComment, error } = await supabase
        .from("comments")
        .insert({
          entry_id: entry.id,
          supervisor_id: user.id,
          content: data.content,
        })
        .select("*")
        .single();

      if (error) throw error;

      // Fetch the supervisor name
      const { data: supervisorProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      setComments([
        ...comments,
        {
          id: newComment.id,
          content: newComment.content,
          created_at: newComment.created_at,
          supervisor_name: supervisorProfile?.full_name || "Supervisor",
        },
      ]);
      form.reset();
      toast.success("Comment added successfully");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
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

  const formatTime = (time: string | null) => {
    if (!time) return "--:--";
    return time.slice(0, 5);
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

  if (!entry) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Entry not found</p>
          <Button asChild className="mt-4">
            <Link to="/reviews">Back to Reviews</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const hasViolation = entry.has_violation;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/reviews">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Review Entry</h1>
            <p className="text-muted-foreground">{entry.student_name}</p>
          </div>
          <div className="flex items-center gap-2">
            {hasViolation && entry.status !== "approved" && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Violation
              </Badge>
            )}
            {getStatusBadge(entry.status)}
          </div>
        </div>

        {/* Violation Alert */}
        {hasViolation && entry.status !== "approved" && (
          <Alert variant="destructive">
            <Ban className="h-4 w-4" />
            <AlertTitle>Hours Violation Detected</AlertTitle>
            <AlertDescription>
              This entry logs {formatHours(entry.hours_worked)} which exceeds the maximum of {MAX_DAILY_HOURS} hours per day.
              <strong className="block mt-1">This entry cannot be approved until the student corrects the hours.</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Entry Details */}
        <Card className={hasViolation && entry.status !== "approved" ? "border-destructive/50" : ""}>
          <CardHeader>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(entry.entry_date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              {entry.start_time && entry.end_time && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                </div>
              )}
              <div className={`flex items-center gap-1 ${hasViolation ? 'text-destructive font-medium' : ''}`}>
                <Clock className="h-4 w-4" />
                {formatHours(entry.hours_worked)}
                {hasViolation && <span className="text-xs">(exceeds max {MAX_DAILY_HOURS}h)</span>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium text-foreground mb-2">Activities</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {entry.activity_description}
              </p>
            </div>

            {entry.skills_learned && (
              <div>
                <h3 className="font-medium text-foreground mb-2">Skills Learned</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {entry.skills_learned}
                </p>
              </div>
            )}

            {entry.challenges && (
              <div>
                <h3 className="font-medium text-foreground mb-2">Challenges</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {entry.challenges}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skills Validation Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5" />
              Skills & Competencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SkillValidation
              entryId={entry.id}
              supervisorId={user?.id || ""}
              isEntryApproved={entry.status === "approved"}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {entry.status === "pending" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasViolation ? (
                <Alert variant="destructive">
                  <Ban className="h-4 w-4" />
                  <AlertTitle>Approval Blocked</AlertTitle>
                  <AlertDescription>
                    Cannot approve this entry due to hour violations. 
                    The student must edit and correct the hours (max {MAX_DAILY_HOURS}h/day) before approval is possible.
                    You may request revision with feedback below.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="flex gap-4">
                  <Button
                    className="flex-1"
                    onClick={handleApprove}
                    disabled={submitting}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Entry
                  </Button>
                </div>
              )}
              
              {/* Rejection with mandatory comment */}
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-3">
                  {hasViolation 
                    ? "Request the student to correct their entry hours:"
                    : "To request revision, provide feedback explaining what needs to be changed:"}
                </p>
                <Form {...form}>
                  <form 
                    onSubmit={form.handleSubmit((data) => handleReject(data.content))} 
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Revision Feedback (Required)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={hasViolation 
                                ? `Please correct your hours. Maximum allowed is ${MAX_DAILY_HOURS} hours per day...`
                                : "Explain what needs to be revised..."}
                              className="min-h-[80px]"
                              {...field}
                              disabled={submitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      variant="outline" 
                      disabled={submitting}
                      className="w-full"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Request Revision
                    </Button>
                  </form>
                </Form>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Feedback & Comments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-4 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">
                        {comment.supervisor_name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{comment.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No feedback has been provided yet.
              </p>
            )}

            {/* Allow adding additional comments for non-pending entries */}
            {entry.status !== "pending" && (
              <div className="border-t pt-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitComment)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Add Additional Feedback</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter additional feedback or comments..."
                              className="min-h-[80px]"
                              {...field}
                              disabled={submitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Add Comment"
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
