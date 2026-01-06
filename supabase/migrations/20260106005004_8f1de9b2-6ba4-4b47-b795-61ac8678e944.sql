-- Create a function to get all supervisors (for dropdown during registration)
-- This needs to be accessible during signup before the user is authenticated
CREATE OR REPLACE FUNCTION public.get_supervisors()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  institution text,
  department text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.institution,
    p.department
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'supervisor'
  ORDER BY p.full_name;
$$;

-- Create a function to assign a student to a supervisor
-- This will be called after successful signup
CREATE OR REPLACE FUNCTION public.assign_student_to_supervisor(
  _student_id uuid,
  _supervisor_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the supervisor exists and has supervisor role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _supervisor_id AND role = 'supervisor'
  ) THEN
    RAISE EXCEPTION 'Invalid supervisor';
  END IF;

  -- Verify the student has student role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _student_id AND role = 'student'
  ) THEN
    RAISE EXCEPTION 'User is not a student';
  END IF;

  -- Check if assignment already exists
  IF EXISTS (
    SELECT 1 FROM public.supervisor_students 
    WHERE student_id = _student_id
  ) THEN
    RAISE EXCEPTION 'Student already assigned to a supervisor';
  END IF;

  -- Create the assignment
  INSERT INTO public.supervisor_students (student_id, supervisor_id)
  VALUES (_student_id, _supervisor_id);
END;
$$;

-- Grant execute permission to authenticated users for the assignment function
GRANT EXECUTE ON FUNCTION public.assign_student_to_supervisor(uuid, uuid) TO authenticated;

-- Grant execute permission to anon users for getting supervisors (needed during signup)
GRANT EXECUTE ON FUNCTION public.get_supervisors() TO anon;
GRANT EXECUTE ON FUNCTION public.get_supervisors() TO authenticated;