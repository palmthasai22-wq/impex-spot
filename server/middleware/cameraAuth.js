const jwt = require('jsonwebtoken');
const { UUID } = require('../services/cameraValidation');

function createCameraAuth({ getUser, secret = process.env.JWT_SECRET }) {
  return async (req, res, next) => {
    const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    let decoded;
    try {
      decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
      if (!UUID.test(decoded.id || '')) throw new Error();
    } catch { return res.status(401).json({ error: 'Invalid login' }); }
    try {
      const user = await getUser(decoded.id);
      if (!user || user.is_active !== true || user.role !== 'admin') return res.status(403).json({ error: 'Camera administrator access required' });
      req.user = { id: user.id, role: user.role };
      next();
    } catch { res.status(503).json({ error: 'Authentication service unavailable' }); }
  };
}
module.exports = { createCameraAuth };
