// netlify/functions/news.js
import fetch from 'node-fetch';

export async function handler(event, context) {
  const query = "railway india";
  const apiKey = process.env.NEWS_API_KEY;

  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=8&apiKey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('Error fetching news:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch news", details: err.message }),
    };
  }
}