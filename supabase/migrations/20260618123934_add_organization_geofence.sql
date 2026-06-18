-- Add geofence location fields to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS geofence_radius INTEGER DEFAULT 100;

-- Add index for organizations with coordinates
CREATE INDEX IF NOT EXISTS idx_organizations_location ON public.organizations(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add a check constraint for valid coordinates
ALTER TABLE public.organizations
ADD CONSTRAINT check_valid_latitude CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
ADD CONSTRAINT check_valid_longitude CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
ADD CONSTRAINT check_valid_radius CHECK (geofence_radius IS NULL OR geofence_radius > 0);

-- Remove the old geocoded address columns from logbook_entries since we're moving to geofence validation
-- First, rename the old address column to keep it for reference during transition, then we'll use organization-based validation
ALTER TABLE public.logbook_entries
ADD COLUMN IF NOT EXISTS geofence_valid BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS distance_meters DOUBLE PRECISION DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.organizations.latitude IS 'Latitude coordinate for organization location (for geofencing)';
COMMENT ON COLUMN public.organizations.longitude IS 'Longitude coordinate for organization location (for geofencing)';
COMMENT ON COLUMN public.organizations.geofence_radius IS 'Allowed radius in meters for attendance check-in';
COMMENT ON COLUMN public.logbook_entries.geofence_valid IS 'Whether the check-in was within the organization geofence';
COMMENT ON COLUMN public.logbook_entries.distance_meters IS 'Distance in meters from organization location at check-in';