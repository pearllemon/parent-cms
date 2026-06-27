-- Restrict SELECT on authors to authenticated users only
CREATE POLICY authors_select_auth ON public.authors
FOR SELECT TO authenticated USING (true);

-- Public view without email column
CREATE VIEW public.public_authors AS
SELECT id, name, bio FROM public.authors;
GRANT SELECT ON public.public_authors TO anon;
