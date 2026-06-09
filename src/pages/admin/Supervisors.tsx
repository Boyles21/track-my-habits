import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, Search, Users, Crown, UserMinus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Supervisor {
  id: string;
  full_name: string;
  email: string;
  institution: string | null;
  department: string | null;
  student_count: number;
  is_admin: boolean;
}

export default function Supervisors() {
  const { user } = useAuth();
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [promoteDialog, setPromoteDialog] = useState<{ open: boolean; supervisor: Supervisor | null }>({
    open: false,
    supervisor: null,
  });
  const [demoteDialog, setDemoteDialog] = useState<{ open: boolean; supervisor: Supervisor | null }>({
    open: false,
    supervisor: null,
  });

  useEffect(() => {
    fetchSupervisors();
  }, []);

  const fetchSupervisors = async () => {
    try {
      // Get all supervisor and admin user IDs
      const { data: allRoles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["supervisor", "admin"]);

      if (!allRoles?.length) {
        setSupervisors([]);
        setLoading(false);
        return;
      }

      const userIds = allRoles.map((r) => r.user_id);
      const adminIds = new Set(allRoles.filter((r) => r.role === "admin").map((r) => r.user_id));

      // Fetch profiles and student counts
      const [profilesResult, assignmentsResult] = await Promise.all([
        supabase.from("profiles").select("*").in("id", userIds),
        supabase.from("supervisor_students").select("supervisor_id"),
      ]);

      // Count students per supervisor
      const studentCounts = (assignmentsResult.data || []).reduce((acc, a) => {
        acc[a.supervisor_id] = (acc[a.supervisor_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const supervisorsWithCounts = (profilesResult.data || []).map((profile) => ({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        institution: profile.institution,
        department: profile.department,
        student_count: studentCounts[profile.id] || 0,
        is_admin: adminIds.has(profile.id),
      }));

      // Sort by admin status, then student count descending
      supervisorsWithCounts.sort((a, b) => {
        if (a.is_admin !== b.is_admin) return a.is_admin ? -1 : 1;
        return b.student_count - a.student_count;
      });

      setSupervisors(supervisorsWithCounts);
    } catch (error) {
      console.error("Error fetching supervisors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async () => {
    if (!promoteDialog.supervisor) return;
    
    try {
      const { error } = await supabase.rpc("promote_to_admin", {
        _user_id: promoteDialog.supervisor.id,
      });

      if (error) throw error;

      toast.success(`${promoteDialog.supervisor.full_name} promoted to admin`);
      setPromoteDialog({ open: false, supervisor: null });
      fetchSupervisors();
    } catch (error: any) {
      toast.error(error.message || "Failed to promote user");
    }
  };

  const handleDemote = async () => {
    if (!demoteDialog.supervisor) return;
    
    try {
      const { error } = await supabase.rpc("demote_from_admin", {
        _user_id: demoteDialog.supervisor.id,
      });

      if (error) throw error;

      toast.success(`${demoteDialog.supervisor.full_name} demoted to supervisor`);
      setDemoteDialog({ open: false, supervisor: null });
      fetchSupervisors();
    } catch (error: any) {
      toast.error(error.message || "Failed to demote user");
    }
  };

  const filteredSupervisors = supervisors.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.department && s.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalStudents = supervisors.reduce((sum, s) => sum + s.student_count, 0);
  const avgStudentsPerSupervisor = supervisors.length > 0 
    ? (totalStudents / supervisors.length).toFixed(1) 
    : 0;
  const adminCount = supervisors.filter((s) => s.is_admin).length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Supervisors</h1>
          <p className="text-muted-foreground">View supervisor workload and assignments</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Supervisors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{supervisors.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                {adminCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Assigned Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStudents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg. Students per Supervisor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgStudentsPerSupervisor}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Supervisors & Admins ({filteredSupervisors.length})
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search supervisors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredSupervisors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No supervisors found.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Students</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSupervisors.map((supervisor) => (
                    <TableRow key={supervisor.id}>
                      <TableCell className="font-medium">{supervisor.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{supervisor.email}</TableCell>
                      <TableCell>
                        {supervisor.is_admin ? (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 flex items-center gap-1 w-fit">
                            <Crown className="h-3 w-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                            <Shield className="h-3 w-3" />
                            Supervisor
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {supervisor.department || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={supervisor.student_count > 10 ? "destructive" : supervisor.student_count > 5 ? "default" : "secondary"}
                          className="flex items-center gap-1 w-fit mx-auto"
                        >
                          <Users className="h-3 w-3" />
                          {supervisor.student_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {supervisor.id !== user?.id && (
                          supervisor.is_admin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDemoteDialog({ open: true, supervisor })}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              <UserMinus className="h-4 w-4 mr-1" />
                              Demote
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPromoteDialog({ open: true, supervisor })}
                              className="text-amber-600 hover:text-amber-700"
                            >
                              <Crown className="h-4 w-4 mr-1" />
                              Promote
                            </Button>
                          )
                        )}
                        {supervisor.id === user?.id && (
                          <span className="text-xs text-muted-foreground">You</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Promote Dialog */}
      <AlertDialog open={promoteDialog.open} onOpenChange={(open) => setPromoteDialog({ open, supervisor: promoteDialog.supervisor })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote to Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to promote <strong>{promoteDialog.supervisor?.full_name}</strong> to admin?
              They will have full access to all system settings and user management.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePromote} className="bg-amber-600 hover:bg-amber-700">
              Promote to Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Demote Dialog */}
      <AlertDialog open={demoteDialog.open} onOpenChange={(open) => setDemoteDialog({ open, supervisor: demoteDialog.supervisor })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Demote to Supervisor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to demote <strong>{demoteDialog.supervisor?.full_name}</strong> back to supervisor?
              They will lose access to admin features and user management.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDemote} className="bg-orange-600 hover:bg-orange-700">
              Demote to Supervisor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
