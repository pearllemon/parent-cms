
CREATE TABLE IF NOT EXISTS public.entry_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  field_key text NOT NULL,
  value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id, field_key)
);
CREATE INDEX IF NOT EXISTS entry_field_values_entity_idx ON public.entry_field_values(entity_type, entity_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entry_field_values TO authenticated;
GRANT SELECT ON public.entry_field_values TO anon;
GRANT ALL ON public.entry_field_values TO service_role;
ALTER TABLE public.entry_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open read entry_field_values" ON public.entry_field_values FOR SELECT USING (true);
CREATE POLICY "Open write entry_field_values" ON public.entry_field_values FOR INSERT WITH CHECK (true);
CREATE POLICY "Open update entry_field_values" ON public.entry_field_values FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Open delete entry_field_values" ON public.entry_field_values FOR DELETE USING (true);
CREATE TRIGGER trg_entry_field_values_updated BEFORE UPDATE ON public.entry_field_values FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.custom_post_types (slug, label, plural_label, supports, is_public)
VALUES
  ('__global__', 'Global Fields', 'Global Fields', '[]'::jsonb, false),
  ('__entry__',  'Per-Entry Only', 'Per-Entry Only', '[]'::jsonb, false)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.media_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid,
  media_url text NOT NULL,
  file_name text,
  mime_type text,
  size_bytes bigint,
  width int,
  height int,
  alt_text text,
  title text,
  caption text,
  description text,
  folder text DEFAULT 'uncategorized',
  tags text[] DEFAULT '{}',
  source text DEFAULT 'cloud',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, media_url)
);
CREATE INDEX IF NOT EXISTS media_meta_site_idx ON public.media_meta(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS media_meta_folder_idx ON public.media_meta(site_id, folder);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_meta TO authenticated;
GRANT SELECT ON public.media_meta TO anon;
GRANT ALL ON public.media_meta TO service_role;
ALTER TABLE public.media_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open read media_meta" ON public.media_meta FOR SELECT USING (true);
CREATE POLICY "Open write media_meta" ON public.media_meta FOR INSERT WITH CHECK (true);
CREATE POLICY "Open update media_meta" ON public.media_meta FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Open delete media_meta" ON public.media_meta FOR DELETE USING (true);
CREATE TRIGGER trg_media_meta_updated BEFORE UPDATE ON public.media_meta FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.media_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid,
  name text NOT NULL,
  parent_id uuid REFERENCES public.media_folders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, name, parent_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_folders TO authenticated;
GRANT SELECT ON public.media_folders TO anon;
GRANT ALL ON public.media_folders TO service_role;
ALTER TABLE public.media_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open read media_folders" ON public.media_folders FOR SELECT USING (true);
CREATE POLICY "Open write media_folders" ON public.media_folders FOR INSERT WITH CHECK (true);
CREATE POLICY "Open update media_folders" ON public.media_folders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Open delete media_folders" ON public.media_folders FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL UNIQUE,
  site_name text,
  tagline text,
  logo_url text,
  logo_dark_url text,
  favicon_url text,
  brand_primary text,
  brand_accent text,
  default_meta_title text,
  default_meta_description text,
  default_og_image text,
  twitter_handle text,
  facebook_app_id text,
  google_analytics_id text,
  google_tag_manager_id text,
  facebook_pixel_id text,
  plausible_domain text,
  email_from_name text,
  email_from_address text,
  email_reply_to text,
  email_provider text,
  email_smtp jsonb DEFAULT '{}'::jsonb,
  perf_lazy_images boolean DEFAULT true,
  perf_preconnect text[] DEFAULT '{}',
  perf_minify boolean DEFAULT true,
  perf_image_cdn boolean DEFAULT true,
  sec_force_https boolean DEFAULT true,
  sec_hsts boolean DEFAULT false,
  sec_csp text,
  sec_referrer_policy text DEFAULT 'strict-origin-when-cross-origin',
  extras jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT SELECT ON public.site_settings TO anon;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open read site_settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Open write site_settings" ON public.site_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Open update site_settings" ON public.site_settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Open delete site_settings" ON public.site_settings FOR DELETE USING (true);
CREATE TRIGGER trg_site_settings_updated BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid,
  user_id uuid,
  email text NOT NULL,
  display_name text,
  role text NOT NULL DEFAULT 'editor',
  avatar_url text,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_users TO authenticated;
GRANT SELECT ON public.admin_users TO anon;
GRANT ALL ON public.admin_users TO service_role;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open read admin_users" ON public.admin_users FOR SELECT USING (true);
CREATE POLICY "Open write admin_users" ON public.admin_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Open update admin_users" ON public.admin_users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Open delete admin_users" ON public.admin_users FOR DELETE USING (true);
CREATE TRIGGER trg_admin_users_updated BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
