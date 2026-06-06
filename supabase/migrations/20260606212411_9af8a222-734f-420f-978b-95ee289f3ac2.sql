
-- 1. Restrict handle_new_user to safe roles only
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
BEGIN
  INSERT INTO public.profiles (
    id, full_name, email, institution, faculty, department, programme, staff_id
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data ->> 'institution',
    NEW.raw_user_meta_data ->> 'faculty',
    NEW.raw_user_meta_data ->> 'department',
    NEW.raw_user_meta_data ->> 'programme',
    NEW.raw_user_meta_data ->> 'staff_id'
  );

  -- Only allow student or supervisor self-assignment; never admin
  _role := CASE
    WHEN (NEW.raw_user_meta_data ->> 'role') = 'supervisor' THEN 'supervisor'::app_role
    ELSE 'student'::app_role
  END;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$function$;

-- 2. assign_student_to_supervisor caller check
CREATE OR REPLACE FUNCTION public.assign_student_to_supervisor(_student_id uuid, _supervisor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only the student themselves or an admin may create the assignment
  IF auth.uid() IS NULL OR (auth.uid() <> _student_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _supervisor_id AND role = 'supervisor') THEN
    RAISE EXCEPTION 'Invalid supervisor';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _student_id AND role = 'student') THEN
    RAISE EXCEPTION 'User is not a student';
  END IF;

  IF EXISTS (SELECT 1 FROM public.supervisor_students WHERE student_id = _student_id) THEN
    RAISE EXCEPTION 'Student already assigned to a supervisor';
  END IF;

  INSERT INTO public.supervisor_students (student_id, supervisor_id)
  VALUES (_student_id, _supervisor_id);
END;
$function$;

-- 3. Lock down log_audit_action so only internal SECURITY DEFINER callers can use it
REVOKE EXECUTE ON FUNCTION public.log_audit_action(text, text, uuid, jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_audit_action(text, text, uuid, jsonb, jsonb, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit_action(text, text, uuid, jsonb, jsonb, jsonb) FROM anon;

-- 4. Limit get_supervisors PII exposure to anon (signup picker)
DROP FUNCTION IF EXISTS public.get_supervisors();
CREATE OR REPLACE FUNCTION public.get_supervisors()
RETURNS TABLE(id uuid, full_name text, institution text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id, p.full_name, p.institution
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'supervisor'
  ORDER BY p.full_name;
$function$;
GRANT EXECUTE ON FUNCTION public.get_supervisors() TO anon, authenticated;

-- 5. Add student DELETE policy on entry_skills scoped to their own entries
DROP POLICY IF EXISTS "Students can delete skills on their entries" ON public.entry_skills;
CREATE POLICY "Students can delete skills on their entries"
ON public.entry_skills
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.logbook_entries le
    WHERE le.id = entry_skills.entry_id AND le.student_id = auth.uid()
  )
);

-- 6. Prevent students from overwriting approval fields on their logbook entries
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
  AND COALESCE(has_violation, false) = COALESCE((SELECT le2.has_violation FROM public.logbook_entries le2 WHERE le2.id = logbook_entries.id), false)
  AND violation_type IS NOT DISTINCT FROM (SELECT le3.violation_type FROM public.logbook_entries le3 WHERE le3.id = logbook_entries.id)
);
