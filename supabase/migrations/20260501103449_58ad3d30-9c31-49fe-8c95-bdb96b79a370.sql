CREATE OR REPLACE FUNCTION public.apply_image_asset_replacements(_job_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  asset RECORD;
  changed_rows INTEGER;
  total_changed INTEGER := 0;
BEGIN
  FOR asset IN
    SELECT id, source_url, public_url
    FROM public.image_assets
    WHERE status = 'done'
      AND public_url IS NOT NULL
      AND source_url IS NOT NULL
      AND (_job_id IS NULL OR job_id = _job_id)
  LOOP
    UPDATE public.imported_posts
    SET
      body = CASE
        WHEN body IS NOT NULL THEN replace(body, asset.source_url, asset.public_url)
        ELSE body
      END,
      featured_image_url = CASE
        WHEN featured_image_url = asset.source_url THEN asset.public_url
        ELSE featured_image_url
      END,
      updated_at = now()
    WHERE
      (body IS NOT NULL AND position(asset.source_url in body) > 0)
      OR featured_image_url = asset.source_url;

    GET DIAGNOSTICS changed_rows = ROW_COUNT;
    total_changed := total_changed + changed_rows;

    UPDATE public.image_assets
    SET replaced_at = COALESCE(replaced_at, now())
    WHERE id = asset.id;
  END LOOP;

  RETURN total_changed;
END;
$$;