-- Restrict SELECT on site_settings to authenticated users
CREATE POLICY site_settings_select_auth ON public.site_settings
FOR SELECT TO authenticated USING (true);
