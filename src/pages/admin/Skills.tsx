import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ScrollText, Plus, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Skill {
  id: string;
  name: string;
  category: string | null;
  created_at: string;
}

const CATEGORIES = [
  "Technical",
  "Soft Skills",
  "Analytical",
  "Communication",
  "Management",
  "Professional",
];

export default function Skills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", category: "" });
  const [filterCategory, setFilterCategory] = useState<string>("all");

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .order("category")
      .order("name");

    if (error) {
      toast.error("Failed to load skills");
      console.error(error);
    } else {
      setSkills(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Skill name is required");
      return;
    }

    const payload = {
      name: formData.name,
      category: formData.category || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("skills")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        toast.error("Failed to update skill");
        console.error(error);
      } else {
        toast.success("Skill updated successfully");
        fetchSkills();
        resetForm();
      }
    } else {
      const { error } = await supabase.from("skills").insert(payload);

      if (error) {
        if (error.code === "23505") {
          toast.error("A skill with this name already exists");
        } else {
          toast.error("Failed to create skill");
        }
        console.error(error);
      } else {
        toast.success("Skill created successfully");
        fetchSkills();
        resetForm();
      }
    }
  };

  const handleEdit = (skill: Skill) => {
    setEditingId(skill.id);
    setFormData({ name: skill.name, category: skill.category || "" });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this skill?")) return;

    const { error } = await supabase.from("skills").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete skill. It may be in use.");
      console.error(error);
    } else {
      toast.success("Skill deleted successfully");
      fetchSkills();
    }
  };

  const resetForm = () => {
    setFormData({ name: "", category: "" });
    setEditingId(null);
    setDialogOpen(false);
  };

  const filteredSkills = filterCategory === "all"
    ? skills
    : skills.filter((s) => s.category === filterCategory);

  const groupedSkills = filteredSkills.reduce((acc, skill) => {
    const cat = skill.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case "Technical": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Soft Skills": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "Analytical": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "Communication": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "Management": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "Professional": return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20";
      default: return "bg-secondary text-muted-foreground";
    }
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Skills</h1>
            <p className="text-muted-foreground">Manage competency skills for tracking</p>
          </div>
          <div className="flex gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingId(null); setFormData({ name: "", category: "" }); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Skill
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Edit Skill" : "Add Skill"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Skill Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Python Programming"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              All Skills ({filteredSkills.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSkills.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ScrollText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No skills found.</p>
                <p className="text-sm">Click "Add Skill" to get started.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedSkills).map(([category, categorySkills]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                      {category} ({categorySkills.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {categorySkills.map((skill) => (
                        <div
                          key={skill.id}
                          className="group flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-secondary/50 transition-colors"
                        >
                          <Badge variant="outline" className={getCategoryColor(skill.category)}>
                            {skill.name}
                          </Badge>
                          <div className="hidden group-hover:flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleEdit(skill)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleDelete(skill.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
