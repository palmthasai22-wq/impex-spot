const { v4: uuidv4 } = require('uuid');

const sessionMiddleware = (req, res, next) => {
    let sessionId = req.headers['x-session-id'];
    if (!sessionId) {
        sessionId = uuidv4();
        res.setHeader('X-Session-ID', sessionId);
    }
    req.sessionId = sessionId;
    next();
};

module.exports = { sessionMiddleware };
