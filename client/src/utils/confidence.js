export const getConfidenceLabel = (score) => {
  if (score >= 60) return 'ยืนยันแล้ว';
  return 'รอการยืนยัน';
};

export const getConfidenceColor = (score) => {
  if (score >= 80) return 'green';
  if (score >= 60) return 'green'; // verified
  if (score >= 30) return 'yellow';
  return 'red';
};
