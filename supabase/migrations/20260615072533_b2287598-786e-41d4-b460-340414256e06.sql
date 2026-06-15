DROP POLICY IF EXISTS "leads anon insert" ON public.leads;
DROP POLICY IF EXISTS "leads authenticated insert" ON public.leads;
DROP POLICY IF EXISTS "page_view_events anon insert" ON public.page_view_events;

CREATE POLICY "leads anon insert validated"
ON public.leads
FOR INSERT
TO anon
WITH CHECK (
  length(trim(name)) BETWEEN 1 AND 200
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(email) <= 320
  AND length(source) BETWEEN 1 AND 120
);

CREATE POLICY "leads authenticated insert validated"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND length(trim(name)) BETWEEN 1 AND 200
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(email) <= 320
  AND length(source) BETWEEN 1 AND 120
);

CREATE POLICY "page_view_events anon insert validated"
ON public.page_view_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  path LIKE '/%'
  AND length(path) BETWEEN 1 AND 2048
);