CREATE OR REPLACE FUNCTION public.clear_must_change_password()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM set_config('qu4ttuor.password_change_user_id', _user_id::text, true);

  UPDATE public.profiles
  SET must_change_password = false
  WHERE user_id = _user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.clear_must_change_password() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clear_must_change_password() FROM anon;
GRANT EXECUTE ON FUNCTION public.clear_must_change_password() TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_profile_self_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _password_change_user_id text := current_setting('qu4ttuor.password_change_user_id', true);
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.user_id
     AND NOT public.has_admin_area_access(auth.uid())
  THEN
    NEW.is_active := OLD.is_active;

    IF _password_change_user_id IS DISTINCT FROM auth.uid()::text THEN
      NEW.must_change_password := OLD.must_change_password;
    END IF;

    NEW.id := OLD.id;
    NEW.user_id := OLD.user_id;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;