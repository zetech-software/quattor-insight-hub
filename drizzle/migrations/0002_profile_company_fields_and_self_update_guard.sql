ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS municipio text,
  ADD COLUMN IF NOT EXISTS uf text;

CREATE OR REPLACE FUNCTION public.enforce_profile_self_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.user_id
     AND NOT public.has_admin_area_access(auth.uid())
  THEN
    NEW.is_active := OLD.is_active;
    NEW.must_change_password := OLD.must_change_password;
    NEW.id := OLD.id;
    NEW.user_id := OLD.user_id;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_self_update_rules ON public.profiles;
CREATE TRIGGER enforce_profile_self_update_rules
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_self_update_rules();