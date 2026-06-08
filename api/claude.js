module.exports = async function(req, res) {
  try {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return res.status(500).json({ error: 'No key' });

    const body = req.body || {};
    const query = body.query || 'test';

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Zeg hallo' }]
      })
    });

    const data = await r.json();
    return res.status(200).json({ ok: true, data });
  } catch(e) {
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
}
