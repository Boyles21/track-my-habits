-- Add institution_id foreign key to profiles table
-- This allows tracking which institution each student/supervisor is from

ALTER TABLE public.profiles 
ADD COLUMN institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL;

-- Update existing records to link by institution name (if they match)
UPDATE public.profiles p
SET institution_id = i.id
FROM public.institutions i
WHERE p.institution = i.name AND p.institution_id IS NULL;

-- Create index for performance
CREATE INDEX idx_profiles_institution_id ON public.profiles(institution_id);

-- Add audit logging for institution registrations
-- This tracks when students/supervisors register with an institution
CREATE TABLE IF NOT EXISTS public.institution_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('student', 'supervisor', 'admin')),
  email TEXT NOT NULL,
  full_name TEXT,
  faculty TEXT,
  department TEXT,
  programme TEXT,
  staff_id TEXT,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for audit log queries
CREATE INDEX idx_institution_audit_log_institution_id ON public.institution_audit_log(institution_id);
CREATE INDEX idx_institution_audit_log_user_type ON public.institution_audit_log(user_type);
CREATE INDEX idx_institution_audit_log_registered_at ON public.institution_audit_log(registered_at DESC);

-- Add RLS policies for audit log
ALTER TABLE public.institution_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view all institution audit logs"
ON public.institution_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Users can view audit logs for their own institution
CREATE POLICY "Users can view audit logs for their institution"
ON public.institution_audit_log
FOR SELECT
USING (
  institution_id IN (
    SELECT institution_id FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);
