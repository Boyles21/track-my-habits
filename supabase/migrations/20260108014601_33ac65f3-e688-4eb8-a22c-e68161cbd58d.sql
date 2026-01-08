-- Add SIWES settings table for duration configuration
CREATE TABLE public.siwes_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE,
  start_date date NOT NULL,
  required_weeks integer NOT NULL DEFAULT 24,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.siwes_settings ENABLE ROW LEVEL SECURITY;

-- Students can view and manage their own settings
CREATE POLICY "Students can view their own settings"
ON public.siwes_settings FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Students can insert their own settings"
ON public.siwes_settings FOR INSERT
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own settings"
ON public.siwes_settings FOR UPDATE
USING (student_id = auth.uid());

-- Supervisors can view assigned students' settings
CREATE POLICY "Supervisors can view assigned students settings"
ON public.siwes_settings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM supervisor_students ss
  WHERE ss.supervisor_id = auth.uid() AND ss.student_id = siwes_settings.student_id
));

-- Add trigger for updated_at
CREATE TRIGGER update_siwes_settings_updated_at
BEFORE UPDATE ON public.siwes_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add approved_at timestamp to logbook_entries for tracking when entries were approved
ALTER TABLE public.logbook_entries 
ADD COLUMN approved_at timestamp with time zone,
ADD COLUMN approved_by uuid;