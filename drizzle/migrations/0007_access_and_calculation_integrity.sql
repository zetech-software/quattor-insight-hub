-- Apply after all supabase migrations and drizzle migrations 0000..0006.
-- Authentication remains usable for password recovery and viewing one's profile.
CREATE OR REPLACE FUNCTION public.has_operational_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id AND p.is_active AND NOT p.must_change_password
      AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.user_id)
  )
$$;
REVOKE ALL ON FUNCTION public.has_operational_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_operational_access(uuid) TO authenticated, service_role;

-- Restrictive policies are ANDed with every existing permissive policy.
CREATE POLICY calculations_operational_access ON public.calculations
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_operational_access(auth.uid()))
  WITH CHECK (public.has_operational_access(auth.uid()));
CREATE POLICY subscriptions_operational_access ON public.subscriptions
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_operational_access(auth.uid()))
  WITH CHECK (public.has_operational_access(auth.uid()));
CREATE POLICY regina_operational_access ON public.regina_interactions
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_operational_access(auth.uid()))
  WITH CHECK (public.has_operational_access(auth.uid()));

-- An inactive user can still read their own status to leave the application.
CREATE POLICY profiles_read_access ON public.profiles
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_operational_access(auth.uid()));
CREATE POLICY roles_read_access ON public.user_roles
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_operational_access(auth.uid()));

CREATE POLICY profiles_write_access ON public.profiles
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.has_operational_access(auth.uid()))
  WITH CHECK (public.has_operational_access(auth.uid()));
CREATE POLICY profiles_insert_access ON public.profiles
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_operational_access(auth.uid()));
CREATE POLICY profiles_delete_access ON public.profiles
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.has_operational_access(auth.uid()));
CREATE POLICY roles_insert_access ON public.user_roles
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_operational_access(auth.uid()));
CREATE POLICY roles_update_access ON public.user_roles
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.has_operational_access(auth.uid()))
  WITH CHECK (public.has_operational_access(auth.uid()));
CREATE POLICY roles_delete_access ON public.user_roles
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.has_operational_access(auth.uid()));

-- Management may update its own public details, or client-only accounts.
DROP POLICY profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'manager')
      AND public.has_role(user_id, 'client')
      AND NOT public.has_staff_read_access(user_id)
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'manager')
      AND public.has_role(user_id, 'client')
      AND NOT public.has_staff_read_access(user_id)
    )
  );

CREATE OR REPLACE FUNCTION public.enforce_profile_self_update_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.id := OLD.id;
    NEW.user_id := OLD.user_id;
    NEW.created_at := OLD.created_at;
    NEW.must_change_password := OLD.must_change_password;
    -- Managers may only toggle activity of other client-only accounts.
    IF auth.uid() <> OLD.user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
      DECLARE requested_active boolean := NEW.is_active;
      BEGIN
        NEW := OLD;
        NEW.is_active := requested_active;
      END;
    END IF;
    -- Non-admin self edits cannot reactivate/deactivate their own account.
    IF auth.uid() = OLD.user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
      NEW.is_active := OLD.is_active;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Password completion is written only by change-password after Auth confirms success.
-- Browser clients cannot clear the flag through profile UPDATE or RPC.
-- Compatibility for deployed clients: confirmation only, never flag mutation.
CREATE OR REPLACE FUNCTION public.clear_must_change_password()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND NOT must_change_password
  ) THEN
    RAISE EXCEPTION 'Password change has not been confirmed';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.clear_must_change_password() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_must_change_password() TO authenticated;

-- Canonical calculation writes go through save-calculation (service role).
REVOKE INSERT, UPDATE ON public.calculations FROM authenticated, anon;
