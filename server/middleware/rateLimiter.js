const rateLimit = require('express-rate-limit');

const pinCreationLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: { error: 'Too many pins created from this IP, please try again after 10 minutes' }
});

const emergencyLimiter = rateLimit({
    windowMs: 30 * 60 * 1000,
    max: 2,
    message: { error: 'Too many emergency reports from this IP' }
});

const uploadLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: { error: 'Upload limit exceeded' }
});

const generalApiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: 'Too many requests' }
});

module.exports = {
    pinCreationLimiter,
    emergencyLimiter,
    uploadLimiter,
    generalApiLimiter
};
