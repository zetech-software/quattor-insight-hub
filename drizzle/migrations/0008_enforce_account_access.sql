-- Own profile and roles remain readable for login/error/password screens.
CREATE OR REPLACE FUNCTION public.is_account_ready()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid()
      AND p.is_active AND NOT p.must_change_password
      AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.user_id)
  )
$$;
REVOKE ALL ON FUNCTION public.is_account_ready() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_account_ready() TO authenticated, service_role;

DROP POLICY profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (public.is_account_ready() AND public.has_staff_read_access(auth.uid())));
DROP POLICY user_roles_select ON public.user_roles;
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (public.is_account_ready() AND public.has_staff_read_access(auth.uid())));
DROP POLICY profiles_insert ON public.profiles;
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_account_ready() AND public.has_role(auth.uid(), 'admin'));

-- Restrictive policies AND with every permissive policy, including legacy ones.
CREATE POLICY profiles_operational_update ON public.profiles AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_account_ready()) WITH CHECK (public.is_account_ready());
CREATE POLICY profiles_operational_delete ON public.profiles AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_account_ready());
CREATE POLICY roles_operational_insert ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_account_ready());
CREATE POLICY roles_operational_update ON public.user_roles AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_account_ready()) WITH CHECK (public.is_account_ready());
CREATE POLICY roles_operational_delete ON public.user_roles AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_account_ready());
CREATE POLICY calculations_operational_access ON public.calculations AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_account_ready()) WITH CHECK (public.is_account_ready());
CREATE POLICY subscriptions_operational_access ON public.subscriptions AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_account_ready()) WITH CHECK (public.is_account_ready());
CREATE POLICY regina_operational_access ON public.regina_interactions AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_account_ready()) WITH CHECK (public.is_account_ready());
CREATE POLICY plans_operational_access ON public.subscription_plans AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_account_ready()) WITH CHECK (public.is_account_ready());
