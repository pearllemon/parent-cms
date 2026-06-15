DROP POLICY IF EXISTS "cms-sdk read" ON storage.objects;
CREATE POLICY "cms-sdk signed-in read"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'cms-sdk'::text);

REVOKE EXECUTE ON FUNCTION public.apply_image_asset_replacements(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_image_asset_replacements(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_image_asset_replacements(uuid) TO service_role;