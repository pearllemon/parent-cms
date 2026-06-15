
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'custom_fields','custom_post_types','entry_field_values','page_schemas',
    'post_seo','seo_files','seo_file_versions','link_suggestions',
    'internal_links','media_folders'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Open write '  || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Open update ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Open delete ' || t, t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)',
      t || ' auth insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)',
      t || ' auth update', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL)',
      t || ' auth delete', t);
  END LOOP;
END $$;

DO $$
DECLARE
  pair RECORD;
BEGIN
  FOR pair IN SELECT * FROM (VALUES
    ('taxonomies',          'taxonomies admin write'),
    ('taxonomy_terms',      'taxonomy_terms admin write'),
    ('entry_terms',         'entry_terms admin write'),
    ('template_assignments','tpl_assign_write')
  ) AS v(tbl, pol)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pair.pol, pair.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)',
      pair.tbl || ' auth insert', pair.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)',
      pair.tbl || ' auth update', pair.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL)',
      pair.tbl || ' auth delete', pair.tbl);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "seo_settings_all" ON public.seo_settings;
CREATE POLICY "seo_settings public read"
  ON public.seo_settings FOR SELECT TO public USING (true);
CREATE POLICY "seo_settings auth insert"
  ON public.seo_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "seo_settings auth update"
  ON public.seo_settings FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "seo_settings auth delete"
  ON public.seo_settings FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "user_table_prefs_all" ON public.user_table_prefs;
CREATE POLICY "user_table_prefs auth all"
  ON public.user_table_prefs FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

REVOKE ALL ON public.user_table_prefs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_table_prefs TO authenticated;
GRANT ALL ON public.user_table_prefs TO service_role;

REVOKE SELECT ON public.authors FROM anon;
GRANT SELECT (
  id, slug, name, job_title, bio, profile_image_url, social, seo, schema_json,
  archive_enabled, parent_user_id, created_at, updated_at
) ON public.authors TO anon;
GRANT SELECT ON public.authors TO authenticated;

REVOKE SELECT ON public.site_settings FROM anon;
DO $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'site_settings'
     AND column_name NOT IN ('email_smtp','email_from_address','email_reply_to');
  EXECUTE format('GRANT SELECT (%s) ON public.site_settings TO anon', cols);
END $$;
GRANT SELECT ON public.site_settings TO authenticated;
