
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_profile_fk
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
