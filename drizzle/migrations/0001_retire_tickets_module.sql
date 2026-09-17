DROP POLICY IF EXISTS "ticket_attachments_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "ticket_attachments_storage_delete" ON storage.objects;
DROP POLICY IF EXISTS "ticket_attachments_storage_insert" ON storage.objects;

DROP TRIGGER IF EXISTS ticket_messages_touch ON public.ticket_messages;
DROP TRIGGER IF EXISTS tickets_enforce_update ON public.tickets;
DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;

DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update" ON public.tickets;
DROP POLICY IF EXISTS "tickets_delete" ON public.tickets;
DROP POLICY IF EXISTS "ticket_messages_select" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_insert" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_attachments_select" ON public.ticket_attachments;
DROP POLICY IF EXISTS "ticket_attachments_insert" ON public.ticket_attachments;
DROP POLICY IF EXISTS "ticket_reads_all" ON public.ticket_reads;

REVOKE ALL ON public.tickets FROM anon, authenticated;
REVOKE ALL ON public.ticket_messages FROM anon, authenticated;
REVOKE ALL ON public.ticket_attachments FROM anon, authenticated;
REVOKE ALL ON public.ticket_reads FROM anon, authenticated;

DROP FUNCTION IF EXISTS public.touch_ticket_last_message();
DROP FUNCTION IF EXISTS public.enforce_ticket_update_rules();
DROP FUNCTION IF EXISTS public.is_ticket_participant(uuid, uuid);
DROP FUNCTION IF EXISTS public.has_support_access(uuid);