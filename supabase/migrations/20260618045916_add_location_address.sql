ALTER TABLE public.logbook_entries
  ADD COLUMN IF NOT EXISTS check_in_address text,
  ADD COLUMN IF NOT EXISTS check_in_geocoded_at timestamptz;
