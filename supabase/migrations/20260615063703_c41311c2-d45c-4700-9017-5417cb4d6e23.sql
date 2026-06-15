ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';

CREATE OR REPLACE FUNCTION private.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = 'admin'
  )
$$;

CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_name text NOT NULL,
  module text NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  before_changes jsonb,
  after_changes jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome text NOT NULL DEFAULT 'success' CHECK (outcome IN ('success', 'failure')),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Administrators can view audit logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (private.is_admin(auth.uid()));

CREATE INDEX admin_audit_logs_created_at_idx ON public.admin_audit_logs (created_at DESC);
CREATE INDEX admin_audit_logs_actor_idx ON public.admin_audit_logs (actor_user_id, created_at DESC);
CREATE INDEX admin_audit_logs_module_idx ON public.admin_audit_logs (module, created_at DESC);
CREATE INDEX admin_audit_logs_target_idx ON public.admin_audit_logs (target_type, target_id);

CREATE OR REPLACE FUNCTION public.prevent_admin_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Admin audit logs are immutable';
END;
$$;

CREATE TRIGGER prevent_admin_audit_log_update
BEFORE UPDATE ON public.admin_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_audit_log_mutation();

CREATE TRIGGER prevent_admin_audit_log_delete
BEFORE DELETE ON public.admin_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_audit_log_mutation();