const eventStore = require('./eventStore');

// ─── พิกัดฮอลล์ IMPACT (shared with client/src/utils/events.js) ───
const VENUE_LOCATIONS = {
  'Challenger Hall 1': { lat: 13.9119432, lng: 100.5461693 },
  'ชาเลนเจอร์ ฮอลล์ 1': { lat: 13.9119432, lng: 100.5461693 },
  'Challenger Hall 2': { lat: 13.9130753, lng: 100.5465568 },
  'ชาเลนเจอร์ ฮอลล์ 2': { lat: 13.9130753, lng: 100.5465568 },
  'Challenger Hall 3': { lat: 13.9141292, lng: 100.5469934 },
  'ชาเลนเจอร์ ฮอลล์ 3': { lat: 13.9141292, lng: 100.5469934 },
  'Challenger Hall 1-3': { lat: 13.9130753, lng: 100.5467751 },
  'ชาเลนเจอร์ ฮอลล์ 1-3': { lat: 13.9130753, lng: 100.5467751 },
  'Challenger Hall 2-3': { lat: 13.91360225, lng: 100.5467751 },
  'ชาเลนเจอร์ ฮอลล์ 2-3': { lat: 13.91360225, lng: 100.5467751 },
  'อิมแพ็คชาเลนเจอร์': { lat: 13.9136, lng: 100.5467 },
  'อิมแพ็ค ชาเลนเจอร์': { lat: 13.9136, lng: 100.5467 },
  'ชาเลนเจอร์': { lat: 13.9136, lng: 100.5467 },
  'Thunder Dome': { lat: 13.9181, lng: 100.5483 },
  'ธันเดอร์โดม': { lat: 13.9181, lng: 100.5483 },
  'ทันเดอร์โดม': { lat: 13.9181, lng: 100.5483 },
  'IMPACT Arena': { lat: 13.911465, lng: 100.5483697 },
  'อิมแพ็ค อารีน่า เมืองทองธานี': { lat: 13.911465, lng: 100.5483697 },
  'อิมแพ็ค อารีน่า': { lat: 13.911465, lng: 100.5483697 },
  'Exhibition Center Hall 5': { lat: 13.9122509, lng: 100.54815 },
  'อาคารแสดงสินค้า 5': { lat: 13.9122509, lng: 100.54815 },
  'Exhibition Center Hall 6': { lat: 13.9128676, lng: 100.54849 },
  'อาคารแสดงสินค้า 6': { lat: 13.9128676, lng: 100.54849 },
  'Exhibition Center Hall 5-6': { lat: 13.91255925, lng: 100.54832 },
  'อาคารแสดงสินค้า 5-6': { lat: 13.91255925, lng: 100.54832 },
  'Exhibition Center Hall 7': { lat: 13.9134843, lng: 100.54883 },
  'อาคารแสดงสินค้า 7': { lat: 13.9134843, lng: 100.54883 },
  'Exhibition Center Hall 8': { lat: 13.914101, lng: 100.54916 },
  'อาคารแสดงสินค้า 8': { lat: 13.914101, lng: 100.54916 },
  'ศูนย์แสดงสินค้า อิมแพ็ค เมืองทองธานี': { lat: 13.913, lng: 100.548 },
  'ศูนย์แสดงสินค้า': { lat: 13.913, lng: 100.548 },
  'IMPACT Forum Hall 4': { lat: 13.9161526, lng: 100.5471676 },
  'อิมแพ็ค ฟอรั่ม ฮอลล์ 4': { lat: 13.9161526, lng: 100.5471676 },
  'อิมแพ็ค ฟอรั่ม': { lat: 13.9161526, lng: 100.5471676 },
  'AKTIV Square': { lat: 13.9103, lng: 100.5471 },
  'แอ็คทีฟ สแควร์': { lat: 13.9103, lng: 100.5471 },
  'IMPACT Lakeside': { lat: 13.9213, lng: 100.5414 },
  'ลานริมทะเลสาบ': { lat: 13.9213, lng: 100.5414 },
  'ทะเลสาบ เมืองทองธานี': { lat: 13.9213, lng: 100.5414 },
  'The Portal': { lat: 13.9126, lng: 100.5478 },
  'เดอะ พอร์ทอล': { lat: 13.9126, lng: 100.5478 },
};

const thaiMonths = {
  'มกราคม': '01', 'กุมภาพันธ์': '02', 'มีนาคม': '03', 'เมษายน': '04',
  'พฤษภาคม': '05', 'มิถุนายน': '06', 'กรกฎาคม': '07', 'สิงหาคม': '08',
  'กันยายน': '09', 'ตุลาคม': '10', 'พฤศจิกายน': '11', 'ธันวาคม': '12',
  'ม.ค.': '01', 'ก.พ.': '02', 'มี.ค.': '03', 'เม.ย.': '04',
  'พ.ค.': '05', 'มิ.ย.': '06', 'ก.ค.': '07', 'ส.ค.': '08',
  'ก.ย.': '09', 'ต.ค.': '10', 'พ.ย.': '11', 'ธ.ค.': '12'
};

function getVenueLocation(venueName) {
  const normalized = String(venueName || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const entry = Object.entries(VENUE_LOCATIONS).find(([name]) => {
    const normName = name.replace(/\s+/g, ' ').trim().toLowerCase();
    return normName === normalized ||
           normalized.includes(normName) ||
           normName.includes(normalized);
  });
  return entry?.[1] || null;
}

function parseThaiDateRange(dateStr) {
  dateStr = dateStr.replace(/\s+/g, ' ').trim();
  const today = new Date().toISOString().split('T')[0];
  let startDate = today, endDate = today;
  try {
    const parts = dateStr.split(/[-ถึง]/).map(s => s.trim());
    if (parts.length === 1) {
      const match = parts[0].match(/(\d{1,2})\s+([^\s]+)\s+(\d{4})/);
      if (match) {
        const d = match[1].padStart(2, '0');
        const m = thaiMonths[match[2]] || '01';
        const y = parseInt(match[3]) - 543;
        startDate = endDate = `${y}-${m}-${d}`;
      }
    } else if (parts.length === 2) {
      const endMatch = parts[1].match(/(\d{1,2})\s+([^\s]+)\s+(\d{4})/);
      if (endMatch) {
        const endD = endMatch[1].padStart(2, '0');
        const endM = thaiMonths[endMatch[2]] || '01';
        const endY = parseInt(endMatch[3]) - 543;
        endDate = `${endY}-${endM}-${endD}`;
        const startParts = parts[0].split(/\s+/);
        if (startParts.length === 1) {
          startDate = `${endY}-${endM}-${startParts[0].padStart(2, '0')}`;
        } else if (startParts.length === 2) {
          startDate = `${endY}-${thaiMonths[startParts[1]] || endM}-${startParts[0].padStart(2, '0')}`;
        } else if (startParts.length >= 3) {
          startDate = `${parseInt(startParts[2]) - 543}-${thaiMonths[startParts[1]] || endM}-${startParts[0].padStart(2, '0')}`;
        }
      }
    }
  } catch (e) { /* ignore parse errors */ }
  return { startDate, endDate };
}

/**
 * Scrape IMPACT event calendar and add new events to eventStore.
 * Returns { totalFound, added } on success.
 */
async function scrapeImpactEvents() {
  const axios = require('axios');
  const cheerio = require('cheerio');
  const https = require('https');

  const { data } = await axios.get('https://www.impact.co.th/th/visitors/event-calendar', {
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    responseType: 'text',
    responseEncoding: 'utf8',
    timeout: 30000,
  });

  const $ = cheerio.load(data);
  const results = [];

  $('.eb-event-item-grid-default-layout').each((_i, el) => {
    const title = $(el).find('.eb-event-title').text().trim();
    const venue = $(el).find('.eb-event-location').text().trim();
    const dateStr = $(el).find('.eb-event-date-time').text().replace(/\s+/g, ' ').trim();
    let posterUrl = $(el).find('img.eb-event-thumb').attr('src') || $(el).find('.eb-event-thumb-container img').attr('src');
    let link = $(el).find('.eb-event-title a').attr('href');

    if (title && venue) {
      if (link && !link.startsWith('http')) link = 'https://www.impact.co.th' + link;
      if (posterUrl && !posterUrl.startsWith('http')) posterUrl = 'https://www.impact.co.th' + posterUrl;

      const { startDate, endDate } = parseThaiDateRange(dateStr);

      // Jitter unknown venues slightly so they don't perfectly overlap
      const jitterLat = 13.9145 + (Math.random() - 0.5) * 0.002;
      const jitterLng = 100.5545 + (Math.random() - 0.5) * 0.002;
      const loc = getVenueLocation(venue) || { lat: jitterLat, lng: jitterLng };

      results.push({
        eventName: title.substring(0, 180),
        eventType: 'exhibition_public',
        startDate,
        endDate,
        startTime: '10:00',
        endTime: '20:00',
        venueName: venue,
        lat: loc.lat,
        lng: loc.lng,
        organizer: '',
        sourceUrl: link || 'https://www.impact.co.th/th/visitors/event-calendar',
        posterUrl: posterUrl || '',
        hideWhenEnded: false,
      });
    }
  });

  // Deduplicate: only add events whose name doesn't exist yet
  const existing = eventStore.list().map(e => e.eventName);
  let added = 0;
  for (const e of results) {
    if (!existing.includes(e.eventName)) {
      eventStore.create(e);
      added++;
    }
  }

  return { totalFound: results.length, added };
}

module.exports = { scrapeImpactEvents, getVenueLocation, VENUE_LOCATIONS };
