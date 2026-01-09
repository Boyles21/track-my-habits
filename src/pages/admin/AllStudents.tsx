import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users, Search, UserCog, FileText, ArrowRightLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Student {
  id: string;
  full_name: string;
  email: string;
  institution: string | null;
  department: string | null;
  supervisor_id: string | null;
  supervisor_name: string | null;
}

interface Supervisor {
  id: string;
  full_name: string;
  department: string | null;
}

export default function AllStudents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [reassignDialog, setReassignDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newSupervisorId, setNewSupervisorId] = useState("");
  const [reassignReason, setReassignReason] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all student user IDs
      const { data: studentRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");

      if (!studentRoles?.length) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const studentIds = studentRoles.map((r) => r.user_id);

      // Fetch profiles and assignments
      const [profilesResult, assignmentsResult, supervisorRoles] = await Promise.all([
        supabase.from("profiles").select("*").in("id", studentIds),
        supabase.from("supervisor_students").select("student_id, supervisor_id"),
        supabase.from("user_roles").select("user_id").eq("role", "supervisor"),
      ]);

      // Fetch supervisor profiles
      const supervisorIds = supervisorRoles.data?.map((r) => r.user_id) || [];
      const { data: supervisorProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, department")
        .in("id", supervisorIds);

      setSupervisors(supervisorProfiles || []);

      // Map students with their supervisors
      const assignments = assignmentsResult.data || [];
      const supervisorMap = new Map(
        (supervisorProfiles || []).map((s) => [s.id, s.full_name])
      );

      const studentsWithSupervisors = (profilesResult.data || []).map((profile) => {
        const assignment = assignments.find((a) => a.student_id === profile.id);
        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          institution: profile.institution,
          department: profile.department,
          supervisor_id: assignment?.supervisor_id || null,
          supervisor_name: assignment ? supervisorMap.get(assignment.supervisor_id) || null : null,
        };
      });

      setStudents(studentsWithSupervisors);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleReassign = async () => {
    if (!selectedStudent || !newSupervisorId || !reassignReason.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { error } = await supabase.rpc("reassign_supervisor", {
        _student_id: selectedStudent.id,
        _new_supervisor_id: newSupervisorId,
        _reason: reassignReason,
      });

      if (error) throw error;

      toast.success("Supervisor reassigned successfully");
      setReassignDialog(false);
      setSelectedStudent(null);
      setNewSupervisorId("");
      setReassignReason("");
      fetchData();
    } catch (error: any) {
      console.error("Reassignment error:", error);
      toast.error(error.message || "Failed to reassign supervisor");
    }
  };

  const openReassignDialog = (student: Student) => {
    setSelectedStudent(student);
    setNewSupervisorId("");
    setReassignReason("");
    setReassignDialog(true);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.institution && s.institution.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">All Students</h1>
            <p className="text-muted-foreground">Manage all SIWES students</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Students ({filteredStudents.length})
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No students found.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{student.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {student.institution || "-"}
                      </TableCell>
                      <TableCell>
                        {student.supervisor_name ? (
                          <Badge variant="outline">{student.supervisor_name}</Badge>
                        ) : (
                          <Badge variant="destructive">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/students/${student.id}`)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openReassignDialog(student)}
                          disabled={!student.supervisor_id}
                        >
                          <ArrowRightLeft className="h-4 w-4 mr-1" />
                          Reassign
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Reassign Dialog */}
        <Dialog open={reassignDialog} onOpenChange={setReassignDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reassign Supervisor</DialogTitle>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4">
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="font-medium">{selectedStudent.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Current supervisor: {selectedStudent.supervisor_name || "None"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>New Supervisor *</Label>
                  <Select value={newSupervisorId} onValueChange={setNewSupervisorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisors
                        .filter((s) => s.id !== selectedStudent.supervisor_id)
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.full_name} {s.department && `(${s.department})`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Reason for Reassignment *</Label>
                  <Textarea
                    value={reassignReason}
                    onChange={(e) => setReassignReason(e.target.value)}
                    placeholder="Explain why this reassignment is needed..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setReassignDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleReassign}>
                    Confirm Reassignment
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
