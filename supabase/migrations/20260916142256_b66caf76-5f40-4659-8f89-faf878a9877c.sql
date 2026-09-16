REVOKE EXECUTE ON FUNCTION public.clear_must_change_password() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clear_must_change_password() FROM anon;
GRANT EXECUTE ON FUNCTION public.clear_must_change_password() TO authenticated;