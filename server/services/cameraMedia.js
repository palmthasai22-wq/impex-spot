const { publishable } = require('./cameraDto');

function createMediaClient({ base = process.env.MEDIAMTX_API_URL || 'http://mediamtx:9997', token = process.env.CCTV_CONTROL_TOKEN, request = fetch } = {}) {
  async function call(path, method = 'GET', body) {
    const response = await request(`${base}${path}`, {
      method, headers: { Authorization: `Basic ${Buffer.from(`control:${token}`).toString('base64')}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(5000), redirect: 'error',
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Media service unavailable');
    return response.status === 204 ? {} : response.json();
  }
  return {
    async sync(row) {
      if (!publishable(row)) return this.remove(row.id);
      const current = await call(`/v3/config/paths/get/${row.id}`);
      if (!current) await call(`/v3/config/paths/add/${row.id}`, 'POST', { source: 'publisher', overridePublisher: false });
    },
    async remove(id) { await call(`/v3/config/paths/delete/${id}`, 'DELETE'); },
    async status(id) { const path = await call(`/v3/paths/get/${id}`); return path?.ready ? 'online' : 'offline'; },
  };
}

async function reconcileCamera(row, repo, media) {
  try {
    if (row.media_reset_required) {
      // Kick the old publisher before acknowledging an edit or token rotation.
      await media.remove(row.id);
      await repo.clearMediaReset(row.id, row.revision);
    }
    await media.sync(row);
    await repo.setHealth(row.id, publishable(row) ? await media.status(row.id) : 'offline', row.revision);
  } catch { await repo.setHealth(row.id, 'error', row.revision); }
}

function startCameraHealth(repo, media, interval = 15000) {
  let stopped = false;
  let timer;
  const tick = async () => {
    try {
      for (let offset = 0; !stopped; offset += 100) {
        const rows = await repo.list({ limit: 100, offset });
        for (const row of rows) {
          if (stopped) break;
          await reconcileCamera(row, repo, media);
        }
        if (rows.length < 100) break;
      }
    } catch { console.warn('CCTV health check unavailable'); }
    if (!stopped) { timer = setTimeout(tick, interval); timer.unref(); }
  };
  tick();
  return () => { stopped = true; clearTimeout(timer); };
}
module.exports = { createMediaClient, startCameraHealth, reconcileCamera };
