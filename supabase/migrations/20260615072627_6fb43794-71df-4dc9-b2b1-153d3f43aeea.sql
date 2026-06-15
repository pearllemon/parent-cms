DROP POLICY IF EXISTS "Public can read post images" ON storage.objects;
CREATE POLICY "Public can read post image files"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'post-images'::text
  AND lower(name) ~ '\.(png|jpe?g|webp|gif|avif|svg)$'
);