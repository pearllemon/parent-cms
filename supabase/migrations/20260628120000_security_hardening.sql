-- =========================================================
-- Security hardening migration
-- =========================================================

-- 1) authors: keep public read, but hide email from anon
REVOKE SELECT ON public.authors FROM anon;
GRANT SELECT (id, slug, name, job_title, profile_image_url, archive_enabled, created_at, updated_at)
  ON public.authors TO anon;

-- 2) site_settings: hide sensitive credential / private columns from anon
REVOKE SELECT ON public.site_settings FROM anon;
GRANT SELECT (
  id, site_id, site_name, tagline, logo_url, logo_dark_url, favicon_url,
  brand_primary, brand_accent, default_meta_title, default_meta_description,
  default_og_image, twitter_handle, plausible_domain,
  perf_lazy_images, perf_preconnect, perf_minify, perf_image_cdn,
  sec_force_https, sec_hsts, sec_csp, sec_referrer_policy, extras,
  created_at, updated_at
) ON public.site_settings TO anon;

-- 3) cms_releases: restrict writes to admin owners
DROP POLICY IF EXISTS "cms_releases auth write" ON public.cms_releases;
CREATE POLICY "cms_releases admin write"
  ON public.cms_releases
  FOR ALL
  TO authenticated
  USING (public.is_admin_owner(auth.uid()))
  WITH CHECK (public.is_admin_owner(auth.uid()));

-- 4) cms_signing_keys: restrict writes to admins; remove public read of full row.
DROP POLICY IF EXISTS "signing_keys auth write" ON public.cms_signing_keys;
DROP POLICY IF EXISTS "signing_keys auth update" ON public.cms_signing_keys;
DROP POLICY IF EXISTS "signing_keys auth delete" ON public.cms_signing_keys;
DROP POLICY IF EXISTS "signing_keys public read" ON public.cms_signing_keys;

CREATE POLICY "signing_keys admin write"
  ON public.cms_signing_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_owner(auth.uid()));
CREATE POLICY "signing_keys admin update"
  ON public.cms_signing_keys
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_owner(auth.uid()))
  WITH CHECK (public.is_admin_owner(auth.uid()));
CREATE POLICY "signing_keys admin delete"
  ON public.cms_signing_keys
  FOR DELETE
  TO authenticated
  USING (public.is_admin_owner(auth.uid()));
CREATE POLICY "signing_keys admin read"
  ON public.cms_signing_keys
  FOR SELECT
  TO authenticated
  USING (public.is_admin_owner(auth.uid()));
REVOKE SELECT ON public.cms_signing_keys FROM anon;

-- 5) revisions: restrict to admin owners
DROP POLICY IF EXISTS "revisions auth all" ON public.revisions;
CREATE POLICY "revisions admin all"
  ON public.revisions
  FOR ALL
  TO authenticated
  USING (public.is_admin_owner(auth.uid()))
  WITH CHECK (public.is_admin_owner(auth.uid()));

-- 6) user_table_prefs: scope by user id (id column stores the user's uuid)
DROP POLICY IF EXISTS "user_table_prefs auth all" ON public.user_table_prefs;
CREATE POLICY "user_table_prefs owner all"
  ON public.user_table_prefs
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 7) Revoke EXECUTE on SECURITY DEFINER functions that should not be exposed
REVOKE EXECUTE ON FUNCTION public.snapshot_cpt_revision() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_owner(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_image_asset_replacements(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.exec_cms_migration(text, text, text, integer, text, text, boolean, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cms_semver_key(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cms_releases_forward_only() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cms_releases_lock_after_sign() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
