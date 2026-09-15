export const getExpiryDuration = (type) => {
  const durations = {
    traffic: 2 * 60 * 60 * 1000,
    accident: 4 * 60 * 60 * 1000,
    crowded: 3 * 60 * 60 * 1000,
    cctv: null,
    restaurant: null,
    market: null,
    event: 24 * 60 * 60 * 1000,
    emergency: 12 * 60 * 60 * 1000
  };
  return Object.prototype.hasOwnProperty.call(durations, type) ? durations[type] : 24 * 60 * 60 * 1000;
};

export const formatTimeRemaining = (expiresAt) => {
  if (!expiresAt) return 'ถาวร';
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return 'หมดอายุแล้ว';
  
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (h > 0) return `${h} ชม. ${m} นาที`;
  return `${m} นาที`;
};

export const isExpired = (expiresAt) => {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
};
