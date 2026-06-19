import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, UserCircle2, Save } from "lucide-react";
import { getFaculties, getDepartments, getProgrammes } from "@/lib/faculty-data";

export default function Profile() {
  const { user, profile, role, loading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    institution: "",
    faculty: "",
    department: "",
    programme: "",
    staff_id: "",
  });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        institution: profile.institution || "",
        faculty: profile.faculty || "",
        department: profile.department || "",
        programme: profile.programme || "",
        staff_id: "",
      });
    }
  }, [profile]);

  const departments = form.faculty ? getDepartments(form.faculty) : [];
  const programmes =
    form.faculty && form.department ? getProgrammes(form.faculty, form.department) : [];

  const isStudent = role === "student";
  const isSupervisor = role === "supervisor";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const updates: {
      full_name: string;
      institution: string | null;
      faculty: string | null;
      department: string | null;
      programme: string | null;
      staff_id?: string | null;
    } = {
      full_name: form.full_name.trim(),
      institution: form.institution.trim() || null,
      faculty: form.faculty || null,
      department: form.department || null,
      programme: form.programme || null,
    };
    if (isSupervisor) {
      updates.staff_id = form.staff_id.trim() || null;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      console.error("[v0] Profile update error:", error);
      toast.error(error.message || "Failed to update profile");
    } else {
      toast.success("Profile updated successfully");
    }
  };

  const initials = (form.full_name || profile?.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (loading || !profile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in max-w-3xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground">View and update your personal information.</p>
        </div>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCircle2 className="h-5 w-5 text-primary" />
                {profile.full_name || "Unnamed user"}
              </CardTitle>
              <CardDescription className="capitalize">
                {role} • {profile.email}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile.email} disabled />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed from here.
                </p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="institution">Institution</Label>
                <Input
                  id="institution"
                  value={form.institution}
                  onChange={(e) => setForm({ ...form, institution: e.target.value })}
                  placeholder="Your institution"
                />
              </div>

              {isStudent && (
                <>
                  <div className="space-y-2">
                    <Label>Faculty</Label>
                    <Select
                      value={form.faculty}
                      onValueChange={(v) =>
                        setForm({ ...form, faculty: v, department: "", programme: "" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select faculty" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFaculties().map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select
                      value={form.department}
                      onValueChange={(v) =>
                        setForm({ ...form, department: v, programme: "" })
                      }
                      disabled={!form.faculty}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label>Programme</Label>
                    <Select
                      value={form.programme}
                      onValueChange={(v) => setForm({ ...form, programme: v })}
                      disabled={!form.department}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select programme" />
                      </SelectTrigger>
                      <SelectContent>
                        {programmes.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {isSupervisor && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="staff_id">Staff / Employee ID</Label>
                  <Input
                    id="staff_id"
                    value={form.staff_id}
                    onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
                    placeholder="e.g. STAFF/2024/0123"
                  />
                </div>
              )}

              <div className="sm:col-span-2 flex justify-end pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
