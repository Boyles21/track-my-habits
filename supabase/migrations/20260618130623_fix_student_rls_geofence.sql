
-- Fix the student UPDATE policy: students must NOT change geofence fields on UPDATE.
-- The trigger `validate_entry_geofence` will overwrite these on INSERT, so on UPDATE
-- we block any modification to them. This prevents students from forging geofence data.

DROP POLICY IF EXISTS "Students can update their own entries" ON public.logbook_entries;

CREATE POLICY "Students can update their own entries"
  ON public.logbook_entries
  FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (
    student_id = auth.uid()
    AND status = 'pending'
    AND approved_by IS NULL
    AND approved_at IS NULL
  );

-- Add a separate BEFORE UPDATE trigger to enforce that students cannot modify geofence columns.
-- This runs as SECURITY DEFINER and silently reverts the geofence columns to their old values.
CREATE OR REPLACE FUNCTION public.block_student_geofence_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only for students; supervisors and admins can still modify these
  IF NOT public.has_role(NEW.student_id, 'admin'::app_role)
     AND NOT public.has_role(NEW.student_id, 'supervisor'::app_role)
  THEN
    -- Revert geofence columns to their old values so the student cannot forge them
    NEW.check_in_lat      := OLD.check_in_lat;
    NEW.check_in_lng      := OLD.check_in_lng;
    NEW.check_in_accuracy := OLD.check_in_accuracy;
    NEW.check_in_at       := OLD.check_in_at;
    NEW.check_in_address  := OLD.check_in_address;
    NEW.distance_meters   := OLD.distance_meters;
    NEW.geofence_valid    := OLD.geofence_valid;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_student_geofence_changes ON public.logbook_entries;

CREATE TRIGGER trg_block_student_geofence_changes
  BEFORE UPDATE ON public.logbook_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.block_student_geofence_changes();

-- The authoritative geofence validation trigger (trg_validate_entry_geofence) already runs
-- BEFORE INSERT/UPDATE and recalculates geofence_valid + distance_meters from the stored org
-- coordinates. It also fires AFTER the student-geofence-lock trigger, so the correct
-- values are always computed server-side regardless of what the client sends.
