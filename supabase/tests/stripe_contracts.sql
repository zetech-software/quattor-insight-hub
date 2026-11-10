-- Run after migrations on a disposable database. All fixtures are rolled back.
BEGIN;
INSERT INTO auth.users (id, email)
VALUES ('33333333-3333-4333-8333-333333333333', 'stripe-test-a@example.invalid'),
       ('44444444-4444-4444-8444-444444444444', 'stripe-test-b@example.invalid');

DO $$
DECLARE
  buyer constant uuid := '33333333-3333-4333-8333-333333333333';
  token uuid;
  newer_token uuid;
  original jsonb := jsonb_build_object(
    'user_id', buyer, 'plan_code', 'saas', 'mode', 'subscription', 'price_id', 'price_mock',
    'product_id', 'prod_mock', 'customer_id', 'cus_mock', 'status', 'active',
    'access_until', now() + interval '30 days', 'cancel_at_period_end', false
  );
BEGIN
  -- No Stripe contract and no legacy subscription must not grant SaaS access.
  PERFORM set_config('request.jwt.claim.sub', buyer::text, true);
  IF public.has_stripe_access() THEN RAISE EXCEPTION 'Unsubscribed client granted SaaS'; END IF;

  -- Explicit legacy entitlement remains valid only while active and in period.
  INSERT INTO public.subscriptions (user_id, plan_name, status, starts_at, expires_at)
  VALUES (buyer, 'Legado autorizado', 'active', now() - interval '1 day', now() + interval '30 days');
  IF NOT public.has_stripe_access() THEN RAISE EXCEPTION 'Valid legacy subscription denied'; END IF;
  UPDATE public.subscriptions SET status = 'expired' WHERE user_id = buyer;
  IF public.has_stripe_access() THEN RAISE EXCEPTION 'Expired legacy status granted SaaS'; END IF;
  UPDATE public.subscriptions SET status = 'active', expires_at = now() - interval '1 second'
  WHERE user_id = buyer;
  IF public.has_stripe_access() THEN RAISE EXCEPTION 'Expired legacy period granted SaaS'; END IF;
  UPDATE public.subscriptions SET expires_at = now() + interval '30 days',
    starts_at = now() + interval '1 day' WHERE user_id = buyer;
  IF public.has_stripe_access() THEN RAISE EXCEPTION 'Future legacy contract granted SaaS'; END IF;
  UPDATE public.subscriptions SET starts_at = now() - interval '1 day'
  WHERE user_id = buyer;

  token := public.claim_stripe_event('test','sub_mock','evt_open','checkout.session.completed')::uuid;
  IF public.claim_stripe_event('test','sub_mock','evt_parallel','invoice.paid') <> 'busy' THEN
    RAISE EXCEPTION 'Parallel reconciliation was accepted';
  END IF;
  PERFORM public.finish_stripe_event('test','sub_mock','evt_open',token,'processado',NULL,original);
  IF public.claim_stripe_event('test','sub_mock','evt_open','checkout.session.completed') <> 'duplicate' THEN
    RAISE EXCEPTION 'Finalized event was not deduplicated';
  END IF;

  token := public.claim_stripe_event('test','sub_mock','evt_fail','invoice.payment_failed')::uuid;
  PERFORM public.finish_stripe_event('test','sub_mock','evt_fail',token,'falha','temporary');
  token := public.claim_stripe_event('test','sub_mock','evt_fail','invoice.payment_failed')::uuid;
  IF (SELECT attempts FROM public.payment_events WHERE environment = 'test' AND event_id = 'evt_fail') <> 2 THEN
    RAISE EXCEPTION 'Retry did not increment attempts';
  END IF;

  UPDATE public.stripe_webhook_leases SET expires_at = clock_timestamp() - interval '1 second'
    WHERE environment = 'test' AND object_id = 'sub_mock';
  newer_token := public.claim_stripe_event('test','sub_mock','evt_fail','invoice.payment_failed')::uuid;
  BEGIN
    PERFORM public.finish_stripe_event('test','sub_mock','evt_fail',token,'processado',NULL,original);
    RAISE EXCEPTION 'Old worker wrote with an expired token' USING ERRCODE = 'XX000';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;

  BEGIN
    PERFORM public.finish_stripe_event('test','sub_mock','evt_fail',newer_token,'processado',NULL,
      original || '{"user_id":"44444444-4444-4444-8444-444444444444"}');
    RAISE EXCEPTION 'Contract owner was overwritten' USING ERRCODE = 'XX000';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;
  PERFORM public.finish_stripe_event('test','sub_mock','evt_fail',newer_token,'processado',NULL,
    original || '{"status":"past_due","access_until":null}');

  PERFORM set_config('request.jwt.claim.sub', buyer::text, true);
  IF public.has_stripe_access() THEN RAISE EXCEPTION 'Past due contract granted SaaS despite valid legacy record'; END IF;

  token := public.claim_stripe_event('test','sub_mock','evt_recovery','invoice.paid')::uuid;
  PERFORM public.finish_stripe_event('test','sub_mock','evt_recovery',token,'processado',NULL,original);
  IF NOT public.has_stripe_access() THEN RAISE EXCEPTION 'Paid renewal did not restore access'; END IF;

  token := public.claim_stripe_event('test','sub_mock','evt_expiry','customer.subscription.updated')::uuid;
  PERFORM public.finish_stripe_event('test','sub_mock','evt_expiry',token,'processado',NULL,
    original || jsonb_build_object('access_until', now() - interval '1 second'));
  IF public.has_stripe_access() THEN RAISE EXCEPTION 'Expired period granted access'; END IF;

  token := public.claim_stripe_event('test','sub_other','evt_renewal','invoice.paid')::uuid;
  PERFORM public.finish_stripe_event('test','sub_other','evt_renewal',token,'processado',NULL,original);
  IF NOT public.has_stripe_access() THEN RAISE EXCEPTION 'Second contract did not grant access'; END IF;

  token := public.claim_stripe_event('test','sub_other','evt_cancel','customer.subscription.deleted')::uuid;
  PERFORM public.finish_stripe_event('test','sub_other','evt_cancel',token,'processado',NULL,
    original || '{"status":"canceled","access_until":null}');
  IF public.has_stripe_access() THEN RAISE EXCEPTION 'Cancelled contract granted access'; END IF;

  token := public.claim_stripe_event('test','cs_mock','evt_course','checkout.session.async_payment_succeeded')::uuid;
  PERFORM public.finish_stripe_event('test','cs_mock','evt_course',token,'processado',NULL,
    original || '{"mode":"payment","plan_code":"course","status":"paid","access_until":null}');
  IF public.has_stripe_access() OR NOT public.has_stripe_access('course') OR public.has_stripe_access('other') THEN
    RAISE EXCEPTION 'Course entitlement leaked across products';
  END IF;
END;
$$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
DO $$
BEGIN
  IF EXISTS (SELECT FROM public.stripe_contracts) OR public.has_stripe_access('course') THEN
    RAISE EXCEPTION 'RLS permitted cross-account access';
  END IF;
  IF has_function_privilege(current_user, 'public.claim_stripe_event(text,text,text,text)', 'EXECUTE')
    OR has_table_privilege(current_user, 'public.payment_events', 'SELECT')
    OR has_table_privilege(current_user, 'public.stripe_contracts', 'INSERT') THEN
    RAISE EXCEPTION 'Client can mutate server-owned billing data';
  END IF;
END;
$$;
ROLLBACK;
