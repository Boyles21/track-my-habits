import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import SkillPicker from "@/components/logbook/SkillPicker";

const entrySchema = z.object({
  entry_date: z.string().min(1, "Date is required"),
  activity_description: z.string().min(10, "Please describe your activities (at least 10 characters)"),
  skills_learned: z.string().optional(),
  hours_worked: z.coerce.number().min(0.5, "Hours must be at least 0.5").max(24, "Hours cannot exceed 24"),
  challenges: z.string().optional(),
});

type EntryFormValues = z.infer<typeof entrySchema>;

export default function LogbookEntry() {
  const { id } = useParams();
  const isEditing = id && id !== "new";
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditing);
  const [isLocked, setIsLocked] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      entry_date: new Date().toISOString().split("T")[0],
      activity_description: "",
      skills_learned: "",
      hours_worked: 8,
      challenges: "",
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isEditing && user) {
      fetchEntry();
    }
  }, [isEditing, user]);

  const fetchEntry = async () => {
    try {
      const { data, error } = await supabase
        .from("logbook_entries")
        .select("*")
        .eq("id", id)
        .eq("student_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Entry not found");
        navigate("/logbook");
        return;
      }

      // Check if entry is locked (approved entries cannot be edited)
      if (data.status === "approved") {
        setIsLocked(true);
        toast.error("This entry has been approved and cannot be edited");
        navigate("/logbook");
        return;
      }

      form.reset({
        entry_date: data.entry_date,
        activity_description: data.activity_description,
        skills_learned: data.skills_learned || "",
        hours_worked: data.hours_worked || 8,
        challenges: data.challenges || "",
      });

      // Fetch existing entry skills
      const { data: entrySkills } = await supabase
        .from("entry_skills")
        .select("skill_id")
        .eq("entry_id", id);

      if (entrySkills) {
        setSelectedSkills(entrySkills.map((es) => es.skill_id));
      }
    } catch (error) {
      console.error("Error fetching entry:", error);
      toast.error("Failed to load entry");
      navigate("/logbook");
    } finally {
      setIsFetching(false);
    }
  };

  const onSubmit = async (data: EntryFormValues) => {
    if (!user) return;

    setIsLoading(true);
    try {
      let entryId = id;

      if (isEditing) {
        // Double-check entry is not approved before updating
        const { data: currentEntry } = await supabase
          .from("logbook_entries")
          .select("status")
          .eq("id", id)
          .eq("student_id", user.id)
          .maybeSingle();

        if (currentEntry?.status === "approved") {
          toast.error("This entry has been approved and cannot be edited");
          navigate("/logbook");
          return;
        }

        const { error } = await supabase
          .from("logbook_entries")
          .update({
            entry_date: data.entry_date,
            activity_description: data.activity_description,
            skills_learned: data.skills_learned || null,
            hours_worked: data.hours_worked,
            challenges: data.challenges || null,
            status: "pending", // Reset to pending when resubmitting
          })
          .eq("id", id)
          .eq("student_id", user.id);

        if (error) throw error;

        // Update entry skills - delete old ones and insert new ones
        await supabase.from("entry_skills").delete().eq("entry_id", id);
        
        if (selectedSkills.length > 0) {
          const skillInserts = selectedSkills.map((skillId) => ({
            entry_id: id as string,
            skill_id: skillId,
          }));
          await supabase.from("entry_skills").insert(skillInserts);
        }

        toast.success("Entry updated and resubmitted for review");
      } else {
        const { data: newEntry, error } = await supabase
          .from("logbook_entries")
          .insert({
            student_id: user.id,
            entry_date: data.entry_date,
            activity_description: data.activity_description,
            skills_learned: data.skills_learned || null,
            hours_worked: data.hours_worked,
            challenges: data.challenges || null,
          })
          .select("id")
          .single();

        if (error) throw error;
        entryId = newEntry.id;

        // Insert entry skills
        if (selectedSkills.length > 0) {
          const skillInserts = selectedSkills.map((skillId) => ({
            entry_id: entryId as string,
            skill_id: skillId,
          }));
          await supabase.from("entry_skills").insert(skillInserts);
        }

        toast.success("Entry created successfully");
      }
      navigate("/logbook");
    } catch (error) {
      console.error("Error saving entry:", error);
      toast.error("Failed to save entry");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isFetching) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/logbook">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isEditing ? "Edit Entry" : "New Entry"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing
                ? "Update your logbook entry"
                : "Record your daily SIWES activities"}
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="entry_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="activity_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What did you do today?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your activities in detail..."
                          className="min-h-[120px]"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Skill Picker */}
                <FormItem>
                  <FormLabel>Skills Gained</FormLabel>
                  <FormDescription>
                    Select the skills you applied or learned today
                  </FormDescription>
                  <SkillPicker
                    selectedSkills={selectedSkills}
                    onSkillsChange={setSelectedSkills}
                    disabled={isLoading}
                  />
                </FormItem>

                <FormField
                  control={form.control}
                  name="skills_learned"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes on Skills (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe in more detail what you learned or how you applied these skills..."
                          className="min-h-[80px]"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hours_worked"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hours Worked</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0.5"
                          max="24"
                          step="0.5"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="challenges"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Challenges Faced (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any challenges or difficulties you encountered?"
                          className="min-h-[80px]"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : isEditing ? (
                      "Update Entry"
                    ) : (
                      "Create Entry"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/logbook")}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
