-- Restrict SELECT on form_definitions table to authenticated users
CREATE POLICY form_definitions_select_auth ON form_definitions
FOR SELECT TO authenticated
USING (true);

-- Create a view for public access without email and other private fields
CREATE VIEW public_form_definitions AS
SELECT id, name, slug, fields, settings, submit_action, redirect_url, version FROM form_definitions;
GRANT SELECT ON public_form_definitions TO anon;
