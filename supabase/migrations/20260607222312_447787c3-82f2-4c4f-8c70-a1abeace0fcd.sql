
-- Helper: normalize and upsert an institution by name, return its id
CREATE OR REPLACE FUNCTION public.upsert_institution_by_name(_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _clean text;
  _id uuid;
BEGIN
  IF _name IS NULL THEN RETURN NULL; END IF;
  _clean := btrim(regexp_replace(_name, '\s+', ' ', 'g'));
  IF _clean = '' THEN RETURN NULL; END IF;

  SELECT id INTO _id FROM public.institutions
   WHERE lower(name) = lower(_clean)
   LIMIT 1;

  IF _id IS NULL THEN
    INSERT INTO public.institutions (name) VALUES (_clean) RETURNING id INTO _id;
  END IF;

  RETURN _id;
END;
$$;

-- Update handle_new_user to link institution_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
  _institution_name text;
  _institution_id uuid;
BEGIN
  _institution_name := NEW.raw_user_meta_data ->> 'institution';
  _institution_id := public.upsert_institution_by_name(_institution_name);

  INSERT INTO public.profiles (
    id, full_name, email, institution, institution_id, faculty, department, programme, staff_id
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    _institution_name,
    _institution_id,
    NEW.raw_user_meta_data ->> 'faculty',
    NEW.raw_user_meta_data ->> 'department',
    NEW.raw_user_meta_data ->> 'programme',
    NEW.raw_user_meta_data ->> 'staff_id'
  );

  _role := CASE
    WHEN (NEW.raw_user_meta_data ->> 'role') = 'supervisor' THEN 'supervisor'::app_role
    ELSE 'student'::app_role
  END;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$$;

-- Trigger to keep institutions in sync when a profile's institution text is updated
CREATE OR REPLACE FUNCTION public.sync_profile_institution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.institution IS DISTINCT FROM OLD.institution THEN
    NEW.institution_id := public.upsert_institution_by_name(NEW.institution);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_institution ON public.profiles;
CREATE TRIGGER profiles_sync_institution
BEFORE UPDATE OF institution ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_institution();

-- Also handle inserts not done through handle_new_user (safety)
DROP TRIGGER IF EXISTS profiles_sync_institution_insert ON public.profiles;
CREATE TRIGGER profiles_sync_institution_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.institution IS NOT NULL AND NEW.institution_id IS NULL)
EXECUTE FUNCTION public.sync_profile_institution();

-- Backfill existing profile institution names into institutions table
DO $$
DECLARE
  r RECORD;
  _id uuid;
BEGIN
  FOR r IN SELECT DISTINCT institution FROM public.profiles WHERE institution IS NOT NULL AND btrim(institution) <> '' LOOP
    _id := public.upsert_institution_by_name(r.institution);
    UPDATE public.profiles SET institution_id = _id
     WHERE institution_id IS DISTINCT FROM _id
       AND lower(btrim(institution)) = lower(btrim(r.institution));
  END LOOP;
END $$;
