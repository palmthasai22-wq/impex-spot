const thaiMonths = {
  'มกราคม': '01', 'กุมภาพันธ์': '02', 'มีนาคม': '03', 'เมษายน': '04',
  'พฤษภาคม': '05', 'มิถุนายน': '06', 'กรกฎาคม': '07', 'สิงหาคม': '08',
  'กันยายน': '09', 'ตุลาคม': '10', 'พฤศจิกายน': '11', 'ธันวาคม': '12',
  'ม.ค.': '01', 'ก.พ.': '02', 'มี.ค.': '03', 'เม.ย.': '04',
  'พ.ค.': '05', 'มิ.ย.': '06', 'ก.ค.': '07', 'ส.ค.': '08',
  'ก.ย.': '09', 'ต.ค.': '10', 'พ.ย.': '11', 'ธ.ค.': '12'
};

function parseThaiDateRange(dateStr) {
  dateStr = dateStr.replace(/\s+/g, ' ').trim(); // e.g. "16-20 กันยายน 2569" or "20 ต.ค. - 5 พ.ย. 2569"
  
  // Default to today if parsing fails
  const today = new Date().toISOString().split('T')[0];
  let startDate = today;
  let endDate = today;

  try {
    const parts = dateStr.split(/[-ถึง]/).map(s => s.trim());
    if (parts.length === 1) {
      // Single date: "20 กันยายน 2569"
      const match = parts[0].match(/(\d{1,2})\s+([^\s]+)\s+(\d{4})/);
      if (match) {
        const d = match[1].padStart(2, '0');
        const m = thaiMonths[match[2]] || '01';
        const y = parseInt(match[3]) - 543;
        startDate = endDate = `${y}-${m}-${d}`;
      }
    } else if (parts.length === 2) {
      // Range
      // Case 1: "16-20 กันยายน 2569"
      // Case 2: "20 ต.ค. - 5 พ.ย. 2569"
      const endMatch = parts[1].match(/(\d{1,2})\s+([^\s]+)\s+(\d{4})/);
      if (endMatch) {
        const endD = endMatch[1].padStart(2, '0');
        const endM = thaiMonths[endMatch[2]] || '01';
        const endY = parseInt(endMatch[3]) - 543;
        endDate = `${endY}-${endM}-${endD}`;
        
        // Parse start part
        const startParts = parts[0].split(/\s+/);
        if (startParts.length === 1) {
          // "16" (uses same month/year as end)
          const startD = startParts[0].padStart(2, '0');
          startDate = `${endY}-${endM}-${startD}`;
        } else if (startParts.length === 2) {
          // "20 ต.ค." (uses same year as end)
          const startD = startParts[0].padStart(2, '0');
          const startM = thaiMonths[startParts[1]] || endM;
          startDate = `${endY}-${startM}-${startD}`;
        } else if (startParts.length >= 3) {
          // "20 ต.ค. 2569"
          const startD = startParts[0].padStart(2, '0');
          const startM = thaiMonths[startParts[1]] || endM;
          const startY = parseInt(startParts[2]) - 543;
          startDate = `${startY}-${startM}-${startD}`;
        }
      }
    }
  } catch (e) {
    console.error('Date parsing error', e);
  }
  
  return { startDate, endDate };
}

console.log(parseThaiDateRange("16-20 กันยายน 2569"));
console.log(parseThaiDateRange("20 ตุลาคม - 5 พฤศจิกายน 2569"));
console.log(parseThaiDateRange("25 ก.ย. 2569"));
