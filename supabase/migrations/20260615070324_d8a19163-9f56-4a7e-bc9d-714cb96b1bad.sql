ALTER TABLE public.cloud_components
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending_review','approved','rejected')),
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS cloud_components_status_idx
  ON public.cloud_components (status, kind, updated_at DESC);

DROP POLICY IF EXISTS "cloud_components anon read public" ON public.cloud_components;
CREATE POLICY "cloud_components anon read approved" ON public.cloud_components
  FOR SELECT TO anon
  USING (visibility = 'public' AND recalled = false AND status = 'approved');

CREATE TABLE IF NOT EXISTS public.cloud_component_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id UUID NOT NULL REFERENCES public.cloud_components(id) ON DELETE CASCADE,
  reviewer_id UUID,
  action TEXT NOT NULL CHECK (action IN ('approved','rejected','recalled','restored')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.cloud_component_reviews TO authenticated;
GRANT ALL ON public.cloud_component_reviews TO service_role;
ALTER TABLE public.cloud_component_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews auth read" ON public.cloud_component_reviews
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "reviews auth insert" ON public.cloud_component_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS cloud_component_reviews_component_idx
  ON public.cloud_component_reviews (component_id, created_at DESC);