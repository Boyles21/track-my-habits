ALTER TABLE public.logbook_entries
  ADD COLUMN IF NOT EXISTS check_in_lat double precision,
  ADD COLUMN IF NOT EXISTS check_in_lng double precision,
  ADD COLUMN IF NOT EXISTS check_in_accuracy double precision,
  ADD COLUMN IF NOT EXISTS check_in_at timestamptz;