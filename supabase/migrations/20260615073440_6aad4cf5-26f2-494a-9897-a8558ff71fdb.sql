ALTER TABLE public.page_blocks
  ALTER COLUMN site_id TYPE text USING site_id::text;

ALTER TABLE public.page_block_versions
  ALTER COLUMN site_id TYPE text USING site_id::text;

ALTER TABLE public.orphan_edits
  ALTER COLUMN site_id TYPE text USING site_id::text;