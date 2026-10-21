CREATE TABLE IF NOT EXISTS remote_installations (
  installation_id text PRIMARY KEY,
  public_key text NOT NULL,
  public_key_sha256 text NOT NULL,
  license_revision integer NOT NULL,
  license_expires_at timestamptz,
  media_public_ip inet NOT NULL,
  media_port_min integer NOT NULL,
  media_port_max integer NOT NULL,
  last_nonce text NOT NULL,
  last_hello_at timestamptz NOT NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE remote_installations ADD COLUMN IF NOT EXISTS last_hello_at timestamptz;
UPDATE remote_installations SET last_hello_at=coalesce(last_hello_at, connected_at) WHERE last_hello_at IS NULL;
ALTER TABLE remote_installations ALTER COLUMN last_hello_at SET NOT NULL;

CREATE TABLE IF NOT EXISTS remote_codes (
  code_digest char(64) PRIMARY KEY,
  installation_id text NOT NULL REFERENCES remote_installations(installation_id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS remote_codes_expiry_idx ON remote_codes(expires_at);

CREATE TABLE IF NOT EXISTS remote_sessions (
  session_digest char(64) PRIMARY KEY,
  installation_id text NOT NULL REFERENCES remote_installations(installation_id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS remote_sessions_expiry_idx ON remote_sessions(expires_at);

-- UC organizer credentials are isolated from delegate codes and cookies.
CREATE TABLE IF NOT EXISTS uc_organizer_codes (
  code_digest char(64) PRIMARY KEY,
  installation_id text NOT NULL REFERENCES remote_installations(installation_id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS uc_organizer_codes_expiry_idx ON uc_organizer_codes(expires_at);

CREATE TABLE IF NOT EXISTS uc_organizer_sessions (
  session_digest char(64) PRIMARY KEY,
  installation_id text NOT NULL REFERENCES remote_installations(installation_id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS uc_organizer_sessions_expiry_idx ON uc_organizer_sessions(expires_at);
