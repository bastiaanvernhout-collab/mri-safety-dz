module.exports = async function(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'No API key' });

  const { query, pdfText } = req.body;

  let prompt = `Je bent een MRI-veiligheidsspecialist. Geef MRI-veiligheidsinformatie voor: "${query}".`;
  if (pdfText) prompt += `\n\nFabrikantsdocument (heeft voorrang):\n${pdfText.slice(0, 20000)}`;
  prompt += `\n\nAntwoord als JSON: {"found_in_pdf":false,"name":"...","manufacturer":"...","status":"MR Safe of MR Unsafe of MR Conditional","advice":"...","params":[],"sources":[],"confidence":"hoog","document_name":"","document_section":"","ref_numbers":""}`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
  });

  const data = await r.json();
  return res.status(r.status).json({ ...data, used_web_search: false, used_pdf: !!pdfText });
}
