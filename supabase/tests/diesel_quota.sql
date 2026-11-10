-- Run after migrations on a disposable database. All fixtures are rolled back.
BEGIN;
INSERT INTO auth.users (id, email) VALUES
  ('a1111111-1111-4111-8111-111111111111', 'basico@example.invalid'),
  ('a2222222-2222-4222-8222-222222222222', 'superior@example.invalid'),
  ('a3333333-3333-4333-8333-333333333333', 'legado@example.invalid'),
  ('a4444444-4444-4444-8444-444444444444', 'sem-plano@example.invalid'),
  ('a5555555-5555-4555-8555-555555555555', 'curso@example.invalid');

INSERT INTO public.subscription_plans
  (code, name, environment, product, checkout_mode, monthly_calculation_limit, unlimited_calculations, is_active)
VALUES ('diesel_basico_mensal', 'Básico', 'test', 'diesel', 'subscription', 30, false, true),
       ('diesel_intermediario_mensal', 'Intermediário', 'test', 'diesel', 'subscription', 100, false, true),
       ('diesel_superior_anual', 'Superior', 'test', 'diesel', 'subscription', NULL, true, true),
       ('news_mensal', 'Biblioteca News', 'test', 'news', 'subscription', NULL, false, true),
       ('curso_x', 'Minicurso X', 'test', 'course', 'payment', NULL, false, true);

-- Diesel plan without limit nor unlimited flag is rejected by the catalog.
DO $$ BEGIN
  INSERT INTO public.subscription_plans (code, name, environment, product)
  VALUES ('diesel_sem_limite', 'x', 'test', 'diesel');
  RAISE EXCEPTION 'Diesel plan without limit accepted' USING ERRCODE = 'XX000';
EXCEPTION WHEN check_violation THEN NULL; END $$;

INSERT INTO public.stripe_contracts (environment, object_id, user_id, plan_code, mode, customer_id,
  price_id, product_id, status, access_until) VALUES
  ('test','sub_basico','a1111111-1111-4111-8111-111111111111','diesel_basico_mensal','subscription','cus_1','price_b','prod_b','active', now() + interval '20 days'),
  ('test','sub_superior','a2222222-2222-4222-8222-222222222222','diesel_superior_anual','subscription','cus_2','price_s','prod_s','active', now() + interval '300 days'),
  ('test','sub_news','a5555555-5555-4555-8555-555555555555','news_mensal','subscription','cus_5','price_n','prod_n','active', now() + interval '20 days');
INSERT INTO public.subscriptions (user_id, plan_name, status, starts_at, expires_at)
VALUES ('a3333333-3333-4333-8333-333333333333', 'Contrato antigo', 'active', now() - interval '1 year', NULL);

CREATE TEMP TABLE payload AS SELECT jsonb_build_object(
  'data', current_date, 'volume_nf', 1000, 'peso_liquido', 840, 'massa_especifica_20_nf', 0.84,
  'temperatura_amostra', 25, 'densidade_amostra', 0.836, 'temperatura_ct', 25, 'situacao', 'APROVADO',
  'user_id', 'a2222222-2222-4222-8222-222222222222') AS p;
GRANT SELECT ON payload TO authenticated;

SET LOCAL ROLE authenticated;

-- Period boundary in Brasília time.
DO $$ BEGIN
  IF public.diesel_usage_period('2026-12-01 02:59:59+00') <> '2026-11-01' THEN RAISE EXCEPTION 'Period before midnight BRT'; END IF;
  IF public.diesel_usage_period('2026-12-01 03:00:00+00') <> '2026-12-01' THEN RAISE EXCEPTION 'Period at midnight BRT'; END IF;
  IF public.diesel_usage_next_reset('2026-11-10 12:00+00') <> '2026-12-01 03:00:00+00' THEN RAISE EXCEPTION 'Next reset'; END IF;
END $$;

-- Direct INSERT bypassing the quota is not allowed.
SELECT set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
DO $$ BEGIN
  INSERT INTO public.calculations (user_id, volume_nf, peso_liquido, massa_especifica_20_nf,
    temperatura_amostra, densidade_amostra, temperatura_ct)
  VALUES (auth.uid(), 1, 1, 1, 1, 1, 1);
  RAISE EXCEPTION 'Direct insert allowed' USING ERRCODE = 'XX000';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;

-- Básico: 30 per month, idempotent retries, edits free, deletes do not refund.
DO $$
DECLARE r jsonb; first_id uuid; req uuid := gen_random_uuid(); i int; u jsonb;
BEGIN
  r := public.save_diesel_calculation(req, (SELECT p FROM payload));
  first_id := (r->>'calculation_id')::uuid;
  IF (SELECT user_id FROM public.calculations WHERE id = first_id) <> auth.uid() THEN
    RAISE EXCEPTION 'Payload user_id was trusted';
  END IF;
  r := public.save_diesel_calculation(req, (SELECT p FROM payload));
  IF NOT (r->>'duplicate')::boolean OR (r->>'calculation_id')::uuid <> first_id OR (r->>'used')::int <> 1 THEN
    RAISE EXCEPTION 'Retry consumed again: %', r;
  END IF;

  UPDATE public.calculations SET numero_nf = 'EDITADO' WHERE id = first_id;
  IF (public.get_diesel_usage()->>'used')::int <> 1 THEN RAISE EXCEPTION 'Edit consumed'; END IF;

  DELETE FROM public.calculations WHERE id = first_id;
  u := public.get_diesel_usage();
  IF (u->>'used')::int <> 1 OR (u->>'remaining')::int <> 29 OR (u->>'limit')::int <> 30 THEN
    RAISE EXCEPTION 'Delete refunded or wrong summary: %', u;
  END IF;

  FOR i IN 2..30 LOOP PERFORM public.save_diesel_calculation(gen_random_uuid(), (SELECT p FROM payload)); END LOOP;
  BEGIN
    PERFORM public.save_diesel_calculation(gen_random_uuid(), (SELECT p FROM payload));
    RAISE EXCEPTION 'Quota exceeded allowed' USING ERRCODE = 'XX000';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'diesel_quota_exceeded' THEN RAISE; END IF;
  END;
  u := public.get_diesel_usage();
  IF (u->>'used')::int <> 30 OR (u->>'remaining')::int <> 0 THEN RAISE EXCEPTION 'Wrong totals: %', u; END IF;
  -- A retry of an operation already saved still answers after the limit.
  r := public.save_diesel_calculation(req, (SELECT p FROM payload));
  IF NOT (r->>'duplicate')::boolean THEN RAISE EXCEPTION 'Saved retry blocked'; END IF;
END $$;

-- Upgrade mid-month keeps consumption and applies the new limit.
RESET ROLE;
UPDATE public.stripe_contracts SET plan_code = 'diesel_intermediario_mensal' WHERE object_id = 'sub_basico';
SET LOCAL ROLE authenticated;
DO $$ DECLARE u jsonb; BEGIN
  u := public.get_diesel_usage();
  IF (u->>'used')::int <> 30 OR (u->>'limit')::int <> 100 OR (u->>'remaining')::int <> 70 THEN
    RAISE EXCEPTION 'Plan change reset usage: %', u;
  END IF;
  PERFORM public.save_diesel_calculation(gen_random_uuid(), (SELECT p FROM payload));
END $$;

-- Next month starts at zero.
RESET ROLE;
INSERT INTO public.diesel_usage (user_id, period_start, used)
VALUES ('a1111111-1111-4111-8111-111111111111', (public.diesel_usage_period() - interval '1 month')::date, 99);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (public.get_diesel_usage()->>'used')::int <> 31 THEN RAISE EXCEPTION 'Previous month leaked into current'; END IF;
END $$;

-- Superior: unlimited.
SELECT set_config('request.jwt.claim.sub','a2222222-2222-4222-8222-222222222222',true);
DO $$ DECLARE i int; u jsonb; BEGIN
  FOR i IN 1..120 LOOP PERFORM public.save_diesel_calculation(gen_random_uuid(), (SELECT p FROM payload)); END LOOP;
  u := public.get_diesel_usage();
  IF NOT (u->>'unlimited')::boolean OR (u->>'used')::int <> 120 OR u->>'remaining' IS NOT NULL THEN
    RAISE EXCEPTION 'Superior summary wrong: %', u;
  END IF;
END $$;

-- Legacy contract without mapping: access preserved, no plan assigned, no limit.
SELECT set_config('request.jwt.claim.sub','a3333333-3333-4333-8333-333333333333',true);
DO $$ DECLARE i int; u jsonb; BEGIN
  FOR i IN 1..35 LOOP PERFORM public.save_diesel_calculation(gen_random_uuid(), (SELECT p FROM payload)); END LOOP;
  u := public.get_diesel_usage();
  IF u->>'source' <> 'legado_sem_mapeamento' OR u->>'plan_code' IS NOT NULL OR NOT (u->>'unlimited')::boolean THEN
    RAISE EXCEPTION 'Legacy contract got a commercial plan: %', u;
  END IF;
END $$;

-- No plan: blocked. News or course alone does not unlock Diesel.
SELECT set_config('request.jwt.claim.sub','a4444444-4444-4444-8444-444444444444',true);
DO $$ BEGIN
  PERFORM public.save_diesel_calculation(gen_random_uuid(), (SELECT p FROM payload));
  RAISE EXCEPTION 'No-plan client saved' USING ERRCODE = 'XX000';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
SELECT set_config('request.jwt.claim.sub','a5555555-5555-4555-8555-555555555555',true);
DO $$ BEGIN
  IF public.has_product_access('diesel') OR NOT public.has_product_access('news')
    OR public.has_product_access('course','curso_x') THEN RAISE EXCEPTION 'Product rights not independent'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','a2222222-2222-4222-8222-222222222222',true);
DO $$ BEGIN
  SET LOCAL ROLE authenticated;
  IF public.has_product_access('news') THEN RAISE EXCEPTION 'Diesel unlocked News'; END IF;
  RESET ROLE;
END $$;

-- Course: 30 days from first paid confirmation, not extended by repeated webhooks.
DO $$
DECLARE token uuid; first_until timestamptz;
  c jsonb := jsonb_build_object('user_id','a5555555-5555-4555-8555-555555555555','plan_code','curso_x',
    'mode','payment','customer_id','cus_5','price_id','price_c','product_id','prod_c','status','paid',
    'access_until', now() + interval '10 years','cancel_at_period_end', false);
BEGIN
  token := public.claim_stripe_event('test','cs_curso','evt_c1','checkout.session.completed')::uuid;
  PERFORM public.finish_stripe_event('test','cs_curso','evt_c1',token,'processado',NULL,c);
  SELECT access_until INTO first_until FROM public.stripe_contracts WHERE object_id = 'cs_curso';
  IF abs(extract(epoch FROM first_until - (now() + interval '30 days'))) > 5 THEN
    RAISE EXCEPTION 'Course expiry is not 30 days: %', first_until;
  END IF;
  UPDATE public.stripe_contracts SET access_until = access_until - interval '5 days' WHERE object_id = 'cs_curso';
  SELECT access_until INTO first_until FROM public.stripe_contracts WHERE object_id = 'cs_curso';
  token := public.claim_stripe_event('test','cs_curso','evt_c2','checkout.session.async_payment_succeeded')::uuid;
  PERFORM public.finish_stripe_event('test','cs_curso','evt_c2',token,'processado',NULL,c);
  IF (SELECT access_until FROM public.stripe_contracts WHERE object_id = 'cs_curso') <> first_until THEN
    RAISE EXCEPTION 'Repeated webhook renewed course';
  END IF;
  UPDATE public.stripe_contracts SET access_until = now() - interval '1 second' WHERE object_id = 'cs_curso';
  PERFORM set_config('request.jwt.claim.sub','a5555555-5555-4555-8555-555555555555',true);
  IF public.has_product_access('course','curso_x') THEN RAISE EXCEPTION 'Expired course granted'; END IF;
  -- A previously recorded purchase with NULL expiry must not be reopened by webhook replay.
  UPDATE public.stripe_contracts SET access_until = NULL WHERE object_id = 'cs_curso';
  token := public.claim_stripe_event('test','cs_curso','evt_c3','checkout.session.async_payment_succeeded')::uuid;
  PERFORM public.finish_stripe_event('test','cs_curso','evt_c3',token,'processado',NULL,c);
  IF (SELECT access_until FROM public.stripe_contracts WHERE object_id = 'cs_curso') IS NOT NULL
    OR public.has_product_access('course','curso_x') THEN
    RAISE EXCEPTION 'Webhook replay reopened a course with NULL expiry';
  END IF;
END $;

-- Mixed legacy + Stripe contracts must be included in the duplicate review.
INSERT INTO public.subscriptions (user_id, plan_name, status, starts_at, expires_at)
VALUES ('a1111111-1111-4111-8111-111111111111', 'Diesel legado', 'active',
        now() - interval '1 year', now() + interval '1 month');
DO $ BEGIN
  PERFORM set_config('request.jwt.claim.sub','',true);
  IF NOT EXISTS (SELECT 1 FROM public.diesel_multiple_contracts()
    WHERE user_id = 'a1111111-1111-4111-8111-111111111111' AND contracts = 2)
  THEN RAISE EXCEPTION 'Mixed Stripe and legacy duplicate was not reported'; END IF;
END $;

-- Multiple Diesel contracts are listed for precedence decision.
INSERT INTO public.stripe_contracts (environment, object_id, user_id, plan_code, mode, customer_id,
  price_id, product_id, status, access_until) VALUES
  ('test','sub_basico_2','a2222222-2222-4222-8222-222222222222','diesel_basico_mensal','subscription','cus_2','price_b','prod_b','active', now() + interval '20 days');
DO $$ BEGIN
  PERFORM set_config('request.jwt.claim.sub','',true);
  IF NOT EXISTS (SELECT 1 FROM public.diesel_multiple_contracts()
    WHERE user_id = 'a2222222-2222-4222-8222-222222222222' AND contracts = 2) THEN
    RAISE EXCEPTION 'Multiple contracts not reported';
  END IF;
  IF (SELECT unlimited FROM public.diesel_entitlement('a2222222-2222-4222-8222-222222222222')) IS NOT TRUE THEN
    RAISE EXCEPTION 'Provisional precedence not the most generous';
  END IF;
END $;

-- A past-due Stripe Diesel contract must not show legacy access as available.
-- The usage summary and authorization must agree.
INSERT INTO public.stripe_contracts
  (environment, object_id, user_id, plan_code, mode, customer_id,
   price_id, product_id, status, access_until)
VALUES
  ('test','sub_legacy_past_due','a3333333-3333-4333-8333-333333333333',
   'diesel_basico_mensal','subscription','cus_3','price_b','prod_b',
   'past_due',NULL);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a3333333-3333-4333-8333-333333333333',true);
DO $ DECLARE usage jsonb; BEGIN
  usage := public.get_diesel_usage();
  IF public.has_product_access('diesel') OR (usage->>'has_plan')::boolean THEN
    RAISE EXCEPTION 'Past-due Stripe contract incorrectly exposes legacy entitlement';
  END IF;
END $;
RESET ROLE;

ROLLBACK;
SELECT 'diesel_quota ok';
