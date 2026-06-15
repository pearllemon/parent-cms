ALTER TABLE public.cms_releases
  ADD COLUMN IF NOT EXISTS package_url TEXT,
  ADD COLUMN IF NOT EXISTS package_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS package_size BIGINT,
  ADD COLUMN IF NOT EXISTS package_format TEXT NOT NULL DEFAULT 'zip';

CREATE OR REPLACE FUNCTION public.cms_semver_key(_version TEXT)
RETURNS INT[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY[
    COALESCE(NULLIF(split_part(split_part(_version, '-', 1), '.', 1), '')::INT, 0),
    COALESCE(NULLIF(split_part(split_part(_version, '-', 1), '.', 2), '')::INT, 0),
    COALESCE(NULLIF(split_part(split_part(_version, '-', 1), '.', 3), '')::INT, 0)
  ];
$$;

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
   ORDER BY public.cms_semver_key(version) DESC, created_at DESC
   LIMIT 1;

  IF _max IS NOT NULL
     AND public.cms_semver_key(NEW.version) <= public.cms_semver_key(_max) THEN
    RAISE EXCEPTION 'forward-only: new version % must be strictly greater than %', NEW.version, _max;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cms_releases_lock_after_sign()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.signed_at IS NOT NULL THEN
    IF NEW.sdk_url            IS DISTINCT FROM OLD.sdk_url            THEN RAISE EXCEPTION 'sdk_url is immutable after signing'; END IF;
    IF NEW.package_url        IS DISTINCT FROM OLD.package_url        THEN RAISE EXCEPTION 'package_url is immutable after signing'; END IF;
    IF NEW.package_sha256     IS DISTINCT FROM OLD.package_sha256     THEN RAISE EXCEPTION 'package_sha256 is immutable after signing'; END IF;
    IF NEW.package_size       IS DISTINCT FROM OLD.package_size       THEN RAISE EXCEPTION 'package_size is immutable after signing'; END IF;
    IF NEW.package_format     IS DISTINCT FROM OLD.package_format     THEN RAISE EXCEPTION 'package_format is immutable after signing'; END IF;
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