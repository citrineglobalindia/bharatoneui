CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION private.current_user_department()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE ALL ON FUNCTION private.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.current_user_department() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(UUID, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_user_department() TO authenticated, service_role;

DROP POLICY "Users view permitted profiles" ON public.profiles;
DROP POLICY "HR staff manage profiles" ON public.profiles;
DROP POLICY "HR staff view all roles" ON public.user_roles;

CREATE POLICY "Users view permitted profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR private.has_role(auth.uid(), 'hr_staff')
  OR (
    private.has_role(auth.uid(), 'manager')
    AND department = private.current_user_department()
  )
);

CREATE POLICY "HR staff manage profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'hr_staff'))
WITH CHECK (private.has_role(auth.uid(), 'hr_staff'));

CREATE POLICY "HR staff view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'hr_staff'));

DROP FUNCTION public.has_role(UUID, public.app_role);
DROP FUNCTION public.current_user_department();