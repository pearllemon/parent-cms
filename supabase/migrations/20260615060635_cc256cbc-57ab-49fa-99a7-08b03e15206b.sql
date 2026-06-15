
-- 1. Add canonical payload + stable migration id
ALTER TABLE public.cms_releases
  ADD COLUMN IF NOT EXISTS payload_canonical TEXT;

ALTER TABLE public.cms_migration_manifest
  ADD COLUMN IF NOT EXISTS migration_id TEXT;

-- Backfill migration_id for existing rows (stable: version + order_index)
UPDATE public.cms_migration_manifest
   SET migration_id = version || ':' || order_index::text
 WHERE migration_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cms_migration_manifest_migration_id
  ON public.cms_migration_manifest(migration_id);

-- 2. Immutability after signing
CREATE OR REPLACE FUNCTION public.cms_releases_lock_after_sign()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.signed_at IS NOT NULL THEN
    IF NEW.sdk_url            IS DISTINCT FROM OLD.sdk_url            THEN RAISE EXCEPTION 'sdk_url is immutable after signing'; END IF;
    IF NEW.payload_canonical  IS DISTINCT FROM OLD.payload_canonical  THEN RAISE EXCEPTION 'payload_canonical is immutable after signing'; END IF;
    IF NEW.signature          IS DISTINCT FROM OLD.signature          THEN RAISE EXCEPTION 'signature is immutable after signing'; END IF;
    IF NEW.signing_key_id     IS DISTINCT FROM OLD.signing_key_id     THEN RAISE EXCEPTION 'signing_key_id is immutable after signing'; END IF;
    IF NEW.signed_at          IS DISTINCT FROM OLD.signed_at          THEN RAISE EXCEPTION 'signed_at is immutable after signing'; END IF;
    IF NEW.manifest::text     IS DISTINCT FROM OLD.manifest::text     THEN RAISE EXCEPTION 'manifest is immutable after signing'; END IF;
    IF NEW.version            IS DISTINCT FROM OLD.version            THEN RAISE EXCEPTION 'version is immutable after signing'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cms_releases_lock_after_sign ON public.cms_releases;
CREATE TRIGGER trg_cms_releases_lock_after_sign
  BEFORE UPDATE ON public.cms_releases
  FOR EACH ROW EXECUTE FUNCTION public.cms_releases_lock_after_sign();

-- 3. Forward-only semver on insert
CREATE OR REPLACE FUNCTION public.cms_releases_forward_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _max TEXT;
BEGIN
  IF NEW.version !~ '^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$' THEN
    RAISE EXCEPTION 'version % is not semver (X.Y.Z)', NEW.version;
  END IF;

  SELECT version INTO _max
    FROM public.cms_releases
   ORDER BY string_to_array(regexp_replace(version, '[-.].*$', ''), '.')::int[] DESC
   LIMIT 1;

  IF _max IS NOT NULL
     AND string_to_array(regexp_replace(NEW.version, '[-.].*$', ''), '.')::int[]
         <= string_to_array(regexp_replace(_max,       '[-.].*$', ''), '.')::int[] THEN
    RAISE EXCEPTION 'forward-only: new version % must be strictly greater than %', NEW.version, _max;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cms_releases_forward_only ON public.cms_releases;
CREATE TRIGGER trg_cms_releases_forward_only
  BEFORE INSERT ON public.cms_releases
  FOR EACH ROW EXECUTE FUNCTION public.cms_releases_forward_only();
