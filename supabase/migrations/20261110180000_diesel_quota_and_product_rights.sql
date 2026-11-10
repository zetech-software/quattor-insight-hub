-- Controle mensal de inserções da Calculadora Diesel e direitos independentes
-- por produto (Diesel, Biblioteca News e minicursos).
--
-- Regras:
-- * Período = mês civil no horário de Brasília (America/Sao_Paulo); renova no
--   dia 1 à meia-noite, inclusive para assinaturas anuais.
-- * Cada cálculo novo salvo consome 1 inserção; edição não consome; exclusão
--   não devolve. Reenvio com o mesmo request_id não consome de novo.
-- * Contagem começa em zero na ativação (sem retroativo).
-- * Troca de plano no mês não zera o consumo; vale o limite do plano vigente.
-- * Contratos sem mapeamento comercial preservam o acesso e não recebem limite
--   automático. Múltiplos contratos Diesel ativos ficam listados para decisão.
-- * Minicursos expiram 30 dias após a primeira confirmação de pagamento;
--   webhooks repetidos não renovam o prazo.

-- 1. Catálogo: produto e limite mensal --------------------------------------
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS product text NOT NULL DEFAULT 'diesel',
  ADD COLUMN IF NOT EXISTS monthly_calculation_limit integer,
  ADD COLUMN IF NOT EXISTS unlimited_calculations boolean NOT NULL DEFAULT false;

ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_product_check
    CHECK (product IN ('diesel','news','course')),
  ADD CONSTRAINT subscription_plans_product_mode_check
    CHECK ((product = 'course') = (checkout_mode = 'payment')),
  ADD CONSTRAINT subscription_plans_limit_check
    CHECK (monthly_calculation_limit IS NULL OR monthly_calculation_limit >= 0),
  ADD CONSTRAINT subscription_plans_diesel_limit_check
    CHECK (product <> 'diesel' OR unlimited_calculations OR monthly_calculation_limit IS NOT NULL);

-- 2. Período de utilização ----------------------------------------------------
CREATE FUNCTION public.diesel_usage_period(p_at timestamptz DEFAULT now())
RETURNS date LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT date_trunc('month', p_at AT TIME ZONE 'America/Sao_Paulo')::date;
$$;

CREATE FUNCTION public.diesel_usage_next_reset(p_at timestamptz DEFAULT now())
RETURNS timestamptz LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT ((date_trunc('month', p_at AT TIME ZONE 'America/Sao_Paulo') + interval '1 month')
    AT TIME ZONE 'America/Sao_Paulo');
$$;

-- 3. Consumo --------------------------------------------------------------------
CREATE TABLE public.diesel_usage (
  user_id uuid NOT NULL,
  period_start date NOT NULL,
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_start)
);
GRANT SELECT ON public.diesel_usage TO authenticated;
GRANT ALL ON public.diesel_usage TO service_role;
ALTER TABLE public.diesel_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY diesel_usage_select ON public.diesel_usage FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.has_staff_read_access(auth.uid())));

-- Uma linha por operação de gravação (idempotência de reenvios).
CREATE TABLE public.diesel_usage_requests (
  user_id uuid NOT NULL,
  request_id uuid NOT NULL,
  calculation_id uuid NOT NULL,
  payload_hash text NOT NULL,
  period_start date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, request_id)
);
GRANT ALL ON public.diesel_usage_requests TO service_role;
ALTER TABLE public.diesel_usage_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.diesel_usage_requests FROM PUBLIC, anon, authenticated;

-- 4. Direitos por produto -----------------------------------------------------
-- Contratos Diesel ativos do usuário, com o plano do catálogo (mesmo ambiente).
CREATE FUNCTION public.active_diesel_contracts(p_user uuid)
RETURNS TABLE (plan_code text, plan_name text, monthly_limit integer, unlimited boolean, source text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT c.plan_code, p.name, p.monthly_calculation_limit, p.unlimited_calculations, 'stripe'
  FROM public.stripe_contracts c
  JOIN public.subscription_plans p ON p.environment = c.environment AND p.code = c.plan_code
  WHERE c.user_id = p_user AND c.mode = 'subscription' AND p.product = 'diesel'
    AND c.status IN ('active','trialing') AND c.access_until > now();
$$;
REVOKE EXECUTE ON FUNCTION public.active_diesel_contracts(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.active_diesel_contracts(uuid) TO service_role;

CREATE FUNCTION public.has_product_access(p_product text, p_code text DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN p_product = 'course' THEN p_code IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.stripe_contracts c
      JOIN public.subscription_plans p ON p.environment = c.environment AND p.code = c.plan_code
      WHERE c.user_id = auth.uid() AND c.mode = 'payment' AND p.product = 'course'
        AND c.plan_code = p_code AND c.status = 'paid' AND c.access_until > now())
    WHEN p_product = 'news' THEN EXISTS (
      SELECT 1 FROM public.stripe_contracts c
      JOIN public.subscription_plans p ON p.environment = c.environment AND p.code = c.plan_code
      WHERE c.user_id = auth.uid() AND c.mode = 'subscription' AND p.product = 'news'
        AND c.status IN ('active','trialing') AND c.access_until > now())
    WHEN p_product = 'diesel' THEN
      EXISTS (SELECT 1 FROM public.active_diesel_contracts(auth.uid()))
      OR (
        -- Contrato legado (sem Stripe) só vale enquanto não houver contrato Diesel Stripe.
        NOT EXISTS (
          SELECT 1 FROM public.stripe_contracts c
          JOIN public.subscription_plans p ON p.environment = c.environment AND p.code = c.plan_code
          WHERE c.user_id = auth.uid() AND c.mode = 'subscription' AND p.product = 'diesel')
        AND EXISTS (
          SELECT 1 FROM public.subscriptions l
          WHERE l.user_id = auth.uid() AND l.stripe_subscription_id IS NULL
            AND l.status IN ('active','trial') AND l.starts_at <= now()
            AND (l.expires_at IS NULL AND l.status = 'active' OR l.expires_at > now())))
    ELSE false
  END;
$$;
REVOKE EXECUTE ON FUNCTION public.has_product_access(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_product_access(text, text) TO authenticated, service_role;

-- Compatibilidade: has_stripe_access() = Diesel; com código = minicurso.
CREATE OR REPLACE FUNCTION public.has_stripe_access(p_course_code text DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT CASE WHEN p_course_code IS NULL THEN public.has_product_access('diesel')
    ELSE public.has_product_access('course', p_course_code) END;
$$;

-- 5. Plano Diesel vigente e limite --------------------------------------------
-- Precedência provisória com múltiplos contratos: o mais generoso (ilimitado,
-- depois maior limite). Os casos ficam listados em diesel_multiple_contracts.
CREATE FUNCTION public.diesel_entitlement(p_user uuid)
RETURNS TABLE (plan_code text, plan_name text, monthly_limit integer, unlimited boolean,
               source text, contract_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.active_diesel_contracts(p_user);
  IF v_count > 0 THEN
    RETURN QUERY SELECT a.plan_code, a.plan_name, a.monthly_limit, a.unlimited, a.source, v_count
      FROM public.active_diesel_contracts(p_user) a
      ORDER BY a.unlimited DESC, a.monthly_limit DESC NULLS LAST LIMIT 1;
    RETURN;
  END IF;
  -- Legado com plan_code mapeado no catálogo Diesel recebe o limite do plano.
  RETURN QUERY
    SELECT l.plan_code, coalesce(p.name, l.plan_name),
      p.monthly_calculation_limit,
      CASE WHEN p.code IS NULL THEN true ELSE p.unlimited_calculations END,
      CASE WHEN p.code IS NULL THEN 'legado_sem_mapeamento' ELSE 'legado_mapeado' END,
      1
    FROM public.subscriptions l
    LEFT JOIN LATERAL (
      SELECT sp.* FROM public.subscription_plans sp
      WHERE sp.code = l.plan_code AND sp.product = 'diesel' AND sp.is_active
      ORDER BY (sp.environment = coalesce(l.environment, 'production')) DESC LIMIT 1
    ) p ON true
    WHERE l.user_id = p_user AND l.stripe_subscription_id IS NULL
      AND l.status IN ('active','trial') AND l.starts_at <= now()
      AND (l.expires_at IS NULL AND l.status = 'active' OR l.expires_at > now())
    ORDER BY l.starts_at DESC LIMIT 1;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.diesel_entitlement(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.diesel_entitlement(uuid) TO service_role;

-- Clientes com mais de um contrato Diesel ativo (precedência a definir).
CREATE FUNCTION public.diesel_multiple_contracts()
RETURNS TABLE (user_id uuid, contracts integer, plan_codes text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $
  -- Aggregate Stripe and valid legacy contracts together. One of each is
  -- also a duplicate requiring review (UNION ALL of grouped counts misses it).
  SELECT combined.user_id, count(*)::integer, array_agg(combined.code ORDER BY combined.code)
  FROM (
    SELECT c.user_id, c.plan_code AS code
    FROM public.stripe_contracts c
    JOIN public.subscription_plans p ON p.environment = c.environment AND p.code = c.plan_code
    WHERE c.mode = 'subscription' AND p.product = 'diesel'
      AND c.status IN ('active','trialing') AND c.access_until > now()
    UNION ALL
    SELECT l.user_id, coalesce(l.plan_code, l.plan_name) AS code
    FROM public.subscriptions l
    WHERE l.stripe_subscription_id IS NULL AND l.status IN ('active','trial')
      AND l.starts_at <= now()
      AND (l.expires_at IS NULL AND l.status = 'active' OR l.expires_at > now())
  ) combined
  WHERE auth.uid() IS NULL OR public.has_staff_read_access(auth.uid())
  GROUP BY combined.user_id
  HAVING count(*) > 1;
$;
REVOKE EXECUTE ON FUNCTION public.diesel_multiple_contracts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.diesel_multiple_contracts() TO service_role;

-- 6. Resumo de uso para a Calculadora -----------------------------------------
CREATE FUNCTION public.get_diesel_usage()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_period date := public.diesel_usage_period();
  v_used integer;
  e record;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT coalesce((SELECT used FROM public.diesel_usage
    WHERE user_id = v_user AND period_start = v_period), 0) INTO v_used;
  SELECT * INTO e FROM public.diesel_entitlement(v_user);
  RETURN jsonb_build_object(
    'has_plan', e.source IS NOT NULL,
    'plan_code', e.plan_code,
    'plan_name', e.plan_name,
    'source', e.source,
    'unlimited', coalesce(e.unlimited, false),
    'limit', CASE WHEN e.unlimited THEN NULL ELSE e.monthly_limit END,
    'used', v_used,
    'remaining', CASE WHEN e.source IS NULL THEN 0 WHEN e.unlimited THEN NULL
                      ELSE greatest(e.monthly_limit - v_used, 0) END,
    'period_start', v_period,
    'next_reset', public.diesel_usage_next_reset()
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_diesel_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_diesel_usage() TO authenticated;

-- 7. Gravação atômica do cálculo ----------------------------------------------
CREATE FUNCTION public.save_diesel_calculation(p_request_id uuid, p_calculation jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_period date := public.diesel_usage_period();
  v_used integer;
  v_existing uuid;
  v_existing_hash text;
  v_payload_hash text;
  v_id uuid;
  r public.calculations;
  e record;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF p_request_id IS NULL OR p_calculation IS NULL THEN
    RAISE EXCEPTION 'invalid_request' USING ERRCODE = '22023';
  END IF;

  v_payload_hash := md5(p_calculation::text);
  -- Trava por usuário/mês: serializa gravações concorrentes do mesmo cliente.
  INSERT INTO public.diesel_usage (user_id, period_start) VALUES (v_user, v_period)
    ON CONFLICT DO NOTHING;
  SELECT used INTO v_used FROM public.diesel_usage
    WHERE user_id = v_user AND period_start = v_period FOR UPDATE;

  -- Reenvio da mesma operação: devolve o cálculo já gravado, sem consumir.
  SELECT calculation_id, payload_hash INTO v_existing, v_existing_hash FROM public.diesel_usage_requests
    WHERE user_id = v_user AND request_id = p_request_id;
  IF v_existing IS NOT NULL THEN
    IF v_existing_hash IS DISTINCT FROM v_payload_hash THEN
      RAISE EXCEPTION 'diesel_request_payload_mismatch' USING ERRCODE = '22023';
    END IF;
    RETURN jsonb_build_object('calculation_id', v_existing, 'duplicate', true, 'used', v_used);
  END IF;

  IF NOT public.has_staff_read_access(v_user) THEN
    IF NOT public.has_product_access('diesel') THEN
      RAISE EXCEPTION 'diesel_access_denied' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO e FROM public.diesel_entitlement(v_user);
    IF NOT coalesce(e.unlimited, false) AND v_used >= coalesce(e.monthly_limit, 0) THEN
      RAISE EXCEPTION 'diesel_quota_exceeded' USING ERRCODE = 'P0001',
        DETAIL = format('used=%s limit=%s', v_used, coalesce(e.monthly_limit, 0));
    END IF;
  END IF;

  r := jsonb_populate_record(NULL::public.calculations, p_calculation);
  INSERT INTO public.calculations (
    user_id, data, numero_nf, placa_ct, municipio_base, volume_nf, peso_liquido,
    massa_especifica_20_nf, temperatura_amostra, densidade_amostra, temperatura_ct,
    situacao_seta, dnf20, fcnf, temperatura_estimada, dac20, qualidade_diff, vct_min,
    vct, vct_max, fcct, v20, volume_recebido, volume_atestado, diferenca_volume, situacao
  ) VALUES (
    v_user, coalesce(r.data, current_date), r.numero_nf, r.placa_ct, r.municipio_base,
    r.volume_nf, r.peso_liquido, r.massa_especifica_20_nf, r.temperatura_amostra,
    r.densidade_amostra, r.temperatura_ct, coalesce(r.situacao_seta, 0), r.dnf20, r.fcnf,
    r.temperatura_estimada, r.dac20, r.qualidade_diff, r.vct_min, r.vct, r.vct_max, r.fcct,
    r.v20, r.volume_recebido, r.volume_atestado, r.diferenca_volume, r.situacao
  ) RETURNING id INTO v_id;

  INSERT INTO public.diesel_usage_requests (user_id, request_id, calculation_id, payload_hash, period_start)
    VALUES (v_user, p_request_id, v_id, v_payload_hash, v_period);
  UPDATE public.diesel_usage SET used = used + 1, updated_at = now()
    WHERE user_id = v_user AND period_start = v_period
    RETURNING used INTO v_used;

  RETURN jsonb_build_object('calculation_id', v_id, 'duplicate', false, 'used', v_used);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.save_diesel_calculation(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_diesel_calculation(uuid, jsonb) TO authenticated;

-- Novos cálculos só entram pela função atômica (edição e exclusão seguem iguais).
REVOKE INSERT ON public.calculations FROM authenticated, anon;

-- 8. Minicursos: prazo fixo de 30 dias ----------------------------------------
CREATE OR REPLACE FUNCTION public.finish_stripe_event(
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
    IF v_contract.mode = 'payment' THEN
      -- O prazo nasce na primeira confirmação de pagamento; o valor enviado é ignorado.
      v_contract.access_until := CASE WHEN v_contract.status = 'paid'
        THEN clock_timestamp() + interval '30 days' END;
    END IF;
    INSERT INTO public.stripe_contracts AS contract (
      environment, object_id, user_id, plan_code, mode, customer_id, price_id,
      product_id, status, access_until, cancel_at_period_end
    ) VALUES (
      p_environment, p_object_id, v_contract.user_id, v_contract.plan_code, v_contract.mode,
      v_contract.customer_id, v_contract.price_id, v_contract.product_id, v_contract.status,
      v_contract.access_until, v_contract.cancel_at_period_end
    )
    ON CONFLICT (environment, object_id) DO UPDATE SET
      status = excluded.status,
      access_until = CASE WHEN contract.mode = 'payment'
        THEN contract.access_until
        ELSE excluded.access_until END,
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
REVOKE EXECUTE ON FUNCTION public.finish_stripe_event(text,text,text,uuid,text,text,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_stripe_event(text,text,text,uuid,text,text,jsonb) TO service_role;
