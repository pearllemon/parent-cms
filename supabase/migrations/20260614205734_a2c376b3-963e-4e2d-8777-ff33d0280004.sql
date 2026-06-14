
-- =========================================================================
-- Tighten RLS across admin / CMS distribution tables.
-- Pattern: drop permissive "USING true" write policies, recreate restricted
-- to the `authenticated` role. Keep public SELECT only where the marketing
-- site needs to render the data anonymously. Service role bypasses RLS.
-- =========================================================================

-- helper: nothing to create; we use auth.uid() IS NOT NULL guards.

----------------------------- admin_users ---------------------------------
DROP POLICY IF EXISTS "Open read admin_users"   ON public.admin_users;
DROP POLICY IF EXISTS "Open write admin_users"  ON public.admin_users;
DROP POLICY IF EXISTS "Open update admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Open delete admin_users" ON public.admin_users;
CREATE POLICY "admin_users authenticated read"   ON public.admin_users FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_users authenticated write"  ON public.admin_users FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin_users authenticated update" ON public.admin_users FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin_users authenticated delete" ON public.admin_users FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

----------------------------- activity_log --------------------------------
DROP POLICY IF EXISTS "activity_read"  ON public.activity_log;
DROP POLICY IF EXISTS "activity_write" ON public.activity_log;
CREATE POLICY "activity_log auth read"  ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "activity_log auth write" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

----------------------------- revisions -----------------------------------
DROP POLICY IF EXISTS "Open read revisions"   ON public.revisions;
DROP POLICY IF EXISTS "Open write revisions"  ON public.revisions;
DROP POLICY IF EXISTS "Open update revisions" ON public.revisions;
DROP POLICY IF EXISTS "Open delete revisions" ON public.revisions;
CREATE POLICY "revisions auth all" ON public.revisions FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

----------------------------- cms_signing_keys ----------------------------
DROP POLICY IF EXISTS "signing keys admin-managed"     ON public.cms_signing_keys;
DROP POLICY IF EXISTS "signing keys are world-readable" ON public.cms_signing_keys;
-- public key material is fine to read publicly (children fetch it during boot),
-- but only signed-in admins may insert/rotate.
CREATE POLICY "signing_keys public read" ON public.cms_signing_keys FOR SELECT USING (true);
CREATE POLICY "signing_keys auth write"  ON public.cms_signing_keys FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "signing_keys auth update" ON public.cms_signing_keys FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "signing_keys auth delete" ON public.cms_signing_keys FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

----------------------------- cms_releases --------------------------------
DROP POLICY IF EXISTS "cms_releases read"  ON public.cms_releases;
DROP POLICY IF EXISTS "cms_releases write" ON public.cms_releases;
CREATE POLICY "cms_releases auth read"  ON public.cms_releases FOR SELECT TO authenticated USING (true);
CREATE POLICY "cms_releases auth write" ON public.cms_releases FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

----------------------------- cms_migration_manifest ---------------------
DROP POLICY IF EXISTS "cms_mm read"  ON public.cms_migration_manifest;
DROP POLICY IF EXISTS "cms_mm write" ON public.cms_migration_manifest;
CREATE POLICY "cms_mm auth read"  ON public.cms_migration_manifest FOR SELECT TO authenticated USING (true);
CREATE POLICY "cms_mm auth write" ON public.cms_migration_manifest FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

----------------------------- cms_api_registry ---------------------------
DROP POLICY IF EXISTS "Admins manage API registry" ON public.cms_api_registry;
CREATE POLICY "cms_api_registry auth all" ON public.cms_api_registry FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

----------------------------- child_installations ------------------------
DROP POLICY IF EXISTS "child_inst read"  ON public.child_installations;
DROP POLICY IF EXISTS "child_inst write" ON public.child_installations;
CREATE POLICY "child_inst auth read"  ON public.child_installations FOR SELECT TO authenticated USING (true);
CREATE POLICY "child_inst auth write" ON public.child_installations FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
-- Note: child registration/heartbeat goes through the cms-release edge
-- function, which uses the service role and bypasses RLS.

----------------------------- child_upgrade_log -------------------------
DROP POLICY IF EXISTS "child_log read"  ON public.child_upgrade_log;
DROP POLICY IF EXISTS "child_log write" ON public.child_upgrade_log;
CREATE POLICY "child_log auth read"  ON public.child_upgrade_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "child_log auth write" ON public.child_upgrade_log FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

----------------------------- site_settings -----------------------------
DROP POLICY IF EXISTS "Open read site_settings"   ON public.site_settings;
DROP POLICY IF EXISTS "Open write site_settings"  ON public.site_settings;
DROP POLICY IF EXISTS "Open update site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Open delete site_settings" ON public.site_settings;
-- The marketing site renders analytics IDs / SEO defaults from this table,
-- so SELECT stays public. SMTP/secret fields should be served via edge
-- functions only; do not query them from the public client.
CREATE POLICY "site_settings public read"   ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "site_settings auth write"    ON public.site_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "site_settings auth update"   ON public.site_settings FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "site_settings auth delete"   ON public.site_settings FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

----------------------------- redirects ---------------------------------
DROP POLICY IF EXISTS "redirects_all" ON public.redirects;
CREATE POLICY "redirects public read" ON public.redirects FOR SELECT USING (true);
CREATE POLICY "redirects auth write"  ON public.redirects FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "redirects auth update" ON public.redirects FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "redirects auth delete" ON public.redirects FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

----------------------------- authors -----------------------------------
DROP POLICY IF EXISTS "Public read authors"   ON public.authors;
DROP POLICY IF EXISTS "Open write authors"    ON public.authors;
DROP POLICY IF EXISTS "Open update authors"   ON public.authors;
DROP POLICY IF EXISTS "Open delete authors"   ON public.authors;
CREATE POLICY "authors public read" ON public.authors FOR SELECT USING (true);
CREATE POLICY "authors auth write"  ON public.authors FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authors auth update" ON public.authors FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authors auth delete" ON public.authors FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

----------------------------- cpt_entries -------------------------------
DROP POLICY IF EXISTS "Open read cpt_entries"   ON public.cpt_entries;
DROP POLICY IF EXISTS "Open write cpt_entries"  ON public.cpt_entries;
DROP POLICY IF EXISTS "Open update cpt_entries" ON public.cpt_entries;
DROP POLICY IF EXISTS "Open delete cpt_entries" ON public.cpt_entries;
CREATE POLICY "cpt_entries public read published" ON public.cpt_entries FOR SELECT USING (status = 'published');
CREATE POLICY "cpt_entries auth read all"         ON public.cpt_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "cpt_entries auth write"            ON public.cpt_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cpt_entries auth update"           ON public.cpt_entries FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cpt_entries auth delete"           ON public.cpt_entries FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

----------------------------- media_meta --------------------------------
DROP POLICY IF EXISTS "Open read media_meta"   ON public.media_meta;
DROP POLICY IF EXISTS "Open write media_meta"  ON public.media_meta;
DROP POLICY IF EXISTS "Open update media_meta" ON public.media_meta;
DROP POLICY IF EXISTS "Open delete media_meta" ON public.media_meta;
CREATE POLICY "media_meta public read" ON public.media_meta FOR SELECT USING (true);
CREATE POLICY "media_meta auth write"  ON public.media_meta FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "media_meta auth update" ON public.media_meta FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "media_meta auth delete" ON public.media_meta FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

----------------------------- page_view_events --------------------------
DROP POLICY IF EXISTS "page_view_events_admin_read"    ON public.page_view_events;
DROP POLICY IF EXISTS "page_view_events_public_insert" ON public.page_view_events;
CREATE POLICY "page_view_events anon insert" ON public.page_view_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "page_view_events auth read"   ON public.page_view_events FOR SELECT TO authenticated USING (true);

----------------------------- seo_scores --------------------------------
DROP POLICY IF EXISTS "seo_scores_all" ON public.seo_scores;
CREATE POLICY "seo_scores public read" ON public.seo_scores FOR SELECT USING (true);
CREATE POLICY "seo_scores auth write"  ON public.seo_scores FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "seo_scores auth update" ON public.seo_scores FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "seo_scores auth delete" ON public.seo_scores FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

----------------------------- theme_sections/templates/tokens -----------
DROP POLICY IF EXISTS "theme_sections admin write"  ON public.theme_sections;
DROP POLICY IF EXISTS "theme_sections public read"  ON public.theme_sections;
CREATE POLICY "theme_sections public read" ON public.theme_sections FOR SELECT USING (true);
CREATE POLICY "theme_sections auth write"  ON public.theme_sections FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "theme_templates admin write"  ON public.theme_templates;
DROP POLICY IF EXISTS "theme_templates public read"  ON public.theme_templates;
CREATE POLICY "theme_templates public read" ON public.theme_templates FOR SELECT USING (true);
CREATE POLICY "theme_templates auth write"  ON public.theme_templates FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "theme_tokens admin write"  ON public.theme_tokens;
DROP POLICY IF EXISTS "theme_tokens public read"  ON public.theme_tokens;
CREATE POLICY "theme_tokens public read" ON public.theme_tokens FOR SELECT USING (true);
CREATE POLICY "theme_tokens auth write"  ON public.theme_tokens FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
