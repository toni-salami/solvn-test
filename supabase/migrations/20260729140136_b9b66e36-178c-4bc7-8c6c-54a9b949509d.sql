
CREATE POLICY "storefront_logos_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'storefront-logos');

CREATE POLICY "storefront_logos_seller_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'storefront-logos'
    AND EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.user_id = auth.uid()
        AND (storage.foldername(name))[1] = s.id::text
    )
  );

CREATE POLICY "storefront_logos_seller_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'storefront-logos'
    AND EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.user_id = auth.uid()
        AND (storage.foldername(name))[1] = s.id::text
    )
  );

CREATE POLICY "storefront_logos_seller_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'storefront-logos'
    AND EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.user_id = auth.uid()
        AND (storage.foldername(name))[1] = s.id::text
    )
  );
