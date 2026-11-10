-- Compatibilidade com projetos que já aplicaram as migrações Drizzle 0005 e 0006.
-- Catálogo de planos (nasce vazio: nenhum preço definido)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  features text[] NOT NULL DEFAULT '{}',
  billing_period text NOT NULL DEFAULT 'mensal' CHECK (billing_period IN ('mensal','anual')),
  amount_cents integer,
  currency text NOT NULL DEFAULT 'brl',
  stripe_product_id text,
  stripe_price_id text,
  environment text NOT NULL DEFAULT 'test' CHECK (environment IN ('test','production')),
  is_recommended boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_plans_select ON public.subscription_plans;
CREATE POLICY subscription_plans_select ON public.subscription_plans
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS subscription_plans_admin_all ON public.subscription_plans;
CREATE POLICY subscription_plans_admin_all ON public.subscription_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Registro de eventos de pagamento (somente servidor)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('test','production')),
  payload jsonb,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.payment_events TO service_role;

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Campos futuros da assinatura (todos opcionais; dados atuais preservados)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_code text,
  ADD COLUMN IF NOT EXISTS billing_period text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS environment text;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_key
  ON public.subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE public.payment_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS error text,
  ADD COLUMN IF NOT EXISTS received_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

UPDATE public.payment_events
SET status = 'processado'
WHERE processed_at IS NOT NULL AND status = 'pendente';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_events_status_check') THEN
    ALTER TABLE public.payment_events
      ADD CONSTRAINT payment_events_status_check
      CHECK (status IN ('pendente','processado','falha','recusado','ignorado'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS payment_events_status_idx ON public.payment_events (status);

ALTER TABLE public.subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_code_key,
  ADD CONSTRAINT subscription_plans_environment_code_key UNIQUE (environment, code),
  ADD COLUMN checkout_mode text NOT NULL DEFAULT 'subscription'
    CHECK (checkout_mode IN ('subscription', 'payment'));

ALTER TABLE public.payment_events DROP CONSTRAINT IF EXISTS payment_events_event_id_key,
  ADD CONSTRAINT payment_events_environment_event_id_key UNIQUE (environment, event_id);
REVOKE ALL ON public.payment_events FROM PUBLIC, anon, authenticated;

CREATE TABLE public.stripe_contracts (
  environment text NOT NULL CHECK (environment IN ('test','production')),
  object_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('subscription','payment')),
  customer_id text,
  price_id text NOT NULL,
  product_id text NOT NULL,
  status text NOT NULL,
  access_until timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (environment, object_id),
  CHECK ((mode = 'subscription' AND object_id LIKE 'sub\_%') OR
         (mode = 'payment' AND object_id LIKE 'cs\_%'))
);
CREATE INDEX stripe_contracts_user_mode_idx ON public.stripe_contracts (user_id, mode, plan_code);

ALTER TABLE public.stripe_contracts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_contracts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.stripe_contracts TO authenticated;
GRANT ALL ON public.stripe_contracts TO service_role;
CREATE POLICY stripe_contracts_own_read ON public.stripe_contracts
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE TABLE public.stripe_webhook_leases (
  environment text NOT NULL,
  object_id text NOT NULL,
  token uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (environment, object_id)
);
ALTER TABLE public.stripe_webhook_leases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_webhook_leases FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.stripe_webhook_leases TO service_role;

CREATE FUNCTION public.claim_stripe_event(
  p_environment text, p_object_id text, p_event_id text, p_event_type text
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_token uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.payment_events
    WHERE environment = p_environment AND event_id = p_event_id
      AND status IN ('processado','recusado')) THEN RETURN 'duplicate'; END IF;

  INSERT INTO public.stripe_webhook_leases AS lease (environment, object_id, token, expires_at)
  VALUES (p_environment, p_object_id, gen_random_uuid(), clock_timestamp() + interval '90 seconds')
  ON CONFLICT (environment, object_id) DO UPDATE
    SET token = excluded.token, expires_at = excluded.expires_at
    WHERE lease.expires_at <= clock_timestamp()
  RETURNING token INTO v_token;
  IF v_token IS NULL THEN RETURN 'busy'; END IF;

  INSERT INTO public.payment_events AS event (event_id, event_type, environment, attempts)
  VALUES (p_event_id, p_event_type, p_environment, 1)
  ON CONFLICT (environment, event_id) DO UPDATE
    SET status = 'pendente', attempts = event.attempts + 1, error = NULL, processed_at = NULL
    WHERE event.status NOT IN ('processado','recusado');
  IF NOT FOUND THEN
    DELETE FROM public.stripe_webhook_leases
      WHERE environment = p_environment AND object_id = p_object_id AND token = v_token;
    RETURN 'duplicate';
  END IF;
  RETURN v_token::text;
END;
$$;

CREATE FUNCTION public.finish_stripe_event(
  p_environment text, p_object_id text, p_event_id text, p_token uuid,
  p_status text, p_error text DEFAULT NULL, p_contract jsonb DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_contract public.stripe_contracts;
BEGIN
  DELETE FROM public.stripe_webhook_leases
    WHERE environment = p_environment AND object_id = p_object_id
      AND token = p_token AND expires_at > clock_timestamp();
  IF NOT FOUND THEN RAISE EXCEPTION 'Stripe lease expired'; END IF;

  IF p_contract IS NOT NULL THEN
    v_contract := jsonb_populate_record(NULL::public.stripe_contracts, p_contract);
    INSERT INTO public.stripe_contracts AS contract (
      environment, object_id, user_id, plan_code, mode, customer_id, price_id,
      product_id, status, access_until, cancel_at_period_end
    ) VALUES (
      p_environment, p_object_id, v_contract.user_id, v_contract.plan_code, v_contract.mode,
      v_contract.customer_id, v_contract.price_id, v_contract.product_id, v_contract.status,
      v_contract.access_until, v_contract.cancel_at_period_end
    )
    ON CONFLICT (environment, object_id) DO UPDATE SET
      status = excluded.status, access_until = excluded.access_until,
      cancel_at_period_end = excluded.cancel_at_period_end, updated_at = now()
    WHERE contract.user_id = excluded.user_id AND contract.plan_code = excluded.plan_code
      AND contract.mode = excluded.mode AND contract.customer_id IS NOT DISTINCT FROM excluded.customer_id
      AND contract.price_id = excluded.price_id AND contract.product_id = excluded.product_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Stripe contract identity mismatch'; END IF;
  END IF;

  UPDATE public.payment_events SET status = p_status, error = p_error,
    processed_at = CASE WHEN p_status IN ('processado','recusado') THEN now() END
  WHERE environment = p_environment AND event_id = p_event_id AND status = 'pendente';
  IF NOT FOUND THEN RAISE EXCEPTION 'Stripe event is not pending'; END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_stripe_event(text,text,text,text),
  public.finish_stripe_event(text,text,text,uuid,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_stripe_event(text,text,text,text),
  public.finish_stripe_event(text,text,text,uuid,text,text,jsonb) TO service_role;

CREATE FUNCTION public.has_stripe_access(p_course_code text DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN false
    WHEN p_course_code IS NOT NULL THEN EXISTS (
      SELECT 1 FROM public.stripe_contracts
      WHERE user_id = (SELECT auth.uid()) AND mode = 'payment'
        AND plan_code = p_course_code AND status = 'paid'
    )
    WHEN NOT EXISTS (
      SELECT 1 FROM public.stripe_contracts
      WHERE user_id = (SELECT auth.uid()) AND mode = 'subscription'
    ) THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.stripe_contracts
      WHERE user_id = (SELECT auth.uid()) AND mode = 'subscription'
        AND status IN ('active','trialing') AND access_until > now()
    )
  END;
$$;
REVOKE EXECUTE ON FUNCTION public.has_stripe_access(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_stripe_access(text) TO authenticated;

CREATE POLICY calculations_stripe_access ON public.calculations
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT public.has_staff_read_access(auth.uid())) OR (SELECT public.has_stripe_access()))
  WITH CHECK ((SELECT public.has_staff_read_access(auth.uid())) OR (SELECT public.has_stripe_access()));
