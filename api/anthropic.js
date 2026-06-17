// Server-side proxy for the Anthropic Messages API.
// The API key lives ONLY here, read from the ANTHROPIC_API_KEY environment
// variable in Vercel (Project -> Settings -> Environment Variables). It is never
// sent to the browser. The client posts the same request body it always built;
// this function injects auth + version headers and passes the response straight
// back, so the app's existing response handling keeps working unchanged.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: { message: 'ANTHROPIC_API_KEY is not set on the server.' }
    });
  }

  try {
    // Vercel parses JSON bodies automatically; handle the string case too.
    const payload = typeof req.body === 'string'
      ? JSON.parse(req.body || '{}')
      : (req.body || {});

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    // Pass the upstream status and body through unchanged.
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return res.send(text);
  } catch (err) {
    return res.status(502).json({
      error: { message: 'Proxy error: ' + ((err && err.message) || String(err)) }
    });
  }
}
