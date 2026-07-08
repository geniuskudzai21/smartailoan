const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
require('dotenv').config();

const GROK_KEYS = [
  process.env.GROK_API_KEY_1,
  process.env.GROK_API_KEY_2,
  process.env.GROK_API_KEY_3,
  process.env.GROK_API_KEY_4,
].filter(Boolean);

if (!GROK_KEYS.length) {
  console.error('No GROK_API_KEY_1..5 found in .env');
  process.exit(1);
}

const MODELS = [
  'qwen/qwen3.6-27b',
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile'
];

let keyIndex = 0;
let modelIndex = 0;

function getNextKey() {
  const key = GROK_KEYS[keyIndex % GROK_KEYS.length];
  keyIndex++;
  return key;
}

function getNextModel() {
  const model = MODELS[modelIndex % MODELS.length];
  modelIndex++;
  return model;
}

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
            'Authorization': `Bearer ${getNextKey()}`
          },
          body: JSON.stringify({
            model: getNextModel(),
            messages: [
              { role: 'system', content: system || 'You are a helpful financial AI assistant.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 2048
          })
        });
        const data = await response.json();
        if (!response.ok || data.error) {
          const msg = data.error?.message || data.error || `HTTP ${response.status}`;
          res.writeHead(429, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Groq API: ' + msg }));
        }
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Groq returned empty response' }));
        }
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
