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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Calendar, Clock, Loader2, CheckCircle, XCircle } from "lucide-react";

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
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  supervisor_name: string;
}

const commentSchema = z.object({
  content: z.string().min(1, "Please enter your feedback"),
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
      const { data: entryData } = await supabase
        .from("logbook_entries")
        .select(`
          *,
          profiles!logbook_entries_student_id_fkey (
            full_name
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (!entryData) {
        toast.error("Entry not found");
        navigate("/reviews");
        return;
      }

      setEntry({
        id: entryData.id,
        entry_date: entryData.entry_date,
        activity_description: entryData.activity_description,
        skills_learned: entryData.skills_learned,
        hours_worked: entryData.hours_worked || 8,
        challenges: entryData.challenges,
        status: entryData.status,
        student_id: entryData.student_id,
        student_name: (entryData.profiles as any)?.full_name || "Unknown",
      });

      // Fetch comments
      const { data: commentsData } = await supabase
        .from("comments")
        .select(`
          *,
          profiles!comments_supervisor_id_fkey (
            full_name
          )
        `)
        .eq("entry_id", id)
        .order("created_at", { ascending: true });

      if (commentsData) {
        const mappedComments = commentsData.map((c) => ({
          id: c.id,
          content: c.content,
          created_at: c.created_at,
          supervisor_name: (c.profiles as any)?.full_name || "Supervisor",
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

  const handleStatusChange = async (newStatus: "approved" | "revision_needed") => {
    if (!entry || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("logbook_entries")
        .update({ status: newStatus })
        .eq("id", entry.id);

      if (error) throw error;

      setEntry({ ...entry, status: newStatus });
      toast.success(
        newStatus === "approved"
          ? "Entry approved successfully"
          : "Entry marked for revision"
      );
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
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
        .select(`
          *,
          profiles!comments_supervisor_id_fkey (
            full_name
          )
        `)
        .single();

      if (error) throw error;

      setComments([
        ...comments,
        {
          id: newComment.id,
          content: newComment.content,
          created_at: newComment.created_at,
          supervisor_name: (newComment.profiles as any)?.full_name || "Supervisor",
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
          {getStatusBadge(entry.status)}
        </div>

        {/* Entry Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(entry.entry_date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {entry.hours_worked} hours
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

        {/* Action Buttons */}
        {entry.status === "pending" && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Button
                  className="flex-1"
                  onClick={() => handleStatusChange("approved")}
                  disabled={submitting}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleStatusChange("revision_needed")}
                  disabled={submitting}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Request Revision
                </Button>
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
            {comments.length > 0 && (
              <div className="space-y-4 mb-6">
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
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitComment)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Add Feedback</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter your feedback or comments..."
                          className="min-h-[100px]"
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
