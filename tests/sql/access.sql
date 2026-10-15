-- All fixtures roll back; this script is for the isolated bootstrap database.
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('00000000-0000-0000-0000-000000000001','manager@example.invalid'),
 ('00000000-0000-0000-0000-000000000002','admin@example.invalid'),
 ('00000000-0000-0000-0000-000000000003','client@example.invalid'),
 ('00000000-0000-0000-0000-000000000004','other@example.invalid'),
 ('00000000-0000-0000-0000-000000000005','support@example.invalid');
INSERT INTO public.user_roles(user_id,role) VALUES
 ('00000000-0000-0000-0000-000000000001','manager'),
 ('00000000-0000-0000-0000-000000000002','admin'),
 ('00000000-0000-0000-0000-000000000003','client'),
 ('00000000-0000-0000-0000-000000000004','client'),
 ('00000000-0000-0000-0000-000000000005','support');
INSERT INTO public.calculations(user_id,volume_nf,peso_liquido,massa_especifica_20_nf,temperatura_amostra,densidade_amostra,temperatura_ct)
 VALUES ('00000000-0000-0000-0000-000000000003',10000,8400,840,20,0.84,20),
 ('00000000-0000-0000-0000-000000000004',10000,8400,840,20,0.84,20);
CREATE FUNCTION public.test_assert(ok boolean, message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %', message; END IF; END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
DO $$ DECLARE affected int; BEGIN
 UPDATE public.profiles SET is_active=false WHERE user_id='00000000-0000-0000-0000-000000000002';
 GET DIAGNOSTICS affected=ROW_COUNT;
 PERFORM public.test_assert(affected=0,'manager must not update admin');
 UPDATE public.profiles SET is_active=false WHERE user_id='00000000-0000-0000-0000-000000000005';
 GET DIAGNOSTICS affected=ROW_COUNT;
 PERFORM public.test_assert(affected=0,'manager must not update support');
 UPDATE public.profiles SET full_name='tampered',is_active=false WHERE user_id='00000000-0000-0000-0000-000000000003';
 GET DIAGNOSTICS affected=ROW_COUNT;
 PERFORM public.test_assert(affected=1,'manager can deactivate client');
 PERFORM public.test_assert((SELECT full_name IS DISTINCT FROM 'tampered' FROM public.profiles WHERE user_id='00000000-0000-0000-0000-000000000003'),'manager cannot edit client details');
END $$;

SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
SELECT public.test_assert((SELECT count(*)=0 FROM public.calculations),'inactive token cannot read calculations');
DO $$ BEGIN
 BEGIN
  UPDATE public.calculations SET dac20=-999;
  RAISE EXCEPTION 'FAILED: direct update permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
-- Active admin reactivates the client.
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
UPDATE public.profiles SET is_active=true WHERE user_id='00000000-0000-0000-0000-000000000003';
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
SELECT public.test_assert((SELECT count(*)=1 FROM public.calculations),'client sees only own record');
DO $$ BEGIN
 BEGIN
  INSERT INTO public.calculations(user_id,volume_nf,peso_liquido,massa_especifica_20_nf,temperatura_amostra,densidade_amostra,temperatura_ct)
   VALUES (auth.uid(),10000,8400,840,20,0.84,20);
  RAISE EXCEPTION 'FAILED: direct insert permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 UPDATE public.profiles SET is_active=false,must_change_password=true WHERE user_id=auth.uid();
 PERFORM public.test_assert((SELECT is_active AND NOT must_change_password FROM public.profiles WHERE user_id=auth.uid()),'client cannot change operational flags');
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',true);
UPDATE public.profiles SET must_change_password=true WHERE user_id='00000000-0000-0000-0000-000000000003';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
DO $$ BEGIN
 BEGIN
  PERFORM public.clear_must_change_password();
  RAISE EXCEPTION 'FAILED: password flag cleared by RPC';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM LIKE 'FAILED:%' THEN RAISE; END IF;
 END;
 PERFORM public.test_assert((SELECT must_change_password FROM public.profiles WHERE user_id=auth.uid()),'RPC preserves password obligation');
 PERFORM public.test_assert((SELECT count(*)=0 FROM public.calculations),'pending password blocks reads');
END $$;
RESET ROLE;
-- Only the service may complete the password operation after Auth succeeds.
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.sub','',true);
UPDATE public.profiles SET must_change_password=false WHERE user_id='00000000-0000-0000-0000-000000000003';
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
SELECT public.clear_must_change_password();
SELECT public.test_assert((SELECT count(*)=1 FROM public.calculations),'completed password restores reads');
RESET ROLE;
ROLLBACK;
