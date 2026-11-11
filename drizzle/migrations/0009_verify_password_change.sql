-- Evidence is private and written only by a real Auth password change.
CREATE SCHEMA IF NOT EXISTS quattor_private;
REVOKE ALL ON SCHEMA quattor_private FROM PUBLIC, anon, authenticated;
CREATE TABLE quattor_private.password_changes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_at timestamptz NOT NULL
);
REVOKE ALL ON quattor_private.password_changes FROM PUBLIC, anon, authenticated;
ALTER TABLE public.profiles ADD COLUMN password_change_required_at timestamptz NOT NULL DEFAULT now();

CREATE FUNCTION quattor_private.record_password_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- GoTrue sets a random temporary password while verifying a fresh invite.
  -- That internal transition is not the invited user's password choice.
  IF OLD.invited_at IS NOT NULL AND COALESCE(OLD.encrypted_password, '') = '' THEN
    RETURN NEW;
  END IF;
  INSERT INTO quattor_private.password_changes (user_id, changed_at)
    VALUES (NEW.id, clock_timestamp())
    ON CONFLICT (user_id) DO UPDATE SET changed_at = EXCLUDED.changed_at;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION quattor_private.record_password_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER quattor_password_changed AFTER UPDATE OF encrypted_password ON auth.users
  FOR EACH ROW WHEN (OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password AND NEW.encrypted_password IS NOT NULL AND NEW.encrypted_password <> '')
  EXECUTE FUNCTION quattor_private.record_password_change();

CREATE OR REPLACE FUNCTION public.enforce_profile_self_update_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Profile identity cannot be changed' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND auth.role() IS DISTINCT FROM 'service_role' THEN
    IF NEW.is_active IS DISTINCT FROM OLD.is_active AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Administrative profile fields cannot be changed' USING ERRCODE = '42501';
    END IF;
    IF NEW.must_change_password IS DISTINCT FROM OLD.must_change_password THEN
      IF NEW.must_change_password THEN
        IF NOT public.has_role(auth.uid(), 'admin') THEN
          RAISE EXCEPTION 'Only admin can require a password change' USING ERRCODE = '42501';
        END IF;
      ELSIF auth.uid() <> OLD.user_id OR NOT OLD.is_active OR NOT EXISTS (
        SELECT 1 FROM quattor_private.password_changes c
        WHERE c.user_id = OLD.user_id AND c.changed_at > OLD.password_change_required_at
      ) THEN
        RAISE EXCEPTION 'Password change must be confirmed by Auth' USING ERRCODE = '42501';
      END IF;
    END IF;
    NEW.password_change_required_at := OLD.password_change_required_at;
  END IF;
  IF NEW.must_change_password AND NOT OLD.must_change_password THEN
    NEW.password_change_required_at := clock_timestamp();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_profile_self_update_rules() FROM PUBLIC, anon, authenticated;

-- Keep the existing RPC contract. A direct call cannot create its own proof.
CREATE OR REPLACE FUNCTION public.clear_must_change_password()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  p public.profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO p FROM public.profiles WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR NOT p.is_active THEN
    RAISE EXCEPTION 'Active profile required' USING ERRCODE = '42501';
  END IF;
  IF NOT p.must_change_password THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM quattor_private.password_changes c
    WHERE c.user_id = auth.uid() AND c.changed_at > p.password_change_required_at) THEN
    RAISE EXCEPTION 'Password change must be confirmed by Auth' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles SET must_change_password = false WHERE user_id = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.clear_must_change_password() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_must_change_password() TO authenticated;
