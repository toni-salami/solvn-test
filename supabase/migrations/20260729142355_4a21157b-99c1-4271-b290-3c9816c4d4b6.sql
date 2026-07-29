ALTER TABLE public.verification_documents ADD COLUMN IF NOT EXISTS file_path TEXT;

DROP POLICY IF EXISTS "Sellers manage own verification files" ON storage.objects;
CREATE POLICY "Sellers manage own verification files"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND EXISTS (
    SELECT 1 FROM public.sellers s
    WHERE s.user_id = auth.uid()
      AND (storage.foldername(name))[1] = s.id::text
  )
)
WITH CHECK (
  bucket_id = 'verification-documents'
  AND EXISTS (
    SELECT 1 FROM public.sellers s
    WHERE s.user_id = auth.uid()
      AND (storage.foldername(name))[1] = s.id::text
  )
);