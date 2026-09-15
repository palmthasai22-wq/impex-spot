const { decrypt } = require('./cameraCrypto');

const publishable = row => !!row && row.owner_consent === true && row.verification_status === 'verified';
// Do not spread database rows into public responses. Derive URLs rather than trusting stored input.
function publicCamera(row) {
  return {
    id: row.id,
    location: { lat: Number(row.lat), lng: Number(row.lng) },
    coverage_direction: row.coverage_direction,
    owner_type: row.owner_type,
    status: row.status,
    public_stream_url: publishable(row) && row.status === 'online' ? `/streams/${row.id}/index.m3u8` : null,
  };
}

function adminCamera(row) {
  return {
    ...publicCamera(row),
    connection_type: row.connection_type,
    camera_ip: decrypt(row.camera_ip, `${row.id}:camera_ip`),
    rtsp_path: decrypt(row.rtsp_path, `${row.id}:rtsp_path`),
    // Credentials are write-only in the admin UI, too.
    has_credentials: !!row.credentials,
    verification_status: row.verification_status,
    owner_consent: row.owner_consent,
    consent_confirmed_by: row.consent_confirmed_by,
    consent_confirmed_at: row.consent_confirmed_at,
    relay_paired: !!row.relay_token_hash,
    relay_last_seen_at: row.relay_last_seen_at,
    last_health_check_at: row.last_health_check_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
module.exports = { publicCamera, adminCamera, publishable };
