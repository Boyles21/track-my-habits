import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Shield, Search, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Supervisor {
  id: string;
  full_name: string;
  email: string;
  institution: string | null;
  department: string | null;
  student_count: number;
}

export default function Supervisors() {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSupervisors();
  }, []);

  const fetchSupervisors = async () => {
    try {
      // Get supervisor user IDs
      const { data: supervisorRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "supervisor");

      if (!supervisorRoles?.length) {
        setSupervisors([]);
        setLoading(false);
        return;
      }

      const supervisorIds = supervisorRoles.map((r) => r.user_id);

      // Fetch profiles and student counts
      const [profilesResult, assignmentsResult] = await Promise.all([
        supabase.from("profiles").select("*").in("id", supervisorIds),
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
      }));

      // Sort by student count descending
      supervisorsWithCounts.sort((a, b) => b.student_count - a.student_count);

      setSupervisors(supervisorsWithCounts);
    } catch (error) {
      console.error("Error fetching supervisors:", error);
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-bold text-foreground">Supervisors</h1>
          <p className="text-muted-foreground">View supervisor workload and assignments</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
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
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Supervisors ({filteredSupervisors.length})
              </CardTitle>
              <div className="relative w-64">
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
                    <TableHead>Department</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead className="text-center">Students</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSupervisors.map((supervisor) => (
                    <TableRow key={supervisor.id}>
                      <TableCell className="font-medium">{supervisor.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{supervisor.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {supervisor.department || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {supervisor.institution || "-"}
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
