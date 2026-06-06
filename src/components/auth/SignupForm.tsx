import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { getFaculties, getDepartments, getProgrammes } from "@/lib/faculty-data";

interface Supervisor {
  id: string;
  full_name: string;
  institution: string | null;
}

const signupSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  institution: z.string().min(2, "Institution is required"),
  faculty: z.string().min(1, "Please select a faculty"),
  department: z.string().min(1, "Please select a department"),
  programme: z.string().min(1, "Please select a programme"),
  role: z.enum(["student", "supervisor"], { required_error: "Please select a role" }),
  supervisor_id: z.string().optional(),
  staff_id: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.role === "student") {
    return !!data.supervisor_id;
  }
  return true;
}, {
  message: "Please select a supervisor",
  path: ["supervisor_id"],
}).refine((data) => {
  if (data.role === "supervisor") {
    return !!data.staff_id && data.staff_id.trim().length >= 3;
  }
  return true;
}, {
  message: "Staff ID is required (min 3 characters)",
  path: ["staff_id"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

interface SignupFormProps {
  onToggleMode: () => void;
}

export default function SignupForm({ onToggleMode }: SignupFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [programmes, setProgrammes] = useState<string[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [supervisorsLoading, setSupervisorsLoading] = useState(true);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      full_name: "",
      email: "",
      institution: "",
      faculty: "",
      department: "",
      programme: "",
      role: "student",
      supervisor_id: "",
      staff_id: "",
      password: "",
      confirmPassword: "",
    },
  });

  const watchRole = form.watch("role");

  // Fetch supervisors on mount
  useEffect(() => {
    const fetchSupervisors = async () => {
      setSupervisorsLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_supervisors");
        if (error) {
          console.error("Error fetching supervisors:", error);
        } else {
          setSupervisors(data || []);
        }
      } catch (err) {
        console.error("Error fetching supervisors:", err);
      } finally {
        setSupervisorsLoading(false);
      }
    };
    fetchSupervisors();
  }, []);

  const watchFaculty = form.watch("faculty");
  const watchDepartment = form.watch("department");

  useEffect(() => {
    if (watchFaculty) {
      setDepartments(getDepartments(watchFaculty));
      form.setValue("department", "");
      form.setValue("programme", "");
      setProgrammes([]);
    }
  }, [watchFaculty, form]);

  useEffect(() => {
    if (watchFaculty && watchDepartment) {
      setProgrammes(getProgrammes(watchFaculty, watchDepartment));
      form.setValue("programme", "");
    }
  }, [watchDepartment, watchFaculty, form]);

  const onSubmit = async (data: SignupFormValues) => {
    // Validate supervisor selection for students
    if (data.role === "student" && supervisors.length === 0) {
      toast.error("No supervisors available. Please contact the administrator.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signUp({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        institution: data.institution,
        faculty: data.faculty,
        department: data.department,
        programme: data.programme,
        role: data.role,
        supervisor_id: data.role === "student" ? data.supervisor_id : undefined,
        staff_id: data.role === "supervisor" ? data.staff_id?.trim() : undefined,
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("An account with this email already exists. Please login instead.");
        } else if (error.message.toLowerCase().includes("staff_id") || error.message.includes("profiles_staff_id_unique")) {
          toast.error("This Staff ID is already in use. Please verify and try again.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Account created successfully! Welcome to TrackMySIWES.");
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center lg:text-left">
        <h2 className="text-3xl font-bold text-foreground">Sign Up</h2>
        <p className="text-muted-foreground">
          Create your account to get started.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your Name" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="you@example.com" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="institution"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Institution</FormLabel>
                <FormControl>
                  <Input placeholder="Your Institution" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="faculty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Faculty</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your faculty" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {getFaculties().map((faculty) => (
                      <SelectItem key={faculty} value={faculty}>
                        {faculty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isLoading || !watchFaculty}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="programme"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Programme</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isLoading || !watchDepartment}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your programme" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {programmes.map((prog) => (
                      <SelectItem key={prog} value={prog}>
                        {prog}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>I am a</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Supervisor Selection - Only shown for students */}
          {watchRole === "student" && (
            <FormField
              control={form.control}
              name="supervisor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Supervisor *</FormLabel>
                  {supervisorsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading supervisors...
                    </div>
                  ) : supervisors.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                      <AlertCircle className="h-4 w-4" />
                      No supervisors available. Please contact the administrator.
                    </div>
                  ) : (
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your supervisor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {supervisors.map((supervisor) => (
                          <SelectItem key={supervisor.id} value={supervisor.id}>
                            <div className="flex flex-col">
                              <span>{supervisor.full_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {supervisor.institution}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {watchRole === "supervisor" && (
            <FormField
              control={form.control}
              name="staff_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff / Employee ID *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. STAFF/2024/0123" {...field} disabled={isLoading} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Your unique institution-issued staff ID. Must be unique across supervisors.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" placeholder="At least 6 characters" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" placeholder="Re-enter your password" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Sign Up"
            )}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onToggleMode}
          className="text-primary hover:underline font-medium"
        >
          Login
        </button>
      </p>
    </div>
  );
}
