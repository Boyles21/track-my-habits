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
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Loader2, ArrowLeft, Clock, MapPin, CheckCircle2, ExternalLink, AlertTriangle, XCircle } from "lucide-react";
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
import {
  getCurrentPosition,
  validateGpsAccuracy,
  detectFakeGps,
  processGeofenceValidation,
  formatDistance,
  getMapsLink,
  OrganizationLocation,
  hasValidGeofence,
} from "@/lib/geofencing";

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

interface GeofenceCheckIn {
  lat: number;
  lng: number;
  accuracy: number;
  at: string;
  organizationName: string;
  distanceMeters: number;
  isInside: boolean;
  radius: number;
}

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
  const [organization, setOrganization] = useState<OrganizationLocation | null>(null);
  const [checkIn, setCheckIn] = useState<GeofenceCheckIn | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

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
    if (user) {
      fetchOrganization();
    }
  }, [user]);

  useEffect(() => {
    if (isEditing && user) {
      fetchEntry();
    }
  }, [isEditing, user]);

  const fetchOrganization = async () => {
    try {
      // Get student's placement organization
      const { data: placement } = await supabase
        .from("student_placements")
        .select("organization_id")
        .eq("student_id", user?.id)
        .eq("status", "active")
        .maybeSingle();

      if (!placement?.organization_id) {
        setOrganization(null);
        return;
      }

      const { data: org } = await supabase
        .from("organizations")
        .select("id, name, latitude, longitude, geofence_radius")
        .eq("id", placement.organization_id)
        .maybeSingle();

      if (org) {
        setOrganization({
          id: org.id,
          name: org.name,
          latitude: org.latitude,
          longitude: org.longitude,
          geofence_radius: org.geofence_radius || 100,
        });
      }
    } catch (error) {
      console.error("Error fetching organization:", error);
    }
  };

  const captureLocation = async () => {
    setLocLoading(true);
    setLocError(null);

    try {
      // Step 1: Get user's current GPS position
      const position = await getCurrentPosition();
      const { latitude, longitude, accuracy } = position.coords;

      // Step 2: Detect potential fake / mock GPS — warn but do not block here
      // (server-side trigger is the authoritative enforcement layer)
      const fakeWarnings = detectFakeGps(position);
      if (fakeWarnings.length > 0) {
        console.warn("Potential fake GPS detected:", fakeWarnings);
      }

      // Step 3: Validate GPS accuracy — BLOCK if too poor
      const accuracyError = validateGpsAccuracy(accuracy, 30);
      if (accuracyError) {
        setLocError(accuracyError);
        toast.error(accuracyError);
        setLocLoading(false);
        return;
      }

      // Step 4: Pre-flight checks for org / geofence config
      if (!organization) {
        setLocError("No organization assigned. Contact your supervisor or admin.");
        toast.error("No organization assigned for attendance verification");
        setLocLoading(false);
        return;
      }

      if (!hasValidGeofence(organization)) {
        setLocError(`${organization.name} has not configured attendance location. Contact admin.`);
        toast.error("Organization location not configured. Contact admin.");
        setLocLoading(false);
        return;
      }

      // Step 5: Run client-side geofence check (for immediate UX feedback)
      const validation = processGeofenceValidation(
        { lat: latitude, lng: longitude },
        accuracy,
        organization,
      );

      // Surface any accuracy / config warnings
      validation.warnings.forEach((w) => toast.warning(w));

      if (!validation.isValid && validation.error) {
        setLocError(validation.error);
        toast.error(validation.error);
        setLocLoading(false);
        return;
      }

      const newCheckIn: GeofenceCheckIn = {
        lat: latitude,
        lng: longitude,
        accuracy,
        at: new Date().toISOString(),
        organizationName: organization.name,
        distanceMeters: validation.distance ?? 0,
        isInside: validation.isInside,
        radius: organization.geofence_radius,
      };

      setCheckIn(newCheckIn);

      if (validation.isInside) {
        toast.success(
          `Attendance verified — within ${formatDistance(validation.distance!)} of ${organization.name}`,
        );
      } else {
        toast.error(
          `Outside attendance zone. Distance: ${formatDistance(validation.distance!)} (Allowed: ${organization.geofence_radius} m)`,
        );
      }
    } catch (err: any) {
      setLocError(err.message || "Failed to capture location");
      toast.error(err.message || "Failed to capture location");
    } finally {
      setLocLoading(false);
    }
  };

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

      // Restore previous check-in data if available
      if (data.check_in_lat != null && data.check_in_lng != null && organization) {
        setCheckIn({
          lat: data.check_in_lat,
          lng: data.check_in_lng,
          accuracy: data.check_in_accuracy ?? 0,
          at: data.check_in_at ?? new Date().toISOString(),
          organizationName: organization.name,
          distanceMeters: data.distance_meters ?? 0,
          isInside: data.geofence_valid ?? false,
          radius: organization.geofence_radius,
        });
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

      const entryData: Record<string, any> = {
        entry_date: data.entry_date,
        start_time: data.start_time,
        end_time: data.end_time,
        hours_worked: hours,
        activity_description: data.activity_description,
        skills_learned: data.skills_learned || null,
        challenges: data.challenges || null,
        has_violation: hasViolation,
        violation_type: violationType,
        check_in_lat: checkIn?.lat ?? null,
        check_in_lng: checkIn?.lng ?? null,
        check_in_accuracy: checkIn?.accuracy ?? null,
        check_in_at: checkIn?.at ?? null,
        check_in_address: checkIn?.organizationName ?? null,
        distance_meters: checkIn?.distanceMeters ?? null,
        geofence_valid: checkIn?.isInside ?? null,
        status: "pending",
      };

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
          .update(entryData)
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
            ...entryData,
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

                {/* Attendance Check-in with Geofencing */}
                <div className={`p-4 rounded-lg border space-y-3 ${
                  checkIn && !checkIn.isInside
                    ? 'border-destructive/50 bg-destructive/5'
                    : checkIn
                      ? 'border-success/50 bg-success/5'
                      : 'bg-secondary/50'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">Attendance Check-in</span>
                    </div>
                    <Button
                      type="button"
                      variant={checkIn ? "outline" : "default"}
                      size="sm"
                      onClick={captureLocation}
                      disabled={locLoading || isLoading}
                    >
                      {locLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Capturing...</>
                      ) : checkIn ? (
                        <><CheckCircle2 className="mr-2 h-4 w-4" />Recapture</>
                      ) : (
                        "Check In"
                      )}
                    </Button>
                  </div>

                  {/* No organization assigned */}
                  {!organization && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-muted">
                      <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">No organization assigned</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Contact your supervisor or administrator to assign you to an organization for attendance verification.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Organization without geofence */}
                  {organization && !hasValidGeofence(organization) && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-muted">
                      <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{organization.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          This organization has not configured attendance location. Contact the administrator.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Location error */}
                  {locError && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10">
                      <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <p className="text-sm text-destructive">{locError}</p>
                    </div>
                  )}

                  {/* Check-in result */}
                  {checkIn && (
                    <div className="space-y-3">
                      {/* Organization name */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Organization</p>
                          <p className="text-sm font-semibold text-foreground">
                            {checkIn.organizationName}
                          </p>
                        </div>
                        {checkIn.isInside ? (
                          <Badge className="bg-success/10 text-success border-success/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Inside Zone
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Outside Zone
                          </Badge>
                        )}
                      </div>

                      {/* Distance info */}
                      <div className="grid grid-cols-2 gap-4 p-3 rounded-md bg-muted/50">
                        <div>
                          <p className="text-xs text-muted-foreground">Current Distance</p>
                          <p className={`text-lg font-semibold ${checkIn.isInside ? 'text-success' : 'text-destructive'}`}>
                            {formatDistance(checkIn.distanceMeters)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Allowed Radius</p>
                          <p className="text-lg font-semibold text-foreground">
                            {checkIn.radius} m
                          </p>
                        </div>
                      </div>

                      {/* GPS accuracy */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          GPS: {checkIn.lat.toFixed(5)}, {checkIn.lng.toFixed(5)} (±{Math.round(checkIn.accuracy)}m)
                        </span>
                        <span>
                          Captured at {new Date(checkIn.at).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Map link */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-full"
                      >
                        <a
                          href={getMapsLink(checkIn.lat, checkIn.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View on Map
                        </a>
                      </Button>

                      {/* Warning if outside zone */}
                      {!checkIn.isInside && (
                        <p className="text-xs text-destructive text-center">
                          You must be within {checkIn.radius}m of {checkIn.organizationName} to verify attendance.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Initial prompt */}
                  {!checkIn && !locError && organization && hasValidGeofence(organization) && (
                    <p className="text-xs text-muted-foreground">
                      Click "Check In" to verify you're at {organization.name}.
                      Attendance must be within {organization.geofence_radius}m of the registered location.
                    </p>
                  )}
                </div>

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
