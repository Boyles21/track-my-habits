import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";

interface Skill {
  id: string;
  name: string;
  category: string | null;
}

interface SkillPickerProps {
  selectedSkills: string[];
  onSkillsChange: (skillIds: string[]) => void;
  disabled?: boolean;
}

export default function SkillPicker({
  selectedSkills,
  onSkillsChange,
  disabled = false,
}: SkillPickerProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const { data, error } = await supabase
        .from("skills")
        .select("id, name, category")
        .order("category")
        .order("name");

      if (error) throw error;
      setSkills(data || []);
    } catch (error) {
      console.error("[v0] Error fetching skills:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skillId: string) => {
    if (disabled) return;
    
    if (selectedSkills.includes(skillId)) {
      onSkillsChange(selectedSkills.filter((id) => id !== skillId));
    } else {
      onSkillsChange([...selectedSkills, skillId]);
    }
  };

  const removeSkill = (skillId: string) => {
    if (disabled) return;
    onSkillsChange(selectedSkills.filter((id) => id !== skillId));
  };

  // Group skills by category
  const skillsByCategory = skills.reduce((acc, skill) => {
    const category = skill.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading skills...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selected Skills */}
      {selectedSkills.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Selected Skills ({selectedSkills.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedSkills.map((skillId) => {
              const skill = skills.find((s) => s.id === skillId);
              if (!skill) return null;
              return (
                <Badge
                  key={skillId}
                  variant="default"
                  className="flex items-center gap-1 pr-1"
                >
                  {skill.name}
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeSkill(skillId)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Skills by Category */}
      <div className="space-y-4">
        <p className="text-sm font-medium text-foreground">
          Available Skills (click to select)
        </p>
        {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
          <div key={category} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {category}
            </p>
            <div className="flex flex-wrap gap-2">
              {categorySkills.map((skill) => {
                const isSelected = selectedSkills.includes(skill.id);
                return (
                  <Button
                    key={skill.id}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className="h-auto py-1 px-2 text-xs"
                    onClick={() => toggleSkill(skill.id)}
                    disabled={disabled}
                  >
                    {isSelected && <Check className="h-3 w-3 mr-1" />}
                    {skill.name}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
