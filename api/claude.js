module.exports = async function(req, res) {
  try {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return res.status(500).json({ error: 'No API key' });

    const { query, pdfText } = req.body || {};

    let prompt = `Je bent een MRI-veiligheidsspecialist. Geef MRI-veiligheidsinformatie voor het implantaat: "${query}".`;
    if (pdfText) prompt += `\n\nFabrikantsdocument (heeft ALTIJD voorrang):\n${pdfText.slice(0, 20000)}`;
    prompt += `\n\nAntwoord UITSLUITEND als geldig JSON zonder markdown:\n{"found_in_pdf":false,"name":"productnaam","manufacturer":"fabrikant","status":"MR Safe of MR Unsafe of MR Conditional","advice":"2-3 zinnen advies","params":[{"label":"Max veldsterkte","value":"..."},{"label":"Max SAR","value":"..."}],"sources":[{"title":"bron","url":""}],"confidence":"hoog","document_name":"","document_section":"","ref_numbers":""}`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
    });

    const data = await r.json();
    return res.status(200).json({ ...data, used_web_search: false, used_pdf: !!pdfText });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
