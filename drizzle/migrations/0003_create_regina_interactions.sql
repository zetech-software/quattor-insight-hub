CREATE TYPE public.regina_interaction_status AS ENUM ('pendente', 'respondida', 'falha');

CREATE TABLE public.regina_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  status public.regina_interaction_status NOT NULL DEFAULT 'pendente',
  topic text NOT NULL DEFAULT 'outros',
  origin text NOT NULL DEFAULT 'chat',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX regina_interactions_created_at_idx ON public.regina_interactions (created_at DESC);
CREATE INDEX regina_interactions_user_id_idx ON public.regina_interactions (user_id);

GRANT SELECT, INSERT, UPDATE ON public.regina_interactions TO authenticated;
GRANT ALL ON public.regina_interactions TO service_role;

ALTER TABLE public.regina_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY regina_interactions_select ON public.regina_interactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_staff_read_access(auth.uid()));

CREATE POLICY regina_interactions_insert ON public.regina_interactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY regina_interactions_update ON public.regina_interactions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_regina_interaction_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.user_id
     AND NOT public.has_admin_area_access(auth.uid())
  THEN
    NEW.id := OLD.id;
    NEW.user_id := OLD.user_id;
    NEW.created_at := OLD.created_at;
    NEW.question := OLD.question;
    NEW.topic := OLD.topic;
    NEW.origin := OLD.origin;

    IF OLD.status <> 'pendente'::public.regina_interaction_status THEN
      RAISE EXCEPTION 'Interacao ja finalizada nao pode ser alterada';
    END IF;

    IF NEW.status NOT IN ('respondida'::public.regina_interaction_status, 'falha'::public.regina_interaction_status) THEN
      RAISE EXCEPTION 'Transicao de situacao nao permitida';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_regina_interaction_update_rules
BEFORE UPDATE ON public.regina_interactions
FOR EACH ROW EXECUTE FUNCTION public.enforce_regina_interaction_update_rules();