-- =====================================================
-- PHASE 3 PART 2: Create tables and policies
-- =====================================================

-- 1. Create institutions table
CREATE TABLE public.institutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- 2. Create organizations table (placement companies)
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  industry TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. Create skills table (predefined skills list)
CREATE TABLE public.skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- 4. Create entry_skills junction table (skills per logbook entry)
CREATE TABLE public.entry_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.logbook_entries(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  validated_by UUID,
  validated_at TIMESTAMP WITH TIME ZONE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(entry_id, skill_id)
);
ALTER TABLE public.entry_skills ENABLE ROW LEVEL SECURITY;

-- 5. Create student_placements table (student organization assignments)
CREATE TABLE public.student_placements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),
  assigned_by UUID,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.student_placements ENABLE ROW LEVEL SECURITY;

-- 6. Create supervisor_reassignments table (logging reassignments)
CREATE TABLE public.supervisor_reassignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  previous_supervisor_id UUID NOT NULL,
  new_supervisor_id UUID NOT NULL,
  reason TEXT NOT NULL,
  reassigned_by UUID NOT NULL,
  reassigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.supervisor_reassignments ENABLE ROW LEVEL SECURITY;

-- 7. Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 8. Add organization_id and institution_id to profiles for linking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id),
ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id);

-- =====================================================
-- RLS POLICIES - Using has_role function for admin access
-- =====================================================

-- Institutions policies
CREATE POLICY "Admins can manage institutions"
ON public.institutions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view institutions"
ON public.institutions FOR SELECT
TO authenticated
USING (true);

-- Organizations policies
CREATE POLICY "Admins can manage organizations"
ON public.organizations FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view organizations"
ON public.organizations FOR SELECT
TO authenticated
USING (true);

-- Skills policies
CREATE POLICY "Admins can manage skills"
ON public.skills FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view skills"
ON public.skills FOR SELECT
TO authenticated
USING (true);

-- Entry skills policies
CREATE POLICY "Students can add skills to their entries"
ON public.entry_skills FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.logbook_entries le 
  WHERE le.id = entry_id AND le.student_id = auth.uid()
));

CREATE POLICY "Students can view skills on their entries"
ON public.entry_skills FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.logbook_entries le 
  WHERE le.id = entry_id AND le.student_id = auth.uid()
));

CREATE POLICY "Supervisors can view and validate skills"
ON public.entry_skills FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.logbook_entries le 
  JOIN public.supervisor_students ss ON ss.student_id = le.student_id
  WHERE le.id = entry_id AND ss.supervisor_id = auth.uid()
));

CREATE POLICY "Supervisors can update skill validation"
ON public.entry_skills FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.logbook_entries le 
  JOIN public.supervisor_students ss ON ss.student_id = le.student_id
  WHERE le.id = entry_id AND ss.supervisor_id = auth.uid()
));

CREATE POLICY "Admins can manage entry skills"
ON public.entry_skills FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Student placements policies
CREATE POLICY "Admins can manage placements"
ON public.student_placements FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can view their own placements"
ON public.student_placements FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Supervisors can view assigned students placements"
ON public.student_placements FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.supervisor_students ss
  WHERE ss.supervisor_id = auth.uid() AND ss.student_id = student_placements.student_id
));

-- Supervisor reassignments policies
CREATE POLICY "Admins can manage reassignments"
ON public.supervisor_reassignments FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view reassignments involving them"
ON public.supervisor_reassignments FOR SELECT
TO authenticated
USING (
  student_id = auth.uid() OR 
  previous_supervisor_id = auth.uid() OR 
  new_supervisor_id = auth.uid()
);

-- Audit logs policies (admin only for viewing, insert allowed for triggers)
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- UPDATE EXISTING TABLES WITH ADMIN ACCESS
-- =====================================================

-- Profiles: Admin can view and update all
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Logbook entries: Admin can view all
CREATE POLICY "Admins can view all logbook entries"
ON public.logbook_entries FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Documents: Admin can view all
CREATE POLICY "Admins can view all documents"
ON public.documents FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Comments: Admin can view all
CREATE POLICY "Admins can view all comments"
ON public.comments FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- SIWES settings: Admin can view and manage all
CREATE POLICY "Admins can view all siwes settings"
ON public.siwes_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage siwes settings"
ON public.siwes_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update siwes settings"
ON public.siwes_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete siwes settings"
ON public.siwes_settings FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Supervisor students: Admin can manage all
CREATE POLICY "Admins can manage supervisor assignments"
ON public.supervisor_students FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User roles: Admin can view all
CREATE POLICY "Admins can view all user roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- AUDIT LOGGING FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_audit_action(
  _action_type TEXT,
  _table_name TEXT DEFAULT NULL,
  _record_id UUID DEFAULT NULL,
  _old_values JSONB DEFAULT NULL,
  _new_values JSONB DEFAULT NULL,
  _metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (actor_id, action_type, table_name, record_id, old_values, new_values, metadata)
  VALUES (auth.uid(), _action_type, _table_name, _record_id, _old_values, _new_values, _metadata)
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- =====================================================
-- REASSIGN SUPERVISOR FUNCTION (Admin only)
-- =====================================================

CREATE OR REPLACE FUNCTION public.reassign_supervisor(
  _student_id UUID,
  _new_supervisor_id UUID,
  _reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_supervisor_id UUID;
  _reassignment_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can reassign supervisors';
  END IF;

  -- Get current supervisor
  SELECT supervisor_id INTO _old_supervisor_id
  FROM public.supervisor_students
  WHERE student_id = _student_id;

  IF _old_supervisor_id IS NULL THEN
    RAISE EXCEPTION 'Student has no current supervisor';
  END IF;

  IF _old_supervisor_id = _new_supervisor_id THEN
    RAISE EXCEPTION 'New supervisor is the same as current supervisor';
  END IF;

  -- Log the reassignment
  INSERT INTO public.supervisor_reassignments (student_id, previous_supervisor_id, new_supervisor_id, reason, reassigned_by)
  VALUES (_student_id, _old_supervisor_id, _new_supervisor_id, _reason, auth.uid())
  RETURNING id INTO _reassignment_id;

  -- Update the assignment
  UPDATE public.supervisor_students
  SET supervisor_id = _new_supervisor_id, assigned_at = now()
  WHERE student_id = _student_id;

  -- Log to audit
  PERFORM public.log_audit_action(
    'supervisor_reassignment',
    'supervisor_students',
    _reassignment_id,
    jsonb_build_object('supervisor_id', _old_supervisor_id),
    jsonb_build_object('supervisor_id', _new_supervisor_id),
    jsonb_build_object('reason', _reason, 'student_id', _student_id)
  );

  RETURN _reassignment_id;
END;
$$;

-- =====================================================
-- INSERT DEFAULT SKILLS
-- =====================================================

INSERT INTO public.skills (name, category) VALUES
('Technical Writing', 'Communication'),
('Team Collaboration', 'Soft Skills'),
('Problem Solving', 'Analytical'),
('Time Management', 'Soft Skills'),
('Programming', 'Technical'),
('Data Analysis', 'Technical'),
('Project Management', 'Management'),
('Customer Service', 'Soft Skills'),
('Research', 'Analytical'),
('Presentation Skills', 'Communication'),
('Critical Thinking', 'Analytical'),
('Leadership', 'Management'),
('Microsoft Office', 'Technical'),
('Database Management', 'Technical'),
('Web Development', 'Technical'),
('Networking', 'Technical'),
('Quality Assurance', 'Technical'),
('Documentation', 'Communication'),
('Safety Compliance', 'Professional'),
('Industry Standards', 'Professional')
ON CONFLICT (name) DO NOTHING;