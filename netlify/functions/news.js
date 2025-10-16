const https = require('https');

exports.handler = async function(event, context) {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "NEWS_API_KEY environment variable not set" }),
    };
  }

  const query = encodeURIComponent("railway india");
  const path = `/v2/everything?q=${query}&language=en&sortBy=publishedAt&pageSize=8&apiKey=${apiKey}`;

  const options = {
    hostname: 'newsapi.org',
    path: path,
    method: 'GET',
    headers: {
      'User-Agent': 'RailwayTicketOS/1.0',  // ← This is the fix!
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          
          resolve({
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(parsed),
          });
        } catch (err) {
          console.error('Parse error:', err);
          resolve({
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to parse response', details: err.message }),
          });
        }
      });
    });

    req.on('error', (err) => {
      console.error('Request error:', err);
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: 'Request failed', details: err.message }),
      });
    });

    req.end();
  });
};