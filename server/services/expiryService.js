const EXPIRY_MS = {
  traffic: 30 * 60 * 1000,
  crowded: 60 * 60 * 1000,
  problem: 24 * 60 * 60 * 1000,
  accident: 24 * 60 * 60 * 1000,
  emergency: 24 * 60 * 60 * 1000,
};

let timer;

const expirePins = (pinStore) => {
  const now = Date.now();
  pinStore.list({ includeInactive: false }).forEach(pin => {
    if (pin.expiresAt && new Date(pin.expiresAt).getTime() <= now) {
      pinStore.expire(pin.id);
    }
  });
};

module.exports = {
  init(pinStore) {
    clearInterval(timer);
    timer = setInterval(() => expirePins(pinStore), 60 * 1000);
    timer.unref?.();
    expirePins(pinStore);
  },
  getExpiry(type) { return EXPIRY_MS[type] || 30 * 24 * 60 * 60 * 1000; },
};
