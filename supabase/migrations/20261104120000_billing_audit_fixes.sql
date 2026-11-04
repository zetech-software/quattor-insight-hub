-- Auditoria de cobrança (nov/2026):
-- 1) billing_period passa a aceitar 'avulso' (minicurso pago por módulo).
-- 2) subscriptions recebe stripe_payment_intent_id para vincular compras
--    avulsas e tratar reembolsos.

DO $$
DECLARE
  c text;
BEGIN
  SELECT conname INTO c
  FROM pg_constraint
  WHERE conrelid = 'public.subscription_plans'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%billing_period%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.subscription_plans DROP CONSTRAINT %I', c);
  END IF;
END $$;

ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_billing_period_check
  CHECK (billing_period IN ('mensal', 'anual', 'avulso'));

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

CREATE INDEX IF NOT EXISTS subscriptions_payment_intent_idx
  ON public.subscriptions (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
