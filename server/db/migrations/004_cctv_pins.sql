CREATE TYPE cctv_owner_type AS ENUM ('government', 'business', 'household', 'agency');
CREATE TYPE cctv_connection_type AS ENUM ('lan_ip', 'wifi_local', 'onvif');
CREATE TYPE cctv_status AS ENUM ('online', 'offline', 'error');
CREATE TYPE cctv_verification AS ENUM ('pending', 'verified', 'rejected');

CREATE TABLE cctv_pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  coverage_direction INTEGER NOT NULL DEFAULT 0 CHECK (coverage_direction BETWEEN 0 AND 359),
  owner_type cctv_owner_type NOT NULL,
  connection_type cctv_connection_type NOT NULL,
  -- Versioned AES-256-GCM envelopes; never plaintext.
  camera_ip TEXT NOT NULL CHECK (camera_ip LIKE 'v1.%'),
  rtsp_path TEXT NOT NULL CHECK (rtsp_path LIKE 'v1.%'),
  credentials TEXT NOT NULL CHECK (credentials LIKE 'v1.%'),
  public_stream_url TEXT GENERATED ALWAYS AS ('/streams/' || id::text || '/index.m3u8') STORED,
  status cctv_status NOT NULL DEFAULT 'offline',
  verification_status cctv_verification NOT NULL DEFAULT 'pending',
  owner_consent BOOLEAN NOT NULL DEFAULT FALSE,
  consent_confirmed_by UUID REFERENCES users(id),
  consent_confirmed_at TIMESTAMPTZ,
  external_stream_url TEXT,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  relay_token_hash TEXT,
  media_reset_required BOOLEAN NOT NULL DEFAULT TRUE,
  revision INTEGER NOT NULL DEFAULT 1,
  relay_last_seen_at TIMESTAMPTZ,
  discovery_devices TEXT,
  discovery_requested BOOLEAN NOT NULL DEFAULT FALSE,
  discovery_updated_at TIMESTAMPTZ,
  last_health_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (NOT owner_consent OR (verification_status = 'verified' AND consent_confirmed_by IS NOT NULL AND consent_confirmed_at IS NOT NULL)),
  CHECK (status <> 'online' OR (owner_consent AND verification_status = 'verified'))
);
CREATE INDEX cctv_pins_location_idx ON cctv_pins USING GIST(location);
CREATE INDEX cctv_pins_public_idx ON cctv_pins(created_at, id) WHERE owner_consent AND verification_status = 'verified';
