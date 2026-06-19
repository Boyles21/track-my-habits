import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Check, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Skill {
  id: string;
  name: string;
  category: string | null;
}

interface EntrySkill {
  id: string;
  skill_id: string;
  rating: number | null;
  validated_at: string | null;
  validated_by: string | null;
  skill: Skill;
}

interface SkillValidationProps {
  entryId: string;
  supervisorId: string;
  isEntryApproved: boolean;
  onValidationComplete?: () => void;
}

export default function SkillValidation({
  entryId,
  supervisorId,
  isEntryApproved,
  onValidationComplete,
}: SkillValidationProps) {
  const [entrySkills, setEntrySkills] = useState<EntrySkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchEntrySkills();
  }, [entryId]);

  const fetchEntrySkills = async () => {
    try {
      const { data, error } = await supabase
        .from("entry_skills")
        .select(`
          id,
          skill_id,
          rating,
          validated_at,
          validated_by,
          skills:skill_id (
            id,
            name,
            category
          )
        `)
        .eq("entry_id", entryId);

      if (error) throw error;

      const mapped = (data || []).map((es: any) => ({
        id: es.id,
        skill_id: es.skill_id,
        rating: es.rating,
        validated_at: es.validated_at,
        validated_by: es.validated_by,
        skill: es.skills,
      }));

      setEntrySkills(mapped);

      // Initialize ratings from existing data
      const initialRatings: Record<string, number> = {};
      mapped.forEach((es) => {
        initialRatings[es.id] = es.rating || 3;
      });
      setRatings(initialRatings);
    } catch (error) {
      console.error("[v0] Error fetching entry skills:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateSkill = async (entrySkillId: string) => {
    setValidating(entrySkillId);
    try {
      const rating = ratings[entrySkillId] || 3;
      
      const { error } = await supabase
        .from("entry_skills")
        .update({
          rating,
          validated_at: new Date().toISOString(),
          validated_by: supervisorId,
        })
        .eq("id", entrySkillId);

      if (error) throw error;

      setEntrySkills((prev) =>
        prev.map((es) =>
          es.id === entrySkillId
            ? {
                ...es,
                rating,
                validated_at: new Date().toISOString(),
                validated_by: supervisorId,
              }
            : es
        )
      );

      toast.success("Skill validated");
      onValidationComplete?.();
    } catch (error) {
      console.error("[v0] Error validating skill:", error);
      toast.error("Failed to validate skill");
    } finally {
      setValidating(null);
    }
  };

  const handleValidateAll = async () => {
    const unvalidated = entrySkills.filter((es) => !es.validated_at);
    if (unvalidated.length === 0) return;

    setValidating("all");
    try {
      for (const es of unvalidated) {
        const rating = ratings[es.id] || 3;
        await supabase
          .from("entry_skills")
          .update({
            rating,
            validated_at: new Date().toISOString(),
            validated_by: supervisorId,
          })
          .eq("id", es.id);
      }

      setEntrySkills((prev) =>
        prev.map((es) =>
          !es.validated_at
            ? {
                ...es,
                rating: ratings[es.id] || 3,
                validated_at: new Date().toISOString(),
                validated_by: supervisorId,
              }
            : es
        )
      );

      toast.success("All skills validated");
      onValidationComplete?.();
    } catch (error) {
      console.error("[v0] Error validating skills:", error);
      toast.error("Failed to validate skills");
    } finally {
      setValidating(null);
    }
  };

  const getRatingLabel = (rating: number) => {
    const labels = ["Poor", "Below Average", "Average", "Good", "Excellent"];
    return labels[rating - 1] || "Average";
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading skills...
      </div>
    );
  }

  if (entrySkills.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4">
        No skills were logged for this entry.
      </p>
    );
  }

  const unvalidatedCount = entrySkills.filter((es) => !es.validated_at).length;
  const allValidated = unvalidatedCount === 0;

  // Group by category
  const skillsByCategory = entrySkills.reduce((acc, es) => {
    const category = es.skill.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(es);
    return acc;
  }, {} as Record<string, EntrySkill[]>);

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {entrySkills.length} skill(s) logged
          {!allValidated && ` • ${unvalidatedCount} pending validation`}
        </div>
        {!allValidated && isEntryApproved && (
          <Button
            size="sm"
            onClick={handleValidateAll}
            disabled={validating !== null}
          >
            {validating === "all" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Validate All
          </Button>
        )}
      </div>

      {/* Skills by Category */}
      {Object.entries(skillsByCategory).map(([category, skills]) => (
        <div key={category} className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {category}
          </p>
          <div className="space-y-3">
            {skills.map((es) => (
              <div
                key={es.id}
                className="p-4 rounded-lg border bg-card space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={es.validated_at ? "default" : "outline"}>
                      {es.skill.name}
                    </Badge>
                    {es.validated_at && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-500" />
                        Validated
                      </span>
                    )}
                  </div>
                  {es.rating && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      {es.rating}/5 - {getRatingLabel(es.rating)}
                    </div>
                  )}
                </div>

                {/* Rating Slider - Only show for unvalidated skills when entry is approved */}
                {!es.validated_at && isEntryApproved && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Rate this skill:</span>
                      <span className="font-medium">
                        {ratings[es.id] || 3}/5 - {getRatingLabel(ratings[es.id] || 3)}
                      </span>
                    </div>
                    <Slider
                      value={[ratings[es.id] || 3]}
                      onValueChange={(value) =>
                        setRatings((prev) => ({ ...prev, [es.id]: value[0] }))
                      }
                      min={1}
                      max={5}
                      step={1}
                      className="w-full"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleValidateSkill(es.id)}
                      disabled={validating !== null}
                      className="w-full mt-2"
                    >
                      {validating === es.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Validate Skill
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {allValidated && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
          <Check className="h-4 w-4" />
          All skills have been validated
        </div>
      )}
    </div>
  );
}
