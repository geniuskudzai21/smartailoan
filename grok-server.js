const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
require('dotenv').config();

const GROK_API_KEY = process.env.GROK_API_KEY || process.env.GROK_API || '';

const MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'POST' && req.url === '/api/grok') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { prompt, system } = JSON.parse(body);
        const response = await fetch(GROQ_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROK_API_KEY}`
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: 'system', content: system || 'You are a helpful financial AI assistant.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 2048
          })
        });
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || 'No response';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ result: content }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/api/admin/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ email: process.env.ADMIN_EMAIL }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Grok proxy running on http://localhost:${PORT}`);
});
