
-- ============================================================
-- Geofencing Security Hardening Migration
-- ============================================================

-- 1. Add maximum radius constraint (5000m = 5km is a sensible cap)
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS check_valid_radius;

ALTER TABLE public.organizations
  ADD CONSTRAINT check_valid_radius
    CHECK (geofence_radius IS NULL OR (geofence_radius >= 10 AND geofence_radius <= 5000));

-- 2. Tighten the UPDATE RLS policy for students on logbook_entries.
--    Students must NOT be able to write geofence fields (lat/lng/geofence_valid/distance)
--    directly; those will be set only through the server-side validation trigger.
--    We enforce this by replacing the student UPDATE policy with one that
--    also requires the geofence columns to remain unchanged vs. what is already stored.

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
    -- Prevent students from forging geofence data:
    -- geofence columns must match what is already in the row.
    AND COALESCE(check_in_lat, 0) = COALESCE(
          (SELECT le2.check_in_lat FROM logbook_entries le2 WHERE le2.id = logbook_entries.id), 0)
    AND COALESCE(check_in_lng, 0) = COALESCE(
          (SELECT le2.check_in_lng FROM logbook_entries le2 WHERE le2.id = logbook_entries.id), 0)
    AND COALESCE(geofence_valid, false) = COALESCE(
          (SELECT le2.geofence_valid FROM logbook_entries le2 WHERE le2.id = logbook_entries.id), false)
    AND COALESCE(distance_meters, 0) = COALESCE(
          (SELECT le2.distance_meters FROM logbook_entries le2 WHERE le2.id = logbook_entries.id), 0)
  );

-- 3. Create a server-side Haversine function in PostgreSQL.
--    This is the authoritative distance calculation — identical math to the client.
CREATE OR REPLACE FUNCTION public.haversine_distance_meters(
  lat1 DOUBLE PRECISION,
  lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lng2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  R CONSTANT DOUBLE PRECISION := 6371000; -- Earth radius in metres
  lat1_r DOUBLE PRECISION;
  lat2_r DOUBLE PRECISION;
  dlat   DOUBLE PRECISION;
  dlng   DOUBLE PRECISION;
  a      DOUBLE PRECISION;
  c      DOUBLE PRECISION;
BEGIN
  lat1_r := radians(lat1);
  lat2_r := radians(lat2);
  dlat   := radians(lat2 - lat1);
  dlng   := radians(lng2 - lng1);

  a := sin(dlat / 2) ^ 2
       + cos(lat1_r) * cos(lat2_r) * sin(dlng / 2) ^ 2;
  c := 2 * atan2(sqrt(a), sqrt(1 - a));

  RETURN R * c;
END;
$$;

COMMENT ON FUNCTION public.haversine_distance_meters IS
  'Haversine great-circle distance between two lat/lng points, in metres.';

-- 4. Create the server-side geofence validator function.
--    Called by the trigger below; computes the real distance from the
--    student-supplied GPS coordinates against the organisation's stored
--    coordinates and radius.  It overwrites geofence_valid and distance_meters
--    so students cannot forge those values.
CREATE OR REPLACE FUNCTION public.validate_entry_geofence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_lat  DOUBLE PRECISION;
  org_lng  DOUBLE PRECISION;
  org_rad  INTEGER;
  real_dist DOUBLE PRECISION;
  placement_org_id UUID;
BEGIN
  -- Only process when GPS coordinates were supplied
  IF NEW.check_in_lat IS NULL OR NEW.check_in_lng IS NULL THEN
    NEW.geofence_valid   := NULL;
    NEW.distance_meters  := NULL;
    RETURN NEW;
  END IF;

  -- Look up the student's active placement organisation
  SELECT sp.organization_id
  INTO placement_org_id
  FROM student_placements sp
  WHERE sp.student_id = NEW.student_id
    AND sp.status = 'active'
  LIMIT 1;

  IF placement_org_id IS NULL THEN
    -- No active placement → mark as invalid
    NEW.geofence_valid  := FALSE;
    NEW.distance_meters := NULL;
    RETURN NEW;
  END IF;

  -- Fetch organisation coordinates
  SELECT o.latitude, o.longitude, o.geofence_radius
  INTO org_lat, org_lng, org_rad
  FROM organizations o
  WHERE o.id = placement_org_id;

  IF org_lat IS NULL OR org_lng IS NULL OR org_rad IS NULL THEN
    -- Organisation has no geofence configured
    NEW.geofence_valid  := NULL;
    NEW.distance_meters := NULL;
    RETURN NEW;
  END IF;

  -- Compute authoritative distance
  real_dist := public.haversine_distance_meters(
    NEW.check_in_lat, NEW.check_in_lng,
    org_lat, org_lng
  );

  -- Overwrite whatever the client sent — these values are now server-authoritative
  NEW.distance_meters := real_dist;
  NEW.geofence_valid  := (real_dist <= org_rad);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_entry_geofence IS
  'Trigger function: recomputes geofence_valid and distance_meters from server-stored org coords. Prevents client spoofing.';

-- 5. Attach the trigger to logbook_entries for both INSERT and UPDATE.
DROP TRIGGER IF EXISTS trg_validate_entry_geofence ON public.logbook_entries;

CREATE TRIGGER trg_validate_entry_geofence
  BEFORE INSERT OR UPDATE ON public.logbook_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_entry_geofence();

-- 6. Backfill existing rows that have GPS coordinates but incorrect/missing geofence values.
UPDATE public.logbook_entries le
SET
  distance_meters = sub.real_dist,
  geofence_valid  = (sub.real_dist <= sub.org_rad)
FROM (
  SELECT
    le2.id,
    public.haversine_distance_meters(
      le2.check_in_lat, le2.check_in_lng,
      o.latitude, o.longitude
    ) AS real_dist,
    o.geofence_radius AS org_rad
  FROM logbook_entries le2
  JOIN student_placements sp ON sp.student_id = le2.student_id AND sp.status = 'active'
  JOIN organizations o ON o.id = sp.organization_id
  WHERE le2.check_in_lat IS NOT NULL
    AND le2.check_in_lng IS NOT NULL
    AND o.latitude IS NOT NULL
    AND o.longitude IS NOT NULL
) sub
WHERE le.id = sub.id;
