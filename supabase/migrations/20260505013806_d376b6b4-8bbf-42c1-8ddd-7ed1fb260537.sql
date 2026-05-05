ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS staff_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_staff_id_unique ON public.profiles (staff_id) WHERE staff_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, institution, faculty, department, programme, staff_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data ->> 'institution',
    NEW.raw_user_meta_data ->> 'faculty',
    NEW.raw_user_meta_data ->> 'department',
    NEW.raw_user_meta_data ->> 'programme',
    NULLIF(NEW.raw_user_meta_data ->> 'staff_id', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student')
  );
  
  RETURN NEW;
END;
$function$;