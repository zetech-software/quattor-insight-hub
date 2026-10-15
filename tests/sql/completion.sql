BEGIN;
INSERT INTO auth.users(id,email) VALUES
('10000000-0000-0000-0000-000000000001','client@tests.invalid'),
('10000000-0000-0000-0000-000000000002','staff@tests.invalid');
INSERT INTO public.user_roles(user_id,role) VALUES
('10000000-0000-0000-0000-000000000001','client'),
('10000000-0000-0000-0000-000000000002','admin');
DO $$ BEGIN
 IF NOT public.has_subscription_access('10000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'Manual access lost'; END IF;
END $$;
INSERT INTO public.subscriptions(user_id,status) VALUES('10000000-0000-0000-0000-000000000001','expired');
DO $$ BEGIN
 IF public.has_operational_access('10000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'Expired subscription allowed'; END IF;
END $$;
UPDATE public.subscriptions SET status='active',expires_at=now()-interval '1 day';
DO $$ BEGIN
 IF public.has_subscription_access('10000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'Expired date allowed'; END IF;
END $$;
UPDATE public.subscriptions SET expires_at=now()+interval '1 day';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
DO $$ BEGIN
 BEGIN
  INSERT INTO public.regina_interactions(user_id,question) VALUES(auth.uid(),'forged');
  RAISE EXCEPTION 'FAILED: client may forge telemetry';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',true);
SET LOCAL ROLE service_role;
DO $$ DECLARE i integer; first_token text; second_token text; claimed jsonb; BEGIN
 FOR i IN 1..10 LOOP
  PERFORM public.reserve_regina_interaction('10000000-0000-0000-0000-000000000001','test','outros');
 END LOOP;
 BEGIN
  PERFORM public.reserve_regina_interaction('10000000-0000-0000-0000-000000000001','over quota','outros');
  RAISE EXCEPTION 'FAILED: quota ignored';
 EXCEPTION WHEN SQLSTATE 'P0429' THEN NULL;
 END;
 claimed:=public.claim_payment_event('evt_test','test','test','{}');
 first_token:=claimed->>'token';
 IF first_token IS NULL THEN RAISE EXCEPTION 'Initial event was not claimed'; END IF;
 claimed:=public.claim_payment_event('evt_test','test','test','{}');
 IF claimed->>'token' IS NOT NULL THEN RAISE EXCEPTION 'Concurrent claim allowed'; END IF;
 UPDATE public.payment_events SET lease_until=now()-interval '1 minute' WHERE event_id='evt_test';
 claimed:=public.claim_payment_event('evt_test','test','test','{}');
 second_token:=claimed->>'token';
 IF second_token IS NULL OR second_token=first_token THEN RAISE EXCEPTION 'Crashed event not recoverable'; END IF;
 UPDATE public.payment_events SET status='processado' WHERE event_id='evt_test';
 claimed:=public.claim_payment_event('evt_test','test','test','{}');
 IF claimed->>'token' IS NOT NULL THEN RAISE EXCEPTION 'Completed event reprocessed'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
SELECT public.get_admin_dashboard();
ROLLBACK;
