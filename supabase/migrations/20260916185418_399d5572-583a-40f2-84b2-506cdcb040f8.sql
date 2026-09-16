CREATE TYPE public.ticket_status AS ENUM ('aberto','em_atendimento','aguardando_cliente','resolvido','fechado');
CREATE TYPE public.ticket_priority AS ENUM ('baixa','normal','alta','urgente');

CREATE OR REPLACE FUNCTION public.has_support_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('support'::app_role,'admin'::app_role))
$$;
REVOKE ALL ON FUNCTION public.has_support_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_support_access(uuid) TO authenticated, service_role;

CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_name text,
  requester_email text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_name text,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  priority public.ticket_priority NOT NULL DEFAULT 'normal',
  status public.ticket_status NOT NULL DEFAULT 'aberto',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY tickets_select ON public.tickets FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR public.has_support_access(auth.uid()));
CREATE POLICY tickets_insert ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY tickets_update ON public.tickets FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR public.has_support_access(auth.uid()))
  WITH CHECK (requester_id = auth.uid() OR public.has_support_access(auth.uid()));
CREATE POLICY tickets_delete ON public.tickets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX tickets_requester_idx ON public.tickets(requester_id);
CREATE INDEX tickets_status_idx ON public.tickets(status);

CREATE OR REPLACE FUNCTION public.is_ticket_participant(_user_id uuid, _ticket_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = _ticket_id AND t.requester_id = _user_id)
$$;
REVOKE ALL ON FUNCTION public.is_ticket_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_ticket_participant(uuid, uuid) TO authenticated, service_role;

CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text,
  author_is_support boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ticket_messages TO authenticated;
GRANT ALL ON public.ticket_messages TO service_role;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY ticket_messages_select ON public.ticket_messages FOR SELECT TO authenticated
  USING (
    public.has_support_access(auth.uid())
    OR (is_internal = false AND public.is_ticket_participant(auth.uid(), ticket_id))
  );
CREATE POLICY ticket_messages_insert ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (public.has_support_access(auth.uid()) OR public.is_ticket_participant(auth.uid(), ticket_id))
    AND (is_internal = false OR public.has_support_access(auth.uid()))
  );
CREATE INDEX ticket_messages_ticket_idx ON public.ticket_messages(ticket_id);

CREATE TABLE public.ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.ticket_messages(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ticket_attachments TO authenticated;
GRANT ALL ON public.ticket_attachments TO service_role;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY ticket_attachments_select ON public.ticket_attachments FOR SELECT TO authenticated
  USING (public.has_support_access(auth.uid()) OR public.is_ticket_participant(auth.uid(), ticket_id));
CREATE POLICY ticket_attachments_insert ON public.ticket_attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid()
    AND (public.has_support_access(auth.uid()) OR public.is_ticket_participant(auth.uid(), ticket_id)));
CREATE INDEX ticket_attachments_msg_idx ON public.ticket_attachments(message_id);

CREATE TABLE public.ticket_reads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ticket_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_reads TO authenticated;
GRANT ALL ON public.ticket_reads TO service_role;
ALTER TABLE public.ticket_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY ticket_reads_all ON public.ticket_reads FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.touch_ticket_last_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.tickets SET last_message_at = NEW.created_at, updated_at = now() WHERE id = NEW.ticket_id;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.touch_ticket_last_message() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER ticket_messages_touch AFTER INSERT ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_ticket_last_message();