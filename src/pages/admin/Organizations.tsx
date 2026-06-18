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
import { Briefcase, Plus, Pencil, Trash2, MapPin, Navigation, ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  getCurrentPosition,
  validateGeofenceConfig,
  getMapsLink,
  MIN_GEOFENCE_RADIUS,
  MAX_GEOFENCE_RADIUS,
} from "@/lib/geofencing";

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

const BLANK_FORM = {
  name: "",
  address: "",
  industry: "",
  contact_email: "",
  contact_phone: "",
  latitude: "",
  longitude: "",
  geofence_radius: "100",
};

export default function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(BLANK_FORM);
  const [locLoading, setLocLoading] = useState(false);
  const [geofenceError, setGeofenceError] = useState<string | null>(null);

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

  const handleUseMyLocation = async () => {
    setLocLoading(true);
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude, accuracy } = position.coords;
      setFormData((prev) => ({
        ...prev,
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
      }));
      toast.success(
        `Location captured (GPS accuracy: ±${Math.round(accuracy)} m). Verify the coordinates are correct.`,
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to get current location");
    } finally {
      setLocLoading(false);
    }
  };

  // Revalidate geofence config whenever relevant fields change
  const lat = formData.latitude ? parseFloat(formData.latitude) : null;
  const lng = formData.longitude ? parseFloat(formData.longitude) : null;
  const radius = formData.geofence_radius ? parseInt(formData.geofence_radius, 10) : null;
  const hasCoords = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);
  const previewMapsUrl = hasCoords ? getMapsLink(lat!, lng!) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    const latVal = formData.latitude ? parseFloat(formData.latitude) : null;
    const lngVal = formData.longitude ? parseFloat(formData.longitude) : null;
    const radVal = formData.geofence_radius ? parseInt(formData.geofence_radius, 10) : null;

    const geoError = validateGeofenceConfig(latVal, lngVal, radVal);
    if (geoError) {
      toast.error(geoError);
      setGeofenceError(geoError);
      return;
    }
    setGeofenceError(null);

    const payload = {
      name: formData.name.trim(),
      address: formData.address.trim() || null,
      industry: formData.industry.trim() || null,
      contact_email: formData.contact_email.trim() || null,
      contact_phone: formData.contact_phone.trim() || null,
      latitude: latVal,
      longitude: lngVal,
      geofence_radius: radVal ?? 100,
    };

    if (editingId) {
      const { error } = await supabase
        .from("organizations")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        toast.error(error.message || "Failed to update organization");
        console.error(error);
      } else {
        toast.success("Organization updated successfully");
        fetchOrganizations();
        resetForm();
      }
    } else {
      const { error } = await supabase.from("organizations").insert(payload);

      if (error) {
        toast.error(error.message || "Failed to create organization");
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
    setGeofenceError(null);
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
    setFormData(BLANK_FORM);
    setEditingId(null);
    setGeofenceError(null);
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
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingId(null); setFormData(BLANK_FORM); setGeofenceError(null); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Organization
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                <div className="border-t pt-4 mt-2 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold">Attendance Location</h4>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUseMyLocation}
                      disabled={locLoading}
                      className="text-xs"
                    >
                      <Navigation className={`h-3.5 w-3.5 mr-1.5 ${locLoading ? "animate-spin" : ""}`} />
                      {locLoading ? "Locating…" : "Use My Location"}
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground -mt-2">
                    Students must be within the configured radius to verify attendance.
                    Leave blank to disable geofence for this organization.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        min="-90"
                        max="90"
                        value={formData.latitude}
                        onChange={(e) => {
                          setFormData({ ...formData, latitude: e.target.value });
                          setGeofenceError(null);
                        }}
                        placeholder="e.g., 6.5244"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        min="-180"
                        max="180"
                        value={formData.longitude}
                        onChange={(e) => {
                          setFormData({ ...formData, longitude: e.target.value });
                          setGeofenceError(null);
                        }}
                        placeholder="e.g., 3.3792"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="geofence_radius">
                      Radius (metres)
                      <span className="text-muted-foreground text-xs ml-2">
                        ({MIN_GEOFENCE_RADIUS}–{MAX_GEOFENCE_RADIUS} m)
                      </span>
                    </Label>
                    <Input
                      id="geofence_radius"
                      type="number"
                      min={MIN_GEOFENCE_RADIUS}
                      max={MAX_GEOFENCE_RADIUS}
                      value={formData.geofence_radius}
                      onChange={(e) => {
                        setFormData({ ...formData, geofence_radius: e.target.value });
                        setGeofenceError(null);
                      }}
                      placeholder="100"
                    />
                    {radius && radius >= MIN_GEOFENCE_RADIUS && radius <= MAX_GEOFENCE_RADIUS && (
                      <p className="text-xs text-muted-foreground">
                        Students within <strong>{radius} m</strong> of the pin will be allowed to check in.
                      </p>
                    )}
                  </div>

                  {/* Validation error */}
                  {geofenceError && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <p className="text-sm text-destructive">{geofenceError}</p>
                    </div>
                  )}

                  {/* Coordinate preview */}
                  {hasCoords && !geofenceError && (
                    <div className="flex items-center gap-3 p-3 rounded-md bg-success/10 border border-success/20">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-success">Coordinates set</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {lat!.toFixed(6)}, {lng!.toFixed(6)}
                        </p>
                      </div>
                      {previewMapsUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-7 text-xs"
                        >
                          <a href={previewMapsUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                            Preview
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-2">
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
                          <a
                            href={getMapsLink(org.latitude, org.longitude)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex"
                          >
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800 hover:bg-green-100 cursor-pointer gap-1"
                            >
                              <MapPin className="h-3 w-3" />
                              {org.geofence_radius} m
                            </Badge>
                          </a>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700"
                          >
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
