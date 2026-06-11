
CREATE OR REPLACE FUNCTION public.apply_image_asset_replacements(_job_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      AND length(source_url) > 0
      AND (_job_id IS NULL OR job_id = _job_id)
  LOOP
    -- imported_posts: body (HTML), featured_image_url, elementor_data (JSON)
    UPDATE public.imported_posts
    SET
      body = CASE
        WHEN body IS NOT NULL AND position(asset.source_url in body) > 0
          THEN replace(body, asset.source_url, asset.public_url)
        ELSE body
      END,
      featured_image_url = CASE
        WHEN featured_image_url = asset.source_url THEN asset.public_url
        ELSE featured_image_url
      END,
      elementor_data = CASE
        WHEN elementor_data IS NOT NULL
             AND position(asset.source_url in elementor_data::text) > 0
          THEN replace(elementor_data::text, asset.source_url, asset.public_url)::jsonb
        ELSE elementor_data
      END,
      updated_at = now()
    WHERE
      (body IS NOT NULL AND position(asset.source_url in body) > 0)
      OR featured_image_url = asset.source_url
      OR (elementor_data IS NOT NULL AND position(asset.source_url in elementor_data::text) > 0);

    GET DIAGNOSTICS changed_rows = ROW_COUNT;
    total_changed := total_changed + changed_rows;

    -- elementor_templates: data + settings JSON
    UPDATE public.elementor_templates
    SET
      data = CASE
        WHEN data IS NOT NULL AND position(asset.source_url in data::text) > 0
          THEN replace(data::text, asset.source_url, asset.public_url)::jsonb
        ELSE data
      END,
      settings = CASE
        WHEN settings IS NOT NULL AND position(asset.source_url in settings::text) > 0
          THEN replace(settings::text, asset.source_url, asset.public_url)::jsonb
        ELSE settings
      END,
      updated_at = now()
    WHERE
      (data IS NOT NULL AND position(asset.source_url in data::text) > 0)
      OR (settings IS NOT NULL AND position(asset.source_url in settings::text) > 0);

    GET DIAGNOSTICS changed_rows = ROW_COUNT;
    total_changed := total_changed + changed_rows;

    UPDATE public.image_assets
    SET replaced_at = COALESCE(replaced_at, now())
    WHERE id = asset.id;
  END LOOP;

  RETURN total_changed;
END;
$function$;
