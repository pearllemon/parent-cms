-- Add template column to imported_posts if it does not exist
ALTER TABLE public.imported_posts 
ADD COLUMN IF NOT EXISTS template text DEFAULT 'default';
