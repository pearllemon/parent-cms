
CREATE POLICY "cms-sdk read" ON storage.objects FOR SELECT
  USING (bucket_id = 'cms-sdk');
CREATE POLICY "cms-sdk write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cms-sdk');
CREATE POLICY "cms-sdk update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cms-sdk');
CREATE POLICY "cms-sdk delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cms-sdk');
