import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
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
import { Loader2, ArrowLeft, Clock, MapPin, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import SkillPicker from "@/components/logbook/SkillPicker";
import HoursValidationWarning from "@/components/logbook/HoursValidationWarning";
import {
  calculateHoursFromTime,
  validateDailyHours,
  MAX_DAILY_HOURS,
  formatHours,
  HoursViolation,
} from "@/lib/hours-validation";

const entrySchema = z.object({
  entry_date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  activity_description: z.string().min(10, "Please describe your activities (at least 10 characters)"),
  skills_learned: z.string().optional(),
  challenges: z.string().optional(),
}).refine((data) => {
  if (data.start_time && data.end_time) {
    const hours = calculateHoursFromTime(data.start_time, data.end_time);
    return hours > 0;
  }
  return true;
}, {
  message: "End time must be after start time",
  path: ["end_time"],
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
  const [calculatedHours, setCalculatedHours] = useState<number>(0);
  const [hoursViolation, setHoursViolation] = useState<HoursViolation | null>(null);

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      entry_date: new Date().toISOString().split("T")[0],
      start_time: "08:00",
      end_time: "16:00",
      activity_description: "",
      skills_learned: "",
      challenges: "",
    },
  });

  // Watch time changes for real-time calculation
  const startTime = useWatch({ control: form.control, name: "start_time" });
  const endTime = useWatch({ control: form.control, name: "end_time" });

  // Calculate hours whenever times change
  useEffect(() => {
    if (startTime && endTime) {
      const hours = calculateHoursFromTime(startTime, endTime);
      setCalculatedHours(hours);
      const violation = validateDailyHours(hours);
      setHoursViolation(violation);
    }
  }, [startTime, endTime]);

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
        start_time: data.start_time || "08:00",
        end_time: data.end_time || "16:00",
        activity_description: data.activity_description,
        skills_learned: data.skills_learned || "",
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

    // Check for hard constraint violations
    const hours = calculateHoursFromTime(data.start_time, data.end_time);
    if (hours > MAX_DAILY_HOURS) {
      toast.error(`Cannot submit: Hours exceed maximum of ${MAX_DAILY_HOURS} per day. Please adjust your times.`);
      return;
    }

    setIsLoading(true);
    try {
      let entryId = id;
      const hasViolation = hours > MAX_DAILY_HOURS;
      const violationType = hasViolation ? 'max_hours_exceeded' : null;

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
            start_time: data.start_time,
            end_time: data.end_time,
            hours_worked: hours,
            activity_description: data.activity_description,
            skills_learned: data.skills_learned || null,
            challenges: data.challenges || null,
            has_violation: hasViolation,
            violation_type: violationType,
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
            start_time: data.start_time,
            end_time: data.end_time,
            hours_worked: hours,
            activity_description: data.activity_description,
            skills_learned: data.skills_learned || null,
            challenges: data.challenges || null,
            has_violation: hasViolation,
            violation_type: violationType,
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

        {/* Hours Violation Warning */}
        {hoursViolation && (
          <HoursValidationWarning violation={hoursViolation} hours={calculatedHours} />
        )}

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

                {/* Time Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Calculated Hours Display */}
                <div className={`p-4 rounded-lg border ${hoursViolation ? 'border-destructive bg-destructive/5' : 'bg-secondary/50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">Hours Worked</span>
                    </div>
                    <span className={`text-2xl font-bold ${hoursViolation ? 'text-destructive' : 'text-primary'}`}>
                      {formatHours(calculatedHours)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Calculated automatically from start and end times. Maximum: {MAX_DAILY_HOURS}h/day
                  </p>
                </div>

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
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={isLoading || (hoursViolation?.severity === 'error')}
                  >
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
