-- 1. Novas colunas de identificação do solicitante
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS requester_company text,
  ADD COLUMN IF NOT EXISTS requester_role text;

-- Backfill a partir de profiles / user_roles
UPDATE public.tickets t
SET requester_company = p.company_name
FROM public.profiles p
WHERE p.user_id = t.requester_id AND t.requester_company IS NULL;

UPDATE public.tickets t
SET requester_role = CASE
  WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = t.requester_id AND r.role = 'admin'::app_role) THEN 'admin'
  WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = t.requester_id AND r.role = 'support'::app_role) THEN 'support'
  WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = t.requester_id AND r.role = 'manager'::app_role) THEN 'manager'
  ELSE 'client'
END
WHERE t.requester_role IS NULL;

-- 2. Suporte não abre chamado (nem por chamada direta)
DROP POLICY IF EXISTS tickets_insert ON public.tickets;
CREATE POLICY tickets_insert ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid() AND NOT public.has_role(auth.uid(), 'support'::app_role));

-- 3. Regras de atualização: solicitante só reabre; retomada automática permitida
CREATE OR REPLACE FUNCTION public.enforce_ticket_update_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_support_access(auth.uid()) OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.priority := OLD.priority;
  NEW.assigned_to := OLD.assigned_to;
  NEW.assigned_name := OLD.assigned_name;
  NEW.requester_id := OLD.requester_id;
  NEW.requester_role := OLD.requester_role;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'aberto' AND OLD.status IN ('resolvido','fechado') THEN
      NEW.closed_at := NULL;
    ELSIF NEW.status = 'em_atendimento' AND OLD.status = 'aguardando_cliente' THEN
      NEW.closed_at := NULL;
    ELSE
      NEW.status := OLD.status;
      NEW.closed_at := OLD.closed_at;
    END IF;
  END IF;

  RETURN NEW;
END; $function$;

-- 4. Resposta do solicitante em "aguardando cliente" volta para "em atendimento"
CREATE OR REPLACE FUNCTION public.touch_ticket_last_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.tickets t
  SET last_message_at = NEW.created_at,
      updated_at = now(),
      status = CASE
        WHEN NEW.is_internal = false
         AND NEW.author_is_support = false
         AND t.requester_id = NEW.author_id
         AND t.status = 'aguardando_cliente'::ticket_status
        THEN 'em_atendimento'::ticket_status
        ELSE t.status
      END
  WHERE t.id = NEW.ticket_id;
  RETURN NEW;
END; $function$;

-- 5. Categorias padronizadas nos chamados existentes
UPDATE public.tickets SET category = CASE category
  WHEN 'geral' THEN 'outro'
  WHEN 'calculo' THEN 'calculadora'
  WHEN 'relatorio' THEN 'relatorios'
  ELSE category
END
WHERE category IN ('geral','calculo','relatorio');