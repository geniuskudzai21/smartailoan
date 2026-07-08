const GROK_KEYS = [
  process.env.GROK_API_KEY_1,
  process.env.GROK_API_KEY_2,
  process.env.GROK_API_KEY_3,
  process.env.GROK_API_KEY_4,
].filter(Boolean);

const MODELS = [
  'llama-3.3-70b-versatile',
  'qwen/qwen3.6-27b',
  'llama-3.1-8b-instant',
];

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET' && req.url === '/api/admin/config') {
    res.status(200).json({ email: process.env.ADMIN_EMAIL });
    return;
  }

  if (req.method !== 'POST' || req.url !== '/api/grok') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  try {
    const { prompt, system } = req.body;
    const key = GROK_KEYS[Math.floor(Math.random() * GROK_KEYS.length)];
    const model = MODELS[Math.floor(Math.random() * MODELS.length)];

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
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
      res.status(429).json({ error: 'Groq API: ' + msg });
      return;
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      res.status(500).json({ error: 'Groq returned empty response' });
      return;
    }

    res.status(200).json({ result: content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
