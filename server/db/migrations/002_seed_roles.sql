-- Seed roles
INSERT INTO roles (id, name, description) VALUES
  (uuid_generate_v4(), 'admin', 'Administrator with full access'),
  (uuid_generate_v4(), 'moderator', 'Moderator who can manage content but not users or system settings')
ON CONFLICT (name) DO NOTHING;

-- Create temporary IDs for permissions to use in junction table
WITH perm_inserts AS (
  INSERT INTO permissions (name, description, resource, action) VALUES
    ('places:read', 'Read places', 'places', 'read'),
    ('places:create', 'Create places', 'places', 'create'),
    ('places:update', 'Update places', 'places', 'update'),
    ('places:delete', 'Delete places', 'places', 'delete'),
    
    ('incidents:read', 'Read incidents', 'incidents', 'read'),
    ('incidents:create', 'Create incidents', 'incidents', 'create'),
    ('incidents:update', 'Update incidents', 'incidents', 'update'),
    ('incidents:delete', 'Delete incidents', 'incidents', 'delete'),
    
    ('reviews:read', 'Read reviews', 'reviews', 'read'),
    ('reviews:delete', 'Delete reviews', 'reviews', 'delete'),
    
    ('flags:read', 'Read flags', 'flags', 'read'),
    ('flags:update', 'Update flags', 'flags', 'update'),
    
    ('users:read', 'Read users', 'users', 'read'),
    ('users:create', 'Create users', 'users', 'create'),
    ('users:update', 'Update users', 'users', 'update'),
    ('users:delete', 'Delete users', 'users', 'delete'),
    
    ('categories:manage', 'Manage categories', 'categories', 'manage'),
    ('settings:manage', 'Manage system settings', 'settings', 'manage'),
    ('audit:read', 'Read audit logs', 'audit', 'read')
  ON CONFLICT (name) DO NOTHING
  RETURNING id, name
)
SELECT 1; -- Execute the CTE

-- Give Admin all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Give Moderator limited permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'moderator' 
  AND p.name IN (
    'places:read', 'places:update', 'places:delete',
    'incidents:read', 'incidents:update', 'incidents:delete',
    'reviews:read', 'reviews:delete',
    'flags:read', 'flags:update'
  )
ON CONFLICT DO NOTHING;

-- Seed Categories
INSERT INTO categories (id, label, emoji, color, group_name, expiry_ms, sort_order) VALUES
  -- Situation
  ('traffic', 'รถติด', '🚗', '#F97316', 'situation', 1800000, 1),
  ('accident', 'อุบัติเหตุ', '⚠️', '#DC2626', 'situation', NULL, 2),
  ('crowded', 'คนหนาแน่น', '👥', '#EAB308', 'situation', 3600000, 3),
  ('problem', 'ปัญหา/ร้องเรียน', '🚧', '#B45309', 'situation', 86400000, 4),
  ('road_closed', 'ถนนปิด', '🛑', '#991B1B', 'situation', NULL, 5),
  
  -- Place
  ('restroom', 'ห้องน้ำ', '🚻', '#0891B2', 'place', NULL, 6),
  ('landmark', 'Landmark', '🏛️', '#7C3AED', 'place', NULL, 7),
  ('checkin', 'จุดเช็คอิน', '📸', '#EC4899', 'place', 28800000, 8),
  ('ev_charge', 'จุดชาร์จ EV', '⚡', '#16A34A', 'place', NULL, 9),
  ('convenience', 'ร้านสะดวกซื้อ', '🏪', '#2563EB', 'place', NULL, 10),
  ('venue', 'สถานที่จัดงาน', '🎪', '#9333EA', 'place', 86400000, 11),
  ('meetpoint', 'จุดนัดพบ', '🤝', '#0D9488', 'place', 14400000, 12),
  ('food_delivery', 'จุดรับส่งอาหาร', '🛵', '#EA580C', 'place', 28800000, 13),
  ('atm', 'จุดกดเงิน/ATM', '🏧', '#1D4ED8', 'place', NULL, 14),
  
  -- Share
  ('restaurant', 'ร้านอาหาร/เครื่องดื่ม', '🍜', '#16A34A', 'share', NULL, 15),
  ('market', 'ตลาดนัด', '🛍️', '#9333EA', 'share', 28800000, 16),
  ('shop', 'ร้านค้า/ฝากร้าน', '🏬', '#D97706', 'share', NULL, 17),
  ('event', 'งานอีเวนต์', '🎉', '#EC4899', 'share', 86400000, 18),
  ('review', 'รีวิวสถานที่', '📝', '#6366F1', 'share', NULL, 19),
  
  -- Emergency
  ('emergency', 'เหตุฉุกเฉิน', '🚨', '#DC2626', 'emergency', NULL, 20),
  
  -- Other
  ('other', 'อื่นๆ', '📌', '#6B7280', 'other', 86400000, 21)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  emoji = EXCLUDED.emoji,
  color = EXCLUDED.color,
  group_name = EXCLUDED.group_name,
  expiry_ms = EXCLUDED.expiry_ms,
  sort_order = EXCLUDED.sort_order;

-- Seed Default Settings
INSERT INTO system_settings (key, value, description) VALUES
  ('maintenance_mode', 'false', 'Enable to block normal app usage during maintenance'),
  ('auto_verify_threshold', '3', 'Number of verifications needed to auto-verify a pin'),
  ('max_flags_before_hide', '5', 'Number of flags before content is automatically hidden pending review')
ON CONFLICT (key) DO NOTHING;
