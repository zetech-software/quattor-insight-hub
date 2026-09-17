CREATE POLICY ticket_attachments_storage_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ticket-attachments' AND owner = auth.uid());