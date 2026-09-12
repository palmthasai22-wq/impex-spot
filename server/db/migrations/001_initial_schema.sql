CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- users table (for admin/moderator accounts)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(200),
  email VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'moderator', -- 'admin' or 'moderator'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL, -- 'admin', 'moderator'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'places:create', 'places:delete', 'incidents:update'
  description TEXT,
  resource VARCHAR(50) NOT NULL, -- 'places', 'incidents', 'users', etc.
  action VARCHAR(50) NOT NULL, -- 'create', 'read', 'update', 'delete'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- role_permissions junction
CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- categories table
CREATE TABLE categories (
  id VARCHAR(50) PRIMARY KEY,
  label VARCHAR(200) NOT NULL,
  emoji VARCHAR(10),
  color VARCHAR(20),
  group_name VARCHAR(50), -- 'situation', 'place', 'share', 'emergency'
  expiry_ms BIGINT, -- NULL = permanent
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- anonymous_sessions
CREATE TABLE anonymous_sessions (
  id VARCHAR(100) PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- places table (permanent pins like restaurants, landmarks, etc.)
CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category_id VARCHAR(50) REFERENCES categories(id),
  custom_type VARCHAR(200),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  images TEXT[] DEFAULT '{}',
  session_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active', -- active, pending, deleted, rejected
  confidence INTEGER DEFAULT 40,
  average_rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  verification_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- incidents table (emergency, traffic, temporal events)
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category_id VARCHAR(50) REFERENCES categories(id),
  emergency_type VARCHAR(50),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  images TEXT[] DEFAULT '{}',
  session_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  is_emergency BOOLEAN DEFAULT false,
  dispatch_status VARCHAR(20) DEFAULT 'pending',
  assigned_responder_id UUID,
  injury_count INTEGER DEFAULT 0,
  injury_details JSONB,
  traffic_level VARCHAR(20),
  traffic_status VARCHAR(20) DEFAULT 'monitoring',
  traffic_note TEXT,
  confidence INTEGER DEFAULT 40,
  verification_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id UUID REFERENCES places(id) ON DELETE CASCADE,
  title VARCHAR(500),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  session_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- verifications
CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type VARCHAR(20) NOT NULL, -- 'place' or 'incident'
  target_id UUID NOT NULL,
  session_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(target_type, target_id, session_id)
);

-- flags (content reports)
CREATE TABLE flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type VARCHAR(20) NOT NULL, -- 'place', 'incident', 'review'
  target_id UUID NOT NULL,
  reason VARCHAR(50) NOT NULL, -- 'spam', 'inappropriate', 'fake', 'duplicate', 'other'
  details TEXT,
  session_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, resolved, dismissed
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- duplicates
CREATE TABLE duplicates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_type VARCHAR(20) NOT NULL,
  original_id UUID NOT NULL,
  duplicate_type VARCHAR(20) NOT NULL,
  duplicate_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, dismissed
  reported_by VARCHAR(100),
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- responders
CREATE TABLE responders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  team VARCHAR(200) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'available', -- available, busy, offline
  location GEOGRAPHY(POINT, 4326),
  location_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(100),
  type VARCHAR(50) NOT NULL, -- 'incident_new', 'incident_assigned', 'pin_verified', 'pin_flagged', 'system'
  title VARCHAR(500) NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id),
  actor_username VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id VARCHAR(100),
  before_data JSONB,
  after_data JSONB,
  request_id VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- system_settings
CREATE TABLE system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
