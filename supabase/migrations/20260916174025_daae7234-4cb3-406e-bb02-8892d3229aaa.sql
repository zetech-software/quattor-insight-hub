-- Acesso à área administrativa: admin OU gestão
CREATE OR REPLACE FUNCTION public.has_admin_area_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin'::app_role, 'manager'::app_role)
  )
$$;

REVOKE ALL ON FUNCTION public.has_admin_area_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_admin_area_access(uuid) TO authenticated, service_role;

-- PROFILES: leitura/edição também para gestão; exclusão só admin
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR public.has_admin_area_access(auth.uid()));

DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id) OR public.has_admin_area_access(auth.uid()))
  WITH CHECK ((auth.uid() = user_id) OR public.has_admin_area_access(auth.uid()));

-- CALCULATIONS: leitura também para gestão; exclusão só admin
DROP POLICY IF EXISTS calculations_select ON public.calculations;
CREATE POLICY calculations_select ON public.calculations FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR public.has_admin_area_access(auth.uid()));

-- USER_ROLES: leitura também para gestão; escrita só admin
DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR public.has_admin_area_access(auth.uid()));

-- SUBSCRIPTIONS: leitura também para gestão; alterações só admin
DROP POLICY IF EXISTS subscriptions_select ON public.subscriptions;
CREATE POLICY subscriptions_select ON public.subscriptions FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR public.has_admin_area_access(auth.uid()));