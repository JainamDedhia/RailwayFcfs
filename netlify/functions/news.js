const axios = require('axios');

exports.handler = async function(event, context) {
  const query = "railway india";
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "NEWS_API_KEY not configured" }),
    };
  }

  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=8&apiKey=${apiKey}`;

  try {
    const response = await axios.get(url);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response.data),
    };
  } catch (err) {
    console.error('Error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Failed to fetch news", 
        details: err.message 
      }),
    };
  }
};