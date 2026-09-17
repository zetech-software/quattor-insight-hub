CREATE OR REPLACE FUNCTION public.enforce_ticket_update_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_support_access(auth.uid()) OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Autor do chamado: só pode reabrir. Demais campos de gestão ficam travados.
  NEW.priority := OLD.priority;
  NEW.assigned_to := OLD.assigned_to;
  NEW.assigned_name := OLD.assigned_name;
  NEW.requester_id := OLD.requester_id;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'aberto' AND OLD.status IN ('resolvido','fechado') THEN
      NEW.closed_at := NULL;
    ELSE
      NEW.status := OLD.status;
      NEW.closed_at := OLD.closed_at;
    END IF;
  END IF;

  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.enforce_ticket_update_rules() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER tickets_enforce_update BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ticket_update_rules();