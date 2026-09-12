-- Spatial indexes
CREATE INDEX IF NOT EXISTS places_location_idx ON places USING GIST (location);
CREATE INDEX IF NOT EXISTS incidents_location_idx ON incidents USING GIST (location);

-- B-tree indexes
CREATE INDEX IF NOT EXISTS places_status_idx ON places (status);
CREATE INDEX IF NOT EXISTS places_category_id_idx ON places (category_id);
CREATE INDEX IF NOT EXISTS places_created_at_idx ON places (created_at);

CREATE INDEX IF NOT EXISTS incidents_status_idx ON incidents (status);
CREATE INDEX IF NOT EXISTS incidents_category_id_idx ON incidents (category_id);
CREATE INDEX IF NOT EXISTS incidents_created_at_idx ON incidents (created_at);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_actor_idx ON audit_logs (created_at, actor_id);
CREATE INDEX IF NOT EXISTS notifications_user_id_read_idx ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS verifications_target_idx ON verifications (target_type, target_id);
CREATE INDEX IF NOT EXISTS flags_status_idx ON flags (status);
CREATE INDEX IF NOT EXISTS reviews_place_id_idx ON reviews (place_id);
