CREATE POLICY ticket_attachments_storage_select ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND (
    public.has_support_access(auth.uid())
    OR public.is_ticket_participant(auth.uid(), NULLIF(split_part(name, '/', 1), '')::uuid)
  )
);
CREATE POLICY ticket_attachments_storage_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND owner = auth.uid()
  AND (
    public.has_support_access(auth.uid())
    OR public.is_ticket_participant(auth.uid(), NULLIF(split_part(name, '/', 1), '')::uuid)
  )
);