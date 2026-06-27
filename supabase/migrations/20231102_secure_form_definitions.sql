-- Restrict SELECT on form_definitions to authenticated users
CREATE POLICY form_definitions_select_auth ON public.form_definitions
FOR SELECT TO authenticated USING (true);

-- Public view without notification_email
CREATE VIEW public.public_form_definitions AS
SELECT id, form_name, fields FROM public.form_definitions;
GRANT SELECT ON public.public_form_definitions TO anon;
