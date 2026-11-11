-- Auditoria de cobrança — parte 2 (nov/2026):
-- 1) Controle de acesso pago com kill-switch (DESATIVADO por padrão).
--    Estratégia de transição: usuário SEM registro de assinatura (legado
--    pré-cobrança) mantém acesso; usuário COM registro precisa de assinatura
--    'active' com período vigente. Nada é bloqueado enquanto a chave estiver
--    desligada.
-- 2) Catálogo de produção com os 9 preços verificados na auditoria da Stripe
--    (IDs reais da conta live acct_1UGjr2C9Hplquc9G). Idempotente.
-- 3) Contador técnico de inserções da Calculadora Diesel, sem limite aplicado
--    (regra comercial da franquia e da 101ª inserção pendente de decisão).

-- ============ 1. Chave de ativação ============
CREATE TABLE IF NOT EXISTS public.billing_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enforce_paid_access boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.billing_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
GRANT SELECT ON public.billing_settings TO authenticated;
GRANT ALL ON public.billing_settings TO service_role;

-- ============ 2. Direito de acesso pago ============
-- SECURITY DEFINER: avalia a assinatura sem exigir RLS da própria tabela.
-- - admin: sempre liberado;
-- - enforcement desligado: todos liberados (estado atual);
-- - com assinatura: 'active' e current_period_end nulo ou futuro;
-- - sem registro de assinatura: legado, liberado (transição).
CREATE OR REPLACE FUNCTION public.has_paid_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR NOT (SELECT enforce_paid_access FROM public.billing_settings WHERE id = 1)
    OR EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.user_id = _user_id
        AND s.status = 'active'::public.subscription_status
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.subscriptions s WHERE s.user_id = _user_id
    );
$$;
GRANT EXECUTE ON FUNCTION public.has_paid_access(uuid) TO authenticated, service_role;

-- Portão no backend: criação de cálculos (Calculadora Diesel) passa pelo
-- direito de acesso. Substitui a policy de INSERT existente.
DO $$
DECLARE c text;
BEGIN
  SELECT pol.polname INTO c
  FROM pg_policy pol
  WHERE pol.polrelid = 'public.calculations'::regclass AND pol.polname = 'calculations_insert';
  IF c IS NOT NULL THEN
    EXECUTE 'DROP POLICY calculations_insert ON public.calculations';
  END IF;
END $$;

CREATE POLICY calculations_insert ON public.calculations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.has_paid_access(auth.uid())
  );

-- ============ 3. Contador técnico de inserções (sem limite aplicado) ============
CREATE OR REPLACE FUNCTION public.diesel_insertions_count(_user_id uuid, _since timestamptz)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT count(*)::bigint
  FROM public.calculations
  WHERE user_id = _user_id AND created_at >= _since;
$$;
GRANT EXECUTE ON FUNCTION public.diesel_insertions_count(uuid, timestamptz) TO authenticated, service_role;

-- ============ 4. Catálogo de produção (preços verificados na Stripe live) ============
INSERT INTO public.subscription_plans
  (code, name, description, features, billing_period, amount_cents, currency, stripe_price_id, environment, is_active, sort_order)
VALUES
  ('minicurso_modulo',
   'Minicurso Qu4ttuor (módulo)',
   'Minicurso de 15 minutos com acesso por 30 dias, pago por módulo',
   ARRAY['Acesso por 30 dias ao módulo adquirido'],
   'avulso', 1500, 'brl', 'price_1UY5PlC9Hplquc9Gn8X4Os5j', 'production', true, 10),
  ('biblioteca_news_mensal',
   'Biblioteca News (mensal)',
   'Conteúdo noticioso atualizado, cobrança mensal',
   ARRAY['Conteúdo noticioso atualizado'],
   'mensal', 1000, 'brl', 'price_1UY5B4C9Hplquc9GHG64Bdh6', 'production', true, 20),
  ('biblioteca_news_anual',
   'Biblioteca News (anual)',
   'Conteúdo noticioso atualizado, cobrança anual',
   ARRAY['Conteúdo noticioso atualizado', 'Economia de 2 meses no ano'],
   'anual', 10000, 'brl', 'price_1UY5BaC9Hplquc9GFs7TZx64', 'production', true, 21),
  ('calculadora_diesel_f1_mensal',
   'Calculadora Diesel (1 a 30 inserções, mensal)',
   'Assinatura da Calculadora Diesel para até 30 inserções mensais',
   ARRAY['Até 30 inserções por mês', 'Laudo pronto para conferência', 'Relatórios em PDF e Excel'],
   'mensal', 10000, 'brl', 'price_1UY5NFC9Hplquc9Gv3tImZJA', 'production', true, 30),
  ('calculadora_diesel_f2_mensal',
   'Calculadora Diesel (31 a 100 inserções, mensal)',
   'Assinatura da Calculadora Diesel para 31 a 100 inserções mensais',
   ARRAY['31 a 100 inserções por mês', 'Laudo pronto para conferência', 'Relatórios em PDF e Excel'],
   'mensal', 30000, 'brl', 'price_1UY5OkC9Hplquc9G5MDSknOn', 'production', true, 31),
  ('calculadora_diesel_f3_mensal',
   'Calculadora Diesel (faixa superior, mensal)',
   'Assinatura da Calculadora Diesel para a faixa superior de inserções mensais',
   ARRAY['Faixa superior de inserções', 'Laudo pronto para conferência', 'Relatórios em PDF e Excel'],
   'mensal', 50000, 'brl', 'price_1UY5OkC9Hplquc9GlE5oVraF', 'production', true, 32),
  ('calculadora_diesel_f1_anual',
   'Calculadora Diesel (1 a 30 inserções, anual)',
   'Assinatura anual da Calculadora Diesel para até 30 inserções mensais',
   ARRAY['Até 30 inserções por mês', 'Laudo pronto para conferência', 'Relatórios em PDF e Excel'],
   'anual', 100000, 'brl', 'price_1UY5OkC9Hplquc9GwHMz9oOQ', 'production', true, 40),
  ('calculadora_diesel_f2_anual',
   'Calculadora Diesel (31 a 100 inserções, anual)',
   'Assinatura anual da Calculadora Diesel para 31 a 100 inserções mensais',
   ARRAY['31 a 100 inserções por mês', 'Laudo pronto para conferência', 'Relatórios em PDF e Excel'],
   'anual', 300000, 'brl', 'price_1UY5OkC9Hplquc9G8D5I139D', 'production', true, 41),
  ('calculadora_diesel_f3_anual',
   'Calculadora Diesel (faixa superior, anual)',
   'Assinatura anual da Calculadora Diesel para a faixa superior de inserções mensais',
   ARRAY['Faixa superior de inserções', 'Laudo pronto para conferência', 'Relatórios em PDF e Excel'],
   'anual', 500000, 'brl', 'price_1UY5OkC9Hplquc9GPpuuWqS5', 'production', true, 42)
ON CONFLICT (code) DO NOTHING;
