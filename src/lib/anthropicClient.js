/**
 * Thin wrapper around the Anthropic Messages API.
 *
 * DEMO CAVEAT: this calls api.anthropic.com directly from the browser using
 * a Vite-exposed env var (VITE_ANTHROPIC_API_KEY). That means the key is
 * visible in the client bundle/network tab. That's acceptable for a local
 * university demo running against a scoped/throwaway key, but it is NOT a
 * pattern to ship to real users — a production build would proxy this call
 * through a small server so the key never reaches the browser.
 */

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 1500;

export class AnthropicApiError extends Error {
  constructor(message, { status, raw } = {}) {
    super(message);
    this.name = 'AnthropicApiError';
    this.status = status;
    this.raw = raw;
  }
}

/**
 * Sends a single-turn message with a system prompt and returns the
 * concatenated text content of the response.
 */
function resolveApiKey() {
  // Browser/Vite build: exposed via .env as VITE_ANTHROPIC_API_KEY.
  const viteKey =
    typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_ANTHROPIC_API_KEY : undefined;
  // Plain Node (e.g. `node --test`, outside the Vite pipeline): ANTHROPIC_API_KEY.
  const nodeKey = typeof process !== 'undefined' && process.env ? process.env.ANTHROPIC_API_KEY : undefined;
  return viteKey || nodeKey;
}

export async function callAnthropic({ system, userMessage }) {
  const apiKey = resolveApiKey();

  if (!apiKey) {
    throw new AnthropicApiError(
      'No API key configured. Set VITE_ANTHROPIC_API_KEY in your .env file (browser) or ANTHROPIC_API_KEY in your shell (tests/scripts), then retry.'
    );
  }

  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: 'user', content: userMessage }]
      })
    });
  } catch (networkErr) {
    throw new AnthropicApiError(`Network error calling Anthropic API: ${networkErr.message}`);
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.error?.message || `Anthropic API returned HTTP ${response.status}`;
    throw new AnthropicApiError(message, { status: response.status, raw: body });
  }

  const text = (body?.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  if (!text) {
    throw new AnthropicApiError('Anthropic API response had no text content.', { raw: body });
  }

  return text;
}
