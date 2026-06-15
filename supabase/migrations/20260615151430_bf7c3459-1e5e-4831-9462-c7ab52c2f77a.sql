ALTER TABLE public.cms_releases
  ADD COLUMN IF NOT EXISTS bundle_url TEXT,
  ADD COLUMN IF NOT EXISTS bundle_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS bundle_css_url TEXT,
  ADD COLUMN IF NOT EXISTS bundle_size BIGINT;

-- Lock bundle fields once signed (extend existing immutability trigger).
CREATE OR REPLACE FUNCTION public.cms_releases_lock_after_sign()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.signed_at IS NOT NULL THEN
    IF NEW.sdk_url            IS DISTINCT FROM OLD.sdk_url            THEN RAISE EXCEPTION 'sdk_url is immutable after signing'; END IF;
    IF NEW.package_url        IS DISTINCT FROM OLD.package_url        THEN RAISE EXCEPTION 'package_url is immutable after signing'; END IF;
    IF NEW.package_sha256     IS DISTINCT FROM OLD.package_sha256     THEN RAISE EXCEPTION 'package_sha256 is immutable after signing'; END IF;
    IF NEW.package_size       IS DISTINCT FROM OLD.package_size       THEN RAISE EXCEPTION 'package_size is immutable after signing'; END IF;
    IF NEW.package_format     IS DISTINCT FROM OLD.package_format     THEN RAISE EXCEPTION 'package_format is immutable after signing'; END IF;
    IF NEW.bundle_url         IS DISTINCT FROM OLD.bundle_url         THEN RAISE EXCEPTION 'bundle_url is immutable after signing'; END IF;
    IF NEW.bundle_sha256      IS DISTINCT FROM OLD.bundle_sha256      THEN RAISE EXCEPTION 'bundle_sha256 is immutable after signing'; END IF;
    IF NEW.bundle_css_url     IS DISTINCT FROM OLD.bundle_css_url     THEN RAISE EXCEPTION 'bundle_css_url is immutable after signing'; END IF;
    IF NEW.bundle_size        IS DISTINCT FROM OLD.bundle_size        THEN RAISE EXCEPTION 'bundle_size is immutable after signing'; END IF;
    IF NEW.payload_canonical  IS DISTINCT FROM OLD.payload_canonical  THEN RAISE EXCEPTION 'payload_canonical is immutable after signing'; END IF;
    IF NEW.signature          IS DISTINCT FROM OLD.signature          THEN RAISE EXCEPTION 'signature is immutable after signing'; END IF;
    IF NEW.signing_key_id     IS DISTINCT FROM OLD.signing_key_id     THEN RAISE EXCEPTION 'signing_key_id is immutable after signing'; END IF;
    IF NEW.signed_at          IS DISTINCT FROM OLD.signed_at          THEN RAISE EXCEPTION 'signed_at is immutable after signing'; END IF;
    IF NEW.manifest::text     IS DISTINCT FROM OLD.manifest::text     THEN RAISE EXCEPTION 'manifest is immutable after signing'; END IF;
    IF NEW.version            IS DISTINCT FROM OLD.version            THEN RAISE EXCEPTION 'version is immutable after signing'; END IF;
  END IF;
  RETURN NEW;
END;
$function$;