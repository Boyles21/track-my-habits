-- Create a secure function to promote a user to admin
-- Only existing admins can call this function
CREATE OR REPLACE FUNCTION public.promote_to_admin(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is an admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can promote users to admin';
  END IF;

  -- Check if target user exists in profiles
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = _user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Update or insert admin role
  INSERT INTO user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

  -- Log the action
  PERFORM public.log_audit_action(
    'promote_to_admin',
    jsonb_build_object('promoted_user_id', _user_id),
    NULL,
    jsonb_build_object('role', 'admin'),
    _user_id::text,
    'user_roles'
  );
END;
$$;

-- Create a function to demote an admin back to supervisor
CREATE OR REPLACE FUNCTION public.demote_from_admin(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is an admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can demote users';
  END IF;

  -- Prevent self-demotion (to avoid locking out all admins)
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot demote yourself';
  END IF;

  -- Check if target user is actually an admin
  IF NOT public.has_role(_user_id, 'admin') THEN
    RAISE EXCEPTION 'User is not an admin';
  END IF;

  -- Change role to supervisor
  UPDATE user_roles 
  SET role = 'supervisor' 
  WHERE user_id = _user_id;

  -- Log the action
  PERFORM public.log_audit_action(
    'demote_from_admin',
    jsonb_build_object('demoted_user_id', _user_id),
    jsonb_build_object('role', 'admin'),
    jsonb_build_object('role', 'supervisor'),
    _user_id::text,
    'user_roles'
  );
END;
$$;