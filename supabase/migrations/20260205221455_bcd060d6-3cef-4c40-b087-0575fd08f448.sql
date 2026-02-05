-- Add time tracking columns to logbook_entries
ALTER TABLE public.logbook_entries 
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS has_violation BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS violation_type TEXT;

-- Add a comment explaining the violation types
COMMENT ON COLUMN public.logbook_entries.violation_type IS 'Types: max_hours_exceeded, below_weekly_minimum';