const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

async function testScraper() {
  try {
    const { data } = await axios.get('https://www.impact.co.th/th/visitors/event-calendar', {
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      responseType: 'text',
      responseEncoding: 'utf8'
    });
    
    const $ = cheerio.load(data);
    const item = $('.eb-event-item-grid-default-layout').first();
    console.log(item.html());
  } catch (error) {
    console.error('Scraper error:', error);
  }
}

testScraper();
