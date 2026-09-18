const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

axios.get('https://www.impact.co.th/th/visitors/event-calendar', {
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  responseType: 'text',
  responseEncoding: 'utf8'
}).then(r => {
  const $ = cheerio.load(r.data);
  console.log($('.eb-event-item-grid-default-layout').first().html());
});
