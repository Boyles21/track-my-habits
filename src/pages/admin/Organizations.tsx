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
import { Briefcase, Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Organization {
  id: string;
  name: string;
  address: string | null;
  industry: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius: number;
  created_at: string;
}

export default function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    industry: "",
    contact_email: "",
    contact_phone: "",
    latitude: "",
    longitude: "",
    geofence_radius: "100",
  });

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Failed to load organizations");
      console.error(error);
    } else {
      setOrganizations(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    // Validate coordinates if both are provided
    const lat = formData.latitude ? parseFloat(formData.latitude) : null;
    const lng = formData.longitude ? parseFloat(formData.longitude) : null;

    if ((lat !== null && lng === null) || (lat === null && lng !== null)) {
      toast.error("Both latitude and longitude must be provided together");
      return;
    }

    if (lat !== null && (lat < -90 || lat > 90)) {
      toast.error("Latitude must be between -90 and 90");
      return;
    }

    if (lng !== null && (lng < -180 || lng > 180)) {
      toast.error("Longitude must be between -180 and 180");
      return;
    }

    const payload = {
      name: formData.name,
      address: formData.address || null,
      industry: formData.industry || null,
      contact_email: formData.contact_email || null,
      contact_phone: formData.contact_phone || null,
      latitude: lat,
      longitude: lng,
      geofence_radius: parseInt(formData.geofence_radius) || 100,
    };

    if (editingId) {
      const { error } = await supabase
        .from("organizations")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        toast.error("Failed to update organization");
        console.error(error);
      } else {
        toast.success("Organization updated successfully");
        fetchOrganizations();
        resetForm();
      }
    } else {
      const { error } = await supabase.from("organizations").insert(payload);

      if (error) {
        toast.error("Failed to create organization");
        console.error(error);
      } else {
        toast.success("Organization created successfully");
        fetchOrganizations();
        resetForm();
      }
    }
  };

  const handleEdit = (org: Organization) => {
    setEditingId(org.id);
    setFormData({
      name: org.name,
      address: org.address || "",
      industry: org.industry || "",
      contact_email: org.contact_email || "",
      contact_phone: org.contact_phone || "",
      latitude: org.latitude !== null ? org.latitude.toString() : "",
      longitude: org.longitude !== null ? org.longitude.toString() : "",
      geofence_radius: org.geofence_radius?.toString() || "100",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this organization?")) return;

    const { error } = await supabase.from("organizations").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete organization. It may have assigned students.");
      console.error(error);
    } else {
      toast.success("Organization deleted successfully");
      fetchOrganizations();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      industry: "",
      contact_email: "",
      contact_phone: "",
      latitude: "",
      longitude: "",
      geofence_radius: "100",
    });
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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Organizations</h1>
            <p className="text-muted-foreground">Manage SIWES placement companies</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingId(null); setFormData({ name: "", address: "", industry: "", contact_email: "", contact_phone: "", latitude: "", longitude: "", geofence_radius: "100" }); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Organization
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Organization" : "Add Organization"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Tech Solutions Ltd"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g., Information Technology"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Company address"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Contact Email</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      placeholder="contact@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Contact Phone</Label>
                    <Input
                      id="contact_phone"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      placeholder="+234..."
                    />
                  </div>
                </div>

                {/* Geofence Location Section */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Attendance Location (Optional)</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Set GPS coordinates to enable geofence-based attendance verification for students placed at this organization.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                        placeholder="e.g., 6.5244"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                        placeholder="e.g., 3.3792"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="geofence_radius">Geofence Radius (meters)</Label>
                    <Input
                      id="geofence_radius"
                      type="number"
                      min="10"
                      max="5000"
                      value={formData.geofence_radius}
                      onChange={(e) => setFormData({ ...formData, geofence_radius: e.target.value })}
                      placeholder="100"
                    />
                    <p className="text-xs text-muted-foreground">
                      Students must be within this radius to check in. Default: 100m
                    </p>
                  </div>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              All Organizations ({organizations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {organizations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No organizations registered yet.</p>
                <p className="text-sm">Click "Add Organization" to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Geofence</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {org.industry || "-"}
                      </TableCell>
                      <TableCell>
                        {org.latitude !== null && org.longitude !== null ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                            {org.geofence_radius}m radius
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700">
                            Not configured
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {org.contact_email || org.contact_phone || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(org.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(org)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(org.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
