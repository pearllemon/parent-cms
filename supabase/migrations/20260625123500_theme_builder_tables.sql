-- ============================================================
-- Pearl Lemon Theme Builder Tables & Relations Migration
-- ============================================================

-- Timestamp update helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ 1. THEMES ============
CREATE TABLE IF NOT EXISTS public.themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  top_bar_bg TEXT NOT NULL DEFAULT '0 0% 4%',
  top_bar_text TEXT NOT NULL DEFAULT '0 0% 100%',
  nav_bg TEXT NOT NULL DEFAULT '0 0% 100%',
  nav_text TEXT NOT NULL DEFAULT '0 0% 4%',
  logo_bg TEXT NOT NULL DEFAULT '46 100% 49%',
  logo_text TEXT NOT NULL DEFAULT '0 0% 4%',
  cta_bg TEXT NOT NULL DEFAULT '46 100% 49%',
  cta_text TEXT NOT NULL DEFAULT '0 0% 4%',
  cta_border_radius TEXT NOT NULL DEFAULT '4px',
  accent_color TEXT NOT NULL DEFAULT '46 100% 49%',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage themes" ON public.themes;
CREATE POLICY "Authenticated users can manage themes" ON public.themes FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read themes" ON public.themes;
CREATE POLICY "Public read themes" ON public.themes FOR SELECT TO anon USING (true);

DROP TRIGGER IF EXISTS update_themes_updated_at ON public.themes;
CREATE TRIGGER update_themes_updated_at BEFORE UPDATE ON public.themes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 2. CONTACT SETS ============
CREATE TABLE IF NOT EXISTS public.contact_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage contact_sets" ON public.contact_sets;
CREATE POLICY "Authenticated users can manage contact_sets" ON public.contact_sets FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read contact_sets" ON public.contact_sets;
CREATE POLICY "Public read contact_sets" ON public.contact_sets FOR SELECT TO anon USING (true);

DROP TRIGGER IF EXISTS update_contact_sets_updated_at ON public.contact_sets;
CREATE TRIGGER update_contact_sets_updated_at BEFORE UPDATE ON public.contact_sets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 3. PHONE NUMBERS ============
CREATE TABLE IF NOT EXISTS public.phone_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_set_id UUID NOT NULL REFERENCES public.contact_sets(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  number TEXT NOT NULL DEFAULT '',
  dial_code TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0
);
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage phone_numbers" ON public.phone_numbers;
CREATE POLICY "Authenticated users can manage phone_numbers" ON public.phone_numbers FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read phone_numbers" ON public.phone_numbers;
CREATE POLICY "Public read phone_numbers" ON public.phone_numbers FOR SELECT TO anon USING (true);

-- ============ 4. HEADER CONFIGS ============
CREATE TABLE IF NOT EXISTS public.header_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Default Header',
  logo_url TEXT NOT NULL DEFAULT '',
  logo_alt TEXT NOT NULL DEFAULT 'Pearl Lemon',
  tagline TEXT NOT NULL DEFAULT 'FOR WHEN LIFE GIVES YOU..',
  cta_text TEXT NOT NULL DEFAULT 'BOOK A CALL',
  cta_link TEXT NOT NULL DEFAULT '#',
  content_max_width INT NOT NULL DEFAULT 1440,
  show_progress_bar BOOLEAN NOT NULL DEFAULT true,
  transparent_mode BOOLEAN NOT NULL DEFAULT false,
  sticky_header BOOLEAN NOT NULL DEFAULT true,
  theme_id UUID REFERENCES public.themes(id) ON DELETE SET NULL,
  contact_set_id UUID REFERENCES public.contact_sets(id) ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.header_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage header_configs" ON public.header_configs;
CREATE POLICY "Authenticated users can manage header_configs" ON public.header_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read header_configs" ON public.header_configs;
CREATE POLICY "Public read header_configs" ON public.header_configs FOR SELECT TO anon USING (true);

DROP TRIGGER IF EXISTS update_header_configs_updated_at ON public.header_configs;
CREATE TRIGGER update_header_configs_updated_at BEFORE UPDATE ON public.header_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 5. NAV ITEMS ============
CREATE TABLE IF NOT EXISTS public.nav_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  header_config_id UUID NOT NULL REFERENCES public.header_configs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  href TEXT DEFAULT '#',
  has_dropdown BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0
);
ALTER TABLE public.nav_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage nav_items" ON public.nav_items;
CREATE POLICY "Authenticated users can manage nav_items" ON public.nav_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read nav_items" ON public.nav_items;
CREATE POLICY "Public read nav_items" ON public.nav_items FOR SELECT TO anon USING (true);

-- ============ 6. MEGA MENU COLUMNS ============
CREATE TABLE IF NOT EXISTS public.mega_menu_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nav_item_id UUID NOT NULL REFERENCES public.nav_items(id) ON DELETE CASCADE,
  heading TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0
);
ALTER TABLE public.mega_menu_columns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage mega_menu_columns" ON public.mega_menu_columns;
CREATE POLICY "Authenticated users can manage mega_menu_columns" ON public.mega_menu_columns FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read mega_menu_columns" ON public.mega_menu_columns;
CREATE POLICY "Public read mega_menu_columns" ON public.mega_menu_columns FOR SELECT TO anon USING (true);

-- ============ 7. MEGA MENU LINKS ============
CREATE TABLE IF NOT EXISTS public.mega_menu_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  column_id UUID NOT NULL REFERENCES public.mega_menu_columns(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  href TEXT NOT NULL DEFAULT '#',
  sort_order INT NOT NULL DEFAULT 0
);
ALTER TABLE public.mega_menu_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage mega_menu_links" ON public.mega_menu_links;
CREATE POLICY "Authenticated users can manage mega_menu_links" ON public.mega_menu_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read mega_menu_links" ON public.mega_menu_links;
CREATE POLICY "Public read mega_menu_links" ON public.mega_menu_links FOR SELECT TO anon USING (true);

-- ============ 8. FOOTER CONFIGS ============
CREATE TABLE IF NOT EXISTS public.footer_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Default Footer',
  logo_url text NOT NULL DEFAULT '',
  logo_alt text NOT NULL DEFAULT 'Pearl Lemon',
  description text NOT NULL DEFAULT '',
  copyright_text text NOT NULL DEFAULT '© 2026. All Rights Reserved',
  company_info text NOT NULL DEFAULT '',
  map_embed_url text NOT NULL DEFAULT '',
  show_map boolean NOT NULL DEFAULT false,
  show_locations boolean NOT NULL DEFAULT false,
  show_form boolean NOT NULL DEFAULT true,
  form_heading text NOT NULL DEFAULT 'Get In Touch',
  contact_set_id uuid REFERENCES public.contact_sets(id) ON DELETE SET NULL,
  theme_id uuid REFERENCES public.themes(id) ON DELETE SET NULL,
  bg_color text NOT NULL DEFAULT '0 0% 4%',
  text_color text NOT NULL DEFAULT '0 0% 100%',
  accent_color text NOT NULL DEFAULT '46 100% 49%',
  link_color text NOT NULL DEFAULT '46 100% 49%',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.footer_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage footer_configs" ON public.footer_configs;
CREATE POLICY "Auth manage footer_configs" ON public.footer_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read footer_configs" ON public.footer_configs;
CREATE POLICY "Public read footer_configs" ON public.footer_configs FOR SELECT TO anon USING (true);

DROP TRIGGER IF EXISTS update_footer_configs_updated_at ON public.footer_configs;
CREATE TRIGGER update_footer_configs_updated_at BEFORE UPDATE ON public.footer_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 9. FOOTER COLUMNS ============
CREATE TABLE IF NOT EXISTS public.footer_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  footer_config_id uuid NOT NULL REFERENCES public.footer_configs(id) ON DELETE CASCADE,
  heading text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE public.footer_columns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage footer_columns" ON public.footer_columns;
CREATE POLICY "Auth manage footer_columns" ON public.footer_columns FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read footer_columns" ON public.footer_columns;
CREATE POLICY "Public read footer_columns" ON public.footer_columns FOR SELECT TO anon USING (true);

-- ============ 10. FOOTER LINKS ============
CREATE TABLE IF NOT EXISTS public.footer_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id uuid NOT NULL REFERENCES public.footer_columns(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  href text NOT NULL DEFAULT '#',
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE public.footer_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage footer_links" ON public.footer_links;
CREATE POLICY "Auth manage footer_links" ON public.footer_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read footer_links" ON public.footer_links;
CREATE POLICY "Public read footer_links" ON public.footer_links FOR SELECT TO anon USING (true);

-- ============ 11. FOOTER SOCIAL LINKS ============
CREATE TABLE IF NOT EXISTS public.footer_social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  footer_config_id uuid NOT NULL REFERENCES public.footer_configs(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '#',
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE public.footer_social_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage footer_social_links" ON public.footer_social_links;
CREATE POLICY "Auth manage footer_social_links" ON public.footer_social_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read footer_social_links" ON public.footer_social_links;
CREATE POLICY "Public read footer_social_links" ON public.footer_social_links FOR SELECT TO anon USING (true);

-- ============ 12. FOOTER LOCATIONS ============
CREATE TABLE IF NOT EXISTS public.footer_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  footer_config_id uuid NOT NULL REFERENCES public.footer_configs(id) ON DELETE CASCADE,
  country text NOT NULL DEFAULT '',
  flag_emoji text NOT NULL DEFAULT '',
  cities text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE public.footer_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage footer_locations" ON public.footer_locations;
CREATE POLICY "Auth manage footer_locations" ON public.footer_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read footer_locations" ON public.footer_locations;
CREATE POLICY "Public read footer_locations" ON public.footer_locations FOR SELECT TO anon USING (true);

-- ============ 13. FOOTER BOTTOM LINKS ============
CREATE TABLE IF NOT EXISTS public.footer_bottom_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  footer_config_id uuid NOT NULL REFERENCES public.footer_configs(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  href text NOT NULL DEFAULT '#',
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE public.footer_bottom_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage footer_bottom_links" ON public.footer_bottom_links;
CREATE POLICY "Auth manage footer_bottom_links" ON public.footer_bottom_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read footer_bottom_links" ON public.footer_bottom_links;
CREATE POLICY "Public read footer_bottom_links" ON public.footer_bottom_links FOR SELECT TO anon USING (true);

-- ============ 14. ERROR PAGE CONFIGS ============
CREATE TABLE IF NOT EXISTS public.error_page_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT 'Default 404',
  heading text NOT NULL DEFAULT 'Oooops...',
  subheading text NOT NULL DEFAULT 'Page not found',
  description text NOT NULL DEFAULT 'The page you are looking for doesn''t exist or other error occurred.',
  image_url text NOT NULL DEFAULT '',
  show_search boolean NOT NULL DEFAULT true,
  show_lead_form boolean NOT NULL DEFAULT true,
  search_placeholder text NOT NULL DEFAULT 'What page you were looking for?',
  cta_text text NOT NULL DEFAULT 'Go Back to Homepage',
  bg_color text NOT NULL DEFAULT '0 0% 100%',
  text_color text NOT NULL DEFAULT '0 0% 15%',
  accent_color text NOT NULL DEFAULT '46 100% 49%',
  theme_id uuid REFERENCES public.themes(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.error_page_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage error_page_configs" ON public.error_page_configs;
CREATE POLICY "Auth manage error_page_configs" ON public.error_page_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read error_page_configs" ON public.error_page_configs;
CREATE POLICY "Public read error_page_configs" ON public.error_page_configs FOR SELECT TO anon USING (true);

DROP TRIGGER IF EXISTS update_error_page_configs_updated_at ON public.error_page_configs;
CREATE TRIGGER update_error_page_configs_updated_at BEFORE UPDATE ON public.error_page_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 15. POPUP CONFIGS ============
CREATE TABLE IF NOT EXISTS public.popup_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT 'Default Popup',
  category text NOT NULL DEFAULT 'general',
  heading text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  cta_text text NOT NULL DEFAULT 'Yes, Let''s Get Started!',
  cta_link text NOT NULL DEFAULT '#',
  dismiss_text text NOT NULL DEFAULT 'Thanks, I''ll Be Back Later!',
  bg_color text NOT NULL DEFAULT '0 0% 100%',
  text_color text NOT NULL DEFAULT '0 0% 15%',
  accent_color text NOT NULL DEFAULT '46 100% 49%',
  border_radius text NOT NULL DEFAULT '16px',
  trigger_type text NOT NULL DEFAULT 'exit_intent',
  trigger_delay_seconds integer NOT NULL DEFAULT 5,
  show_once_per_session boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.popup_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage popup_configs" ON public.popup_configs;
CREATE POLICY "Auth manage popup_configs" ON public.popup_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read popup_configs" ON public.popup_configs;
CREATE POLICY "Public read popup_configs" ON public.popup_configs FOR SELECT TO anon USING (true);

DROP TRIGGER IF EXISTS update_popup_configs_updated_at ON public.popup_configs;
CREATE TRIGGER update_popup_configs_updated_at BEFORE UPDATE ON public.popup_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 16. POPUP EVENTS ============
CREATE TABLE IF NOT EXISTS public.popup_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  popup_id uuid NOT NULL REFERENCES public.popup_configs(id) ON DELETE CASCADE,
  site_id uuid REFERENCES public.child_installations(id) ON DELETE SET NULL,
  event_type text NOT NULL DEFAULT 'impression',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.popup_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth read popup_events" ON public.popup_events;
CREATE POLICY "Auth read popup_events" ON public.popup_events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Public insert popup_events" ON public.popup_events;
CREATE POLICY "Public insert popup_events" ON public.popup_events FOR INSERT TO anon WITH CHECK (true);

-- ============ 17. TEAM MEMBERS ============
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT 'general',
  bio text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  linkedin_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_head boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage team_members" ON public.team_members;
CREATE POLICY "Auth manage team_members" ON public.team_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read team_members" ON public.team_members;
CREATE POLICY "Public read team_members" ON public.team_members FOR SELECT TO anon USING (true);

DROP TRIGGER IF EXISTS update_team_members_updated_at ON public.team_members;
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 18. SITE TEAM ASSIGNMENTS ============
CREATE TABLE IF NOT EXISTS public.site_team_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.child_installations(id) ON DELETE CASCADE,
  department text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_team_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage site_team_assignments" ON public.site_team_assignments;
CREATE POLICY "Auth manage site_team_assignments" ON public.site_team_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read site_team_assignments" ON public.site_team_assignments;
CREATE POLICY "Public read site_team_assignments" ON public.site_team_assignments FOR SELECT TO anon USING (true);

-- ============ 19. BOOKING PAGE CONFIGS ============
CREATE TABLE IF NOT EXISTS public.booking_page_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES public.child_installations(id) ON DELETE CASCADE,
  calendar_embed_code text NOT NULL DEFAULT '',
  heading text NOT NULL DEFAULT 'Book A Call',
  subheading text NOT NULL DEFAULT 'Schedule a meeting with our team',
  team_heading text NOT NULL DEFAULT 'Meet Our Team',
  team_description text NOT NULL DEFAULT '',
  custom_sections_html text NOT NULL DEFAULT '',
  is_global boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_page_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage booking_page_configs" ON public.booking_page_configs;
CREATE POLICY "Auth manage booking_page_configs" ON public.booking_page_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read booking_page_configs" ON public.booking_page_configs;
CREATE POLICY "Public read booking_page_configs" ON public.booking_page_configs FOR SELECT TO anon USING (true);

DROP TRIGGER IF EXISTS update_booking_page_configs_updated_at ON public.booking_page_configs;
CREATE TRIGGER update_booking_page_configs_updated_at BEFORE UPDATE ON public.booking_page_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 20. SERVICES ============
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES public.child_installations(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  feature_image_url text NOT NULL DEFAULT '',
  visit_link text NOT NULL DEFAULT '#',
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage services" ON public.services;
CREATE POLICY "Auth manage services" ON public.services FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read services" ON public.services;
CREATE POLICY "Public read services" ON public.services FOR SELECT TO anon USING (true);

DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 21. CASE STUDIES ============
CREATE TABLE IF NOT EXISTS public.case_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES public.child_installations(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  results text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  video_url text NOT NULL DEFAULT '',
  visit_link text NOT NULL DEFAULT '#',
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.case_studies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage case_studies" ON public.case_studies;
CREATE POLICY "Auth manage case_studies" ON public.case_studies FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read case_studies" ON public.case_studies;
CREATE POLICY "Public read case_studies" ON public.case_studies FOR SELECT TO anon USING (true);

DROP TRIGGER IF EXISTS update_case_studies_updated_at ON public.case_studies;
CREATE TRIGGER update_case_studies_updated_at BEFORE UPDATE ON public.case_studies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 22. TESTIMONIAL CONFIGS ============
CREATE TABLE IF NOT EXISTS public.testimonial_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Testimonials',
  heading TEXT NOT NULL DEFAULT 'Testimonial',
  subheading TEXT NOT NULL DEFAULT '',
  theme_mode TEXT NOT NULL DEFAULT 'dark',
  accent_color TEXT NOT NULL DEFAULT '#a855f7',
  bg_color TEXT NOT NULL DEFAULT '#1a1a2e',
  text_color TEXT NOT NULL DEFAULT '#ffffff',
  auto_play BOOLEAN NOT NULL DEFAULT true,
  auto_play_interval INTEGER NOT NULL DEFAULT 5000,
  cards_per_view INTEGER NOT NULL DEFAULT 3,
  show_rating BOOLEAN NOT NULL DEFAULT true,
  show_avatar BOOLEAN NOT NULL DEFAULT true,
  show_arrows BOOLEAN NOT NULL DEFAULT true,
  show_dots BOOLEAN NOT NULL DEFAULT true,
  is_global BOOLEAN NOT NULL DEFAULT true,
  site_id UUID REFERENCES public.child_installations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.testimonial_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users manage testimonial_configs" ON public.testimonial_configs;
CREATE POLICY "Authenticated users manage testimonial_configs" ON public.testimonial_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_testimonial_configs_updated_at ON public.testimonial_configs;
CREATE TRIGGER update_testimonial_configs_updated_at BEFORE UPDATE ON public.testimonial_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 23. TESTIMONIAL ITEMS ============
CREATE TABLE IF NOT EXISTS public.testimonial_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES public.testimonial_configs(id) ON DELETE CASCADE,
  quote TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '',
  author_role TEXT NOT NULL DEFAULT '',
  author_image_url TEXT NOT NULL DEFAULT '',
  rating INTEGER NOT NULL DEFAULT 5,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.testimonial_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users manage testimonial_items" ON public.testimonial_items;
CREATE POLICY "Authenticated users manage testimonial_items" ON public.testimonial_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ 24. STATS CONFIGS ============
CREATE TABLE IF NOT EXISTS public.stats_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Stats Section',
  heading TEXT NOT NULL DEFAULT 'We only deliver results.',
  subheading TEXT NOT NULL DEFAULT '',
  theme_mode TEXT NOT NULL DEFAULT 'light',
  accent_color TEXT NOT NULL DEFAULT '#000000',
  bg_color TEXT NOT NULL DEFAULT '#ffffff',
  text_color TEXT NOT NULL DEFAULT '#000000',
  layout_style TEXT NOT NULL DEFAULT 'grid',
  show_description BOOLEAN NOT NULL DEFAULT true,
  show_cta BOOLEAN NOT NULL DEFAULT false,
  cta_text TEXT NOT NULL DEFAULT 'Get Started',
  cta_link TEXT NOT NULL DEFAULT '#',
  is_global BOOLEAN NOT NULL DEFAULT true,
  site_id UUID REFERENCES public.child_installations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stats_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users manage stats_configs" ON public.stats_configs;
CREATE POLICY "Authenticated users manage stats_configs" ON public.stats_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_stats_configs_updated_at ON public.stats_configs;
CREATE TRIGGER update_stats_configs_updated_at BEFORE UPDATE ON public.stats_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 25. STATS ITEMS ============
CREATE TABLE IF NOT EXISTS public.stats_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES public.stats_configs(id) ON DELETE CASCADE,
  value TEXT NOT NULL DEFAULT '0',
  label TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  icon_name TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stats_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users manage stats_items" ON public.stats_items;
CREATE POLICY "Authenticated users manage stats_items" ON public.stats_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ 26. WIDGET / CHAT CONFIGS ============
CREATE TABLE IF NOT EXISTS public.whatsapp_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Default WhatsApp',
  phone_number TEXT NOT NULL DEFAULT '',
  welcome_message TEXT DEFAULT '',
  position TEXT DEFAULT 'right',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage whatsapp_configs" ON public.whatsapp_configs;
CREATE POLICY "Auth manage whatsapp_configs" ON public.whatsapp_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.site_whatsapp_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.child_installations(id) ON DELETE CASCADE,
  whatsapp_config_id UUID NOT NULL REFERENCES public.whatsapp_configs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_whatsapp_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage site_whatsapp_assignments" ON public.site_whatsapp_assignments;
CREATE POLICY "Auth manage site_whatsapp_assignments" ON public.site_whatsapp_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.crisp_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Default Crisp',
  website_id TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crisp_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage crisp_configs" ON public.crisp_configs;
CREATE POLICY "Auth manage crisp_configs" ON public.crisp_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.site_crisp_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.child_installations(id) ON DELETE CASCADE,
  crisp_config_id UUID NOT NULL REFERENCES public.crisp_configs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_crisp_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage site_crisp_assignments" ON public.site_crisp_assignments;
CREATE POLICY "Auth manage site_crisp_assignments" ON public.site_crisp_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.ycbm_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Default Calendar',
  link TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ycbm_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage ycbm_configs" ON public.ycbm_configs;
CREATE POLICY "Auth manage ycbm_configs" ON public.ycbm_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.site_ycbm_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.child_installations(id) ON DELETE CASCADE,
  ycbm_config_id UUID NOT NULL REFERENCES public.ycbm_configs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_ycbm_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage site_ycbm_assignments" ON public.site_ycbm_assignments;
CREATE POLICY "Auth manage site_ycbm_assignments" ON public.site_ycbm_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.gmail_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Google Workspace',
  client_email TEXT DEFAULT '',
  private_key TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gmail_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage gmail_configs" ON public.gmail_configs;
CREATE POLICY "Auth manage gmail_configs" ON public.gmail_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.site_gmail_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.child_installations(id) ON DELETE CASCADE,
  gmail_config_id UUID NOT NULL REFERENCES public.gmail_configs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_gmail_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage site_gmail_assignments" ON public.site_gmail_assignments;
CREATE POLICY "Auth manage site_gmail_assignments" ON public.site_gmail_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.webhook_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service TEXT NOT NULL,
  webhook_url TEXT DEFAULT '',
  webhook_secret TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage webhook_configs" ON public.webhook_configs;
CREATE POLICY "Auth manage webhook_configs" ON public.webhook_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ 27. ALTER SITES TABLE (child_installations) ============
ALTER TABLE public.child_installations 
  ADD COLUMN IF NOT EXISTS header_config_id UUID REFERENCES public.header_configs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS footer_config_id UUID REFERENCES public.footer_configs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS error_page_config_id UUID REFERENCES public.error_page_configs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS popup_config_id UUID REFERENCES public.popup_configs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS logo_light_url TEXT DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS logo_dark_url TEXT DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS booking_link TEXT DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS font_heading TEXT DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS font_body TEXT DEFAULT '' NOT NULL;

-- Enable Realtime for configs
ALTER PUBLICATION supabase_realtime ADD TABLE public.testimonial_configs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stats_configs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.header_configs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.footer_configs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.error_page_configs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.popup_configs;
