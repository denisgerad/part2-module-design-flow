// api/mistral.js
// ─────────────────────────────────────────────────────────────────────────────
// Vercel Serverless Function — Mistral API Proxy
//
// WHY THIS EXISTS:
//   Browsers cannot call the Mistral API directly because:
//   1. CORS: Mistral's API does not allow browser origins
//   2. Security: the API key must never appear in client-side code
//
// HOW IT WORKS:
//   Browser → POST /api/mistral → this function → Mistral API
//                                      ↓
//   Browser ← JSON response    ← this function ← Mistral API
//
// ACCESS CODE GATE:
//   The browser sends an X-Access-Code header with every request.
//   This function checks it against the ACCESS_CODE env var.
//   Wrong code → 401 before the Mistral API is ever called.
//   Correct code → proxy forwards to Mistral as normal.
//
// ENVIRONMENT VARIABLES (set in Vercel project settings):
//   MISTRAL_API_KEY   your Mistral API key
//   ACCESS_CODE       any string you choose — shared with users you trust
// ─────────────────────────────────────────────────────────────────────────────

const MISTRAL_API = 'https://api.mistral.ai/v1/chat/completions';

export default async function handler(req, res) {

  // ── CORS headers ────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Access-Code');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Access code gate ────────────────────────────────────────────────────────
  const accessCode    = process.env.ACCESS_CODE;
  const providedCode  = req.headers['x-access-code'] || '';

  if (accessCode && providedCode !== accessCode) {
    return res.status(401).json({ error: 'Invalid access code' });
  }

  // ── Validate Mistral API key ─────────────────────────────────────────────────
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    console.error('MISTRAL_API_KEY not set');
    return res.status(500).json({
      error: 'Server configuration error: MISTRAL_API_KEY not configured.'
    });
  }

  // ── Extract request body ─────────────────────────────────────────────────────
  const { model, max_tokens, messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid request: messages array required' });
  }

  // ── Forward to Mistral API ───────────────────────────────────────────────────
  try {
    const mistralRes = await fetch(MISTRAL_API, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:      model      || 'mistral-large-latest',
        max_tokens: max_tokens || 3000,
        messages,
      }),
    });

    const data = await mistralRes.json();

    if (!mistralRes.ok) {
      console.error('Mistral API error:', mistralRes.status, data);
      return res.status(mistralRes.status).json({
        error:   data.message || data.error || 'Mistral API error',
        details: data,
      });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error('Proxy fetch error:', err);
    return res.status(500).json({
      error:   'Failed to reach Mistral API',
      details: err.message,
    });
  }
}
