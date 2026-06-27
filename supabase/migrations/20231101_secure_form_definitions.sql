-- Restrict SELECT on form_definitions table to authenticated users
CREATE POLICY form_definitions_select_auth ON form_definitions
FOR SELECT TO authenticated
USING (true);

-- Create a view for public access without notification_email
CREATE VIEW public_form_definitions AS
SELECT id, form_name, fields FROM form_definitions;
GRANT SELECT ON public_form_definitions TO anon;
