// ====== ประเภทหมุดทั้งหมด แบ่งตามหมวด ======

// หมวด: รู้ทัน (สถานการณ์)
export const SITUATION_CATEGORIES = [
  { id: 'traffic', label: 'รถติด', emoji: '🚗', color: '#F97316' },
  { id: 'accident', label: 'อุบัติเหตุ', emoji: '⚠️', color: '#DC2626' },
  { id: 'crowded', label: 'คนหนาแน่น', emoji: '👥', color: '#EAB308' },
  { id: 'problem', label: 'ปัญหา/ร้องเรียน', emoji: '🚧', color: '#B45309' },
  { id: 'road_closed', label: 'ถนนปิด', emoji: '🛑', color: '#991B1B' },
];

// หมวด: ปักหมุด (สถานที่)
export const PLACE_CATEGORIES = [
  { id: 'restroom', label: 'ห้องน้ำ', emoji: '🚻', color: '#0891B2' },
  { id: 'landmark', label: 'Landmark', emoji: '🏛️', color: '#7C3AED' },
  { id: 'checkin', label: 'จุดเช็คอิน', emoji: '📸', color: '#EC4899' },
  { id: 'ev_charge', label: 'จุดชาร์จ EV', emoji: '⚡', color: '#16A34A' },
  { id: 'convenience', label: 'ร้านสะดวกซื้อ', emoji: '🏪', color: '#2563EB' },
  { id: 'venue', label: 'สถานที่จัดงาน', emoji: '🎪', color: '#9333EA' },
  { id: 'meetpoint', label: 'จุดนัดพบ', emoji: '🤝', color: '#0D9488' },
  { id: 'food_delivery', label: 'จุดรับส่งอาหาร', emoji: '🛵', color: '#EA580C' },
  { id: 'atm', label: 'จุดกดเงิน/ATM', emoji: '🏧', color: '#1D4ED8' },
];

// หมวด: แบ่งปัน (รีวิว/ร้านค้า)
export const SHARE_CATEGORIES = [
  { id: 'restaurant', label: 'ร้านอาหาร/เครื่องดื่ม', emoji: '🍜', color: '#16A34A' },
  { id: 'market', label: 'ตลาดนัด', emoji: '🛍️', color: '#9333EA' },
  { id: 'shop', label: 'ร้านค้า/ฝากร้าน', emoji: '🏬', color: '#D97706' },
  { id: 'event', label: 'งานอีเวนต์', emoji: '🎉', color: '#EC4899' },
  { id: 'review', label: 'รีวิวสถานที่', emoji: '📝', color: '#6366F1' },
];

// หมวด: จุดแจ้ง (ฉุกเฉิน)
export const EMERGENCY_CATEGORIES = [
  { id: 'emergency', label: 'เหตุฉุกเฉิน', emoji: '🚨', color: '#DC2626' },
];

// รวมทุกหมวด
export const PIN_CATEGORIES = [
  ...SITUATION_CATEGORIES,
  ...PLACE_CATEGORIES,
  ...SHARE_CATEGORIES,
  ...EMERGENCY_CATEGORIES,
  { id: 'other', label: 'อื่นๆ', emoji: '📌', color: '#6B7280' },
];

// ประเภทเหตุฉุกเฉิน (ละเอียด)
export const EMERGENCY_TYPES = [
  { id: 'car_accident', label: 'รถชน', emoji: '🚗💥' },
  { id: 'fainted', label: 'คนเป็นลม', emoji: '😵' },
  { id: 'injured', label: 'ผู้บาดเจ็บ', emoji: '🤕' },
  { id: 'fire', label: 'ไฟไหม้', emoji: '🔥' },
  { id: 'flood', label: 'น้ำท่วม', emoji: '🌊' },
  { id: 'road_danger', label: 'ถนนอันตราย', emoji: '⚠️' },
  { id: 'crime', label: 'อาชญากรรม', emoji: '🚔' },
  { id: 'other_emergency', label: 'เหตุด่วนอื่นๆ', emoji: '❗' },
];

// ====== 5 เมนูหลัก ======
export const MAIN_FEATURES = [
  { id: 'ruthan', label: 'รู้ทัน', emoji: '🗺️', desc: 'ดูสถานการณ์รอบตัว', color: '#2563EB', categories: SITUATION_CATEGORIES },
  { id: 'pin', label: 'ปักหมุด', emoji: '📍', desc: 'เพิ่มสถานที่สำคัญ', color: '#16A34A', categories: PLACE_CATEGORIES },
  { id: 'report', label: 'จุดแจ้ง', emoji: '🚨', desc: 'แจ้งเหตุฉุกเฉิน', color: '#DC2626', categories: EMERGENCY_CATEGORIES },
  { id: 'share', label: 'แบ่งปัน', emoji: '💬', desc: 'รีวิว ฝากร้าน แชร์', color: '#9333EA', categories: SHARE_CATEGORIES },
  { id: 'star', label: 'ให้ดาว', emoji: '⭐', desc: 'รีวิวให้คะแนน', color: '#F59E0B', categories: [] },
];

// ระยะเวลาหมดอายุ (ms)
export const EXPIRY_CONFIG = {
  traffic: { ms: 30 * 60000, label: '30 นาที' },
  accident: { ms: null, label: 'จนกว่าจะแก้ไข' },
  crowded: { ms: 60 * 60000, label: '1 ชั่วโมง' },
  problem: { ms: 24 * 3600000, label: '24 ชั่วโมง' },
  road_closed: { ms: null, label: 'จนกว่าจะเปิด' },
  restroom: { ms: null, label: 'ถาวร' },
  landmark: { ms: null, label: 'ถาวร' },
  checkin: { ms: 8 * 3600000, label: '8 ชั่วโมง' },
  ev_charge: { ms: null, label: 'ถาวร' },
  convenience: { ms: null, label: 'ถาวร' },
  venue: { ms: 24 * 3600000, label: '24 ชั่วโมง' },
  meetpoint: { ms: 4 * 3600000, label: '4 ชั่วโมง' },
  food_delivery: { ms: 8 * 3600000, label: '8 ชั่วโมง' },
  atm: { ms: null, label: 'ถาวร' },
  restaurant: { ms: null, label: 'ถาวร' },
  market: { ms: 8 * 3600000, label: '8 ชั่วโมง' },
  shop: { ms: null, label: 'ถาวร' },
  event: { ms: 24 * 3600000, label: '24 ชั่วโมง' },
  review: { ms: null, label: 'ถาวร' },
  emergency: { ms: null, label: 'จนกว่าจะแก้ไข' },
  other: { ms: 24 * 3600000, label: '24 ชั่วโมง' },
};
