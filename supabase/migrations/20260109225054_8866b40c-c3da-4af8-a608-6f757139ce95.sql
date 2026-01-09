-- Fix audit_logs insert policy to only allow via the log_audit_action function
-- Drop the permissive policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Create a more restrictive policy - only allow inserts through security definer functions
-- The log_audit_action function runs as SECURITY DEFINER so it bypasses RLS