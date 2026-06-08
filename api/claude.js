export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;

  if (!anthropicKey) {
    return res.status(500).json({ error: 'Anthropic API key not configured' });
  }

  try {
    const { query, pdfText } = req.body;

    // Step 1: Search with Tavily
    let searchResults = '';
    let usedWebSearch = false;
    if (tavilyKey && query) {
      try {
        const tavilyResp = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: query + ' MRI safety implant conditional SAR',
            search_depth: 'basic',
            max_results: 5,
            include_domains: ['mrisafety.com', 'medtronic.com', 'bostonscientific.com', 'abbott.com', 'biotronik.com', 'kurzmed.com', 'nvvr.nl']
          })
        });
        const tavilyData = await tavilyResp.json();
        if (tavilyData.results && tavilyData.results.length) {
          searchResults = tavilyData.results
            .map(r => `Titel: ${r.title}\nURL: ${r.url}\nInhoud: ${r.content}`)
            .join('\n\n');
          usedWebSearch = true;
        }
      } catch(e) {
        // Tavily failed, continue without
      }
    }

    // Step 2: Build prompt
    let prompt = `Je bent een MRI-veiligheidsspecialist. Geef MRI-veiligheidsinformatie voor het implantaat: "${query}"\n`;

    if (pdfText) {
      prompt += `\nRAEDPLEEG EERST dit fabrikantsdocument (heeft ALTIJD voorrang boven andere bronnen):\n${pdfText.slice(0, 30000)}\n`;
    }

    if (searchResults) {
      prompt += `\nAANVULLENDE ZOEKRESULTATEN van het web:\n${searchResults}\n`;
    }

    prompt += `
Antwoord UITSLUITEND als geldig JSON zonder markdown:
{
  "found_in_pdf": true of false,
  "name": "officiële productnaam",
  "manufacturer": "fabrikant",
  "status": "MR Safe" of "MR Unsafe" of "MR Conditional",
  "advice": "2-3 zinnen klinisch advies",
  "params": [
    {"label": "Max veldsterkte", "value": "..."},
    {"label": "Max SAR (geheel lichaam)", "value": "..."},
    {"label": "Max gradientveld", "value": "..."},
    {"label": "Max temperatuurstijging", "value": "..."}
  ],
  "sources": [{"title": "naam bron", "url": "url of leeg"}],
  "confidence": "hoog" of "middel" of "laag",
  "document_name": "bestandsnaam indien uit PDF",
  "document_section": "sectienaam indien uit PDF",
  "ref_numbers": "REF-nummers indien bekend"
}
Geef lege params array bij MR Safe of MR Unsafe. Bij MR Conditional altijd parameters invullen.`;

    // Step 3: Call Claude
    const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await claudeResp.json();
    return res.status(claudeResp.status).json({
      ...data,
      used_web_search: usedWebSearch,
      used_pdf: !!pdfText
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
