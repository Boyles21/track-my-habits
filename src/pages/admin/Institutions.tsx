import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Building2, Plus, Pencil, Trash2, Users, GraduationCap, UserCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Institution {
  id: string;
  name: string;
  address: string | null;
  created_at: string;
}

interface UserRecord {
  id: string;
  full_name: string | null;
  email: string;
  faculty: string | null;
  department: string | null;
  programme: string | null;
  staff_id: string | null;
  registered_at: string;
}

export default function Institutions() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", address: "" });
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(null);
  const [studentsData, setStudentsData] = useState<UserRecord[]>([]);
  const [supervisorsData, setSupervisorsData] = useState<UserRecord[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    fetchInstitutions();
  }, []);

  useEffect(() => {
    if (selectedInstitutionId) {
      fetchUsersByInstitution(selectedInstitutionId);
    }
  }, [selectedInstitutionId]);

  const fetchInstitutions = async () => {
    const { data, error } = await supabase
      .from("institutions")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Failed to load institutions");
      console.error("[v0] Error fetching institutions:", error);
    } else {
      setInstitutions(data || []);
      if (data && data.length > 0 && !selectedInstitutionId) {
        setSelectedInstitutionId(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchUsersByInstitution = async (institutionId: string) => {
    setAuditLoading(true);
    try {
      const { data, error } = await supabase
        .from("institution_audit_log")
        .select("id, user_id:user_id, full_name, email, faculty, department, programme, staff_id, registered_at")
        .eq("institution_id", institutionId)
        .order("registered_at", { ascending: false });

      if (error) {
        console.error("[v0] Error fetching institution users:", error);
        return;
      }

      // Separate students and supervisors
      const students = (data || []).filter((u: any) => u.user_type === "student") as UserRecord[];
      const supervisors = (data || []).filter((u: any) => u.user_type === "supervisor") as UserRecord[];

      setStudentsData(students);
      setSupervisorsData(supervisors);
    } catch (err) {
      console.error("[v0] Error fetching institution users:", err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Institution name is required");
      return;
    }

    if (editingId) {
      // Update
      const { error } = await supabase
        .from("institutions")
        .update({ name: formData.name, address: formData.address || null })
        .eq("id", editingId);

      if (error) {
        toast.error("Failed to update institution");
        console.error(error);
      } else {
        toast.success("Institution updated successfully");
        fetchInstitutions();
        resetForm();
      }
    } else {
      // Create
      const { error } = await supabase
        .from("institutions")
        .insert({ name: formData.name, address: formData.address || null });

      if (error) {
        if (error.code === "23505") {
          toast.error("An institution with this name already exists");
        } else {
          toast.error("Failed to create institution");
        }
        console.error(error);
      } else {
        toast.success("Institution created successfully");
        fetchInstitutions();
        resetForm();
      }
    }
  };

  const handleEdit = (institution: Institution) => {
    setEditingId(institution.id);
    setFormData({ name: institution.name, address: institution.address || "" });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this institution?")) return;

    const { error } = await supabase.from("institutions").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete institution. It may be in use.");
      console.error(error);
    } else {
      toast.success("Institution deleted successfully");
      fetchInstitutions();
    }
  };

  const resetForm = () => {
    setFormData({ name: "", address: "" });
    setEditingId(null);
    setDialogOpen(false);
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Institutions</h1>
            <p className="text-muted-foreground">Manage registered institutions</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingId(null); setFormData({ name: "", address: "" }); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Institution
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Institution" : "Add Institution"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Institution Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., University of Lagos"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Institution address"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingId ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {institutions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No institutions registered yet.</p>
              <p className="text-sm">Click "Add Institution" to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="institutions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="institutions">
                <Building2 className="h-4 w-4 mr-2" />
                Institutions ({institutions.length})
              </TabsTrigger>
              <TabsTrigger value="students" disabled={!selectedInstitutionId}>
                <GraduationCap className="h-4 w-4 mr-2" />
                Students ({studentsData.length})
              </TabsTrigger>
              <TabsTrigger value="supervisors" disabled={!selectedInstitutionId}>
                <UserCheck className="h-4 w-4 mr-2" />
                Supervisors ({supervisorsData.length})
              </TabsTrigger>
            </TabsList>

            {/* Institutions Tab */}
            <TabsContent value="institutions">
              <Card>
                <CardHeader>
                  <CardTitle>All Institutions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead>Supervisors</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {institutions.map((institution) => (
                        <TableRow
                          key={institution.id}
                          className={`cursor-pointer ${selectedInstitutionId === institution.id ? "bg-secondary" : ""}`}
                          onClick={() => setSelectedInstitutionId(institution.id)}
                        >
                          <TableCell className="font-medium">{institution.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {institution.address || "-"}
                          </TableCell>
                          <TableCell>
                            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                              {studentsData.filter((s) => true).length}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                              {supervisorsData.filter((s) => true).length}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(institution.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(institution);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(institution.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Students Tab */}
            <TabsContent value="students">
              <Card>
                <CardHeader>
                  <CardTitle>Students Registered</CardTitle>
                  {selectedInstitutionId && (
                    <p className="text-sm text-muted-foreground">
                      {institutions.find((i) => i.id === selectedInstitutionId)?.name}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  {auditLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : studentsData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No students registered for this institution yet.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Full Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Faculty</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Programme</TableHead>
                          <TableHead>Registered</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentsData.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.full_name || "-"}</TableCell>
                            <TableCell className="text-muted-foreground">{student.email}</TableCell>
                            <TableCell>{student.faculty || "-"}</TableCell>
                            <TableCell>{student.department || "-"}</TableCell>
                            <TableCell>{student.programme || "-"}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(student.registered_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Supervisors Tab */}
            <TabsContent value="supervisors">
              <Card>
                <CardHeader>
                  <CardTitle>Supervisors Registered</CardTitle>
                  {selectedInstitutionId && (
                    <p className="text-sm text-muted-foreground">
                      {institutions.find((i) => i.id === selectedInstitutionId)?.name}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  {auditLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : supervisorsData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No supervisors registered for this institution yet.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Full Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Staff ID</TableHead>
                          <TableHead>Faculty</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Registered</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supervisorsData.map((supervisor) => (
                          <TableRow key={supervisor.id}>
                            <TableCell className="font-medium">{supervisor.full_name || "-"}</TableCell>
                            <TableCell className="text-muted-foreground">{supervisor.email}</TableCell>
                            <TableCell className="font-mono text-sm">{supervisor.staff_id || "-"}</TableCell>
                            <TableCell>{supervisor.faculty || "-"}</TableCell>
                            <TableCell>{supervisor.department || "-"}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(supervisor.registered_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
