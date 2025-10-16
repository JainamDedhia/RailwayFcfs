const https = require('https');

exports.handler = async function(event, context) {
  const apiKey = process.env.NEWS_API_KEY;

  // Debug: Check if API key exists
  console.log('API Key exists:', !!apiKey);
  console.log('API Key length:', apiKey?.length || 0);

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "NEWS_API_KEY environment variable not set" }),
    };
  }

  const query = encodeURIComponent("railway india");
  const url = `https://newsapi.org/v2/everything?q=${query}&language=en&sortBy=publishedAt&pageSize=8&apiKey=${apiKey}`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
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
    }).on('error', (err) => {
      console.error('Request error:', err);
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: 'Request failed', details: err.message }),
      });
    });
  });
};