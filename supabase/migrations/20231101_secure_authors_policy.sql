-- Restrict SELECT on authors table to authenticated users
CREATE POLICY authors_select_auth ON authors
FOR SELECT TO authenticated
USING (true);

-- Create a view for public access without email
CREATE VIEW public_authors AS
SELECT id, name, bio FROM authors;
GRANT SELECT ON public_authors TO anon;
