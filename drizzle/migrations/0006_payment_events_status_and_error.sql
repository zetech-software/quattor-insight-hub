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