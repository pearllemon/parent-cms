
-- 1. Signature fields on releases
ALTER TABLE public.cms_releases
  ADD COLUMN IF NOT EXISTS signature TEXT,
  ADD COLUMN IF NOT EXISTS signing_key_id TEXT,
  ADD COLUMN IF NOT EXISTS payload_hash TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- 2. Trusted signing keys registry (public keys; private keys live in secrets only)
CREATE TABLE IF NOT EXISTS public.cms_signing_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id TEXT NOT NULL UNIQUE,
  algorithm TEXT NOT NULL DEFAULT 'ed25519',
  public_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  revoked_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cms_signing_keys TO anon, authenticated;
GRANT ALL    ON public.cms_signing_keys TO service_role;

ALTER TABLE public.cms_signing_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signing keys are world-readable"
  ON public.cms_signing_keys FOR SELECT
  USING (true);

CREATE POLICY "signing keys admin-managed"
  ON public.cms_signing_keys FOR ALL
  USING (true) WITH CHECK (true);

-- 3. Per-site migration ledger
CREATE TABLE IF NOT EXISTS public.applied_cms_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  migration_id TEXT NOT NULL,
  version TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  kind TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms INTEGER,
  UNIQUE (site_id, migration_id)
);

GRANT SELECT ON public.applied_cms_migrations TO authenticated;
GRANT ALL    ON public.applied_cms_migrations TO service_role;

ALTER TABLE public.applied_cms_migrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applied migrations readable by authenticated"
  ON public.applied_cms_migrations FOR SELECT
  TO authenticated USING (true);

-- 4. exec_cms_migration: forward-only, signed, version-validated
CREATE OR REPLACE FUNCTION public.exec_cms_migration(
  _site_id TEXT,
  _migration_id TEXT,
  _version TEXT,
  _order_index INTEGER,
  _kind TEXT,
  _payload TEXT,
  _signature_verified BOOLEAN,
  _current_version TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _started TIMESTAMPTZ := clock_timestamp();
  _already_applied BOOLEAN;
  _release RECORD;
BEGIN
  -- Only service_role can call this. RLS doesn't apply to security-definer fns,
  -- so we gate on the JWT role claim itself.
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'exec_cms_migration: forbidden (service_role required)';
  END IF;

  IF _signature_verified IS NOT TRUE THEN
    RAISE EXCEPTION 'exec_cms_migration: signature not verified — refusing to run';
  END IF;

  IF _site_id IS NULL OR length(_site_id) = 0 THEN
    RAISE EXCEPTION 'exec_cms_migration: site_id required';
  END IF;

  -- Release must exist, be signed, and not recalled.
  SELECT * INTO _release FROM public.cms_releases WHERE version = _version;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'exec_cms_migration: unknown release %', _version;
  END IF;
  IF _release.recalled THEN
    RAISE EXCEPTION 'exec_cms_migration: release % is recalled', _version;
  END IF;
  IF _release.signature IS NULL OR _release.signing_key_id IS NULL THEN
    RAISE EXCEPTION 'exec_cms_migration: release % is unsigned', _version;
  END IF;

  -- Forward-only: incoming version must be strictly newer than what the site has.
  IF _current_version IS NOT NULL AND _current_version <> ''
     AND string_to_array(_version, '.')::int[] <= string_to_array(_current_version, '.')::int[] THEN
    RAISE EXCEPTION 'exec_cms_migration: refusing downgrade % -> %', _current_version, _version;
  END IF;

  -- Idempotency.
  SELECT EXISTS (
    SELECT 1 FROM public.applied_cms_migrations
     WHERE site_id = _site_id AND migration_id = _migration_id
  ) INTO _already_applied;
  IF _already_applied THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'already_applied');
  END IF;

  IF _kind = 'noop' THEN
    -- nothing to do
    NULL;
  ELSIF _kind = 'sql' THEN
    EXECUTE _payload;
  ELSE
    -- 'js' and unknown kinds are NOT executed here. JS migrations are run
    -- client-side (sandboxed) by the SDK; this RPC handles only SQL.
    RAISE EXCEPTION 'exec_cms_migration: kind % not supported by this RPC', _kind;
  END IF;

  INSERT INTO public.applied_cms_migrations
    (site_id, migration_id, version, order_index, kind, duration_ms)
  VALUES
    (_site_id, _migration_id, _version, _order_index, _kind,
     EXTRACT(MILLISECOND FROM clock_timestamp() - _started)::INTEGER);

  RETURN jsonb_build_object('ok', true, 'skipped', false, 'version', _version);
END;
$$;

REVOKE ALL ON FUNCTION public.exec_cms_migration(TEXT,TEXT,TEXT,INTEGER,TEXT,TEXT,BOOLEAN,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_cms_migration(TEXT,TEXT,TEXT,INTEGER,TEXT,TEXT,BOOLEAN,TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.exec_cms_migration(TEXT,TEXT,TEXT,INTEGER,TEXT,TEXT,BOOLEAN,TEXT) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.exec_cms_migration(TEXT,TEXT,TEXT,INTEGER,TEXT,TEXT,BOOLEAN,TEXT) TO service_role;
