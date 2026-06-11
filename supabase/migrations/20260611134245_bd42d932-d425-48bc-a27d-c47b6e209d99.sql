
-- 1. imported_posts: restrict public SELECT to published only
DROP POLICY IF EXISTS "Imported posts are viewable by everyone" ON public.imported_posts;
CREATE POLICY "Public can read published posts"
  ON public.imported_posts FOR SELECT TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "Authenticated users can delete imported posts" ON public.imported_posts;
DROP POLICY IF EXISTS "Authenticated users can insert imported posts" ON public.imported_posts;
DROP POLICY IF EXISTS "Authenticated users can update imported posts" ON public.imported_posts;
CREATE POLICY "Auth delete imported posts" ON public.imported_posts FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert imported posts" ON public.imported_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update imported posts" ON public.imported_posts FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 2. import_history: remove public SELECT
DROP POLICY IF EXISTS "Import history viewable by everyone" ON public.import_history;
DROP POLICY IF EXISTS "Authenticated can delete import history" ON public.import_history;
DROP POLICY IF EXISTS "Authenticated can insert import history" ON public.import_history;
CREATE POLICY "Auth read import history" ON public.import_history FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert import history" ON public.import_history FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete import history" ON public.import_history FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 3. image_import_jobs: remove public SELECT
DROP POLICY IF EXISTS "Jobs are viewable by everyone" ON public.image_import_jobs;
DROP POLICY IF EXISTS "Authenticated can delete jobs" ON public.image_import_jobs;
DROP POLICY IF EXISTS "Authenticated can insert jobs" ON public.image_import_jobs;
DROP POLICY IF EXISTS "Authenticated can update jobs" ON public.image_import_jobs;
CREATE POLICY "Auth read jobs" ON public.image_import_jobs FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert jobs" ON public.image_import_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update jobs" ON public.image_import_jobs FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete jobs" ON public.image_import_jobs FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 4. image_assets: remove public SELECT (operational metadata)
DROP POLICY IF EXISTS "Assets are viewable by everyone" ON public.image_assets;
DROP POLICY IF EXISTS "Authenticated can delete assets" ON public.image_assets;
DROP POLICY IF EXISTS "Authenticated can insert assets" ON public.image_assets;
DROP POLICY IF EXISTS "Authenticated can update assets" ON public.image_assets;
CREATE POLICY "Auth read assets" ON public.image_assets FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert assets" ON public.image_assets FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update assets" ON public.image_assets FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete assets" ON public.image_assets FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 5. Tighten other "USING (true)" write policies flagged by linter
DROP POLICY IF EXISTS "Auth manage fields" ON public.custom_fields;
CREATE POLICY "Auth manage fields" ON public.custom_fields FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Auth delete entries" ON public.cpt_entries;
DROP POLICY IF EXISTS "Auth insert entries" ON public.cpt_entries;
DROP POLICY IF EXISTS "Auth update entries" ON public.cpt_entries;
CREATE POLICY "Auth delete entries" ON public.cpt_entries FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert entries" ON public.cpt_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update entries" ON public.cpt_entries FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Auth manage revisions" ON public.revisions;
CREATE POLICY "Auth manage revisions" ON public.revisions FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "auth insert sync_events" ON public.sync_events;
CREATE POLICY "auth insert sync_events" ON public.sync_events FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "auth write sync_settings" ON public.sync_settings;
CREATE POLICY "auth write sync_settings" ON public.sync_settings FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "auth write sync_queue" ON public.sync_queue;
CREATE POLICY "auth write sync_queue" ON public.sync_queue FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "auth write sync_conflicts" ON public.sync_conflicts;
CREATE POLICY "auth write sync_conflicts" ON public.sync_conflicts FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "auth write sync_health" ON public.sync_health;
CREATE POLICY "auth write sync_health" ON public.sync_health FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "elementor_templates auth delete" ON public.elementor_templates;
DROP POLICY IF EXISTS "elementor_templates auth insert" ON public.elementor_templates;
DROP POLICY IF EXISTS "elementor_templates auth update" ON public.elementor_templates;
CREATE POLICY "elementor_templates auth delete" ON public.elementor_templates FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "elementor_templates auth insert" ON public.elementor_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "elementor_templates auth update" ON public.elementor_templates FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated manage schemas" ON public.page_schemas;
CREATE POLICY "Authenticated manage schemas" ON public.page_schemas FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "seo_files write auth" ON public.seo_files;
CREATE POLICY "seo_files write auth" ON public.seo_files FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated manage link_suggestions" ON public.link_suggestions;
CREATE POLICY "Authenticated manage link_suggestions" ON public.link_suggestions FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated manage internal_links" ON public.internal_links;
CREATE POLICY "Authenticated manage internal_links" ON public.internal_links FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "elementor_site_settings auth delete" ON public.elementor_site_settings;
DROP POLICY IF EXISTS "elementor_site_settings auth insert" ON public.elementor_site_settings;
DROP POLICY IF EXISTS "elementor_site_settings auth update" ON public.elementor_site_settings;
CREATE POLICY "elementor_site_settings auth delete" ON public.elementor_site_settings FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "elementor_site_settings auth insert" ON public.elementor_site_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "elementor_site_settings auth update" ON public.elementor_site_settings FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "seo_versions write auth" ON public.seo_file_versions;
CREATE POLICY "seo_versions write auth" ON public.seo_file_versions FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Auth manage CPTs" ON public.custom_post_types;
CREATE POLICY "Auth manage CPTs" ON public.custom_post_types FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.snapshot_cpt_revision() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_image_asset_replacements(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_image_asset_replacements(uuid) TO authenticated, service_role;
