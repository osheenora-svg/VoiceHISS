import { callAnthropic, hasApiKey } from './anthropicClient.js';
import { OFFLINE_EXTRACTIONS, matchOfflineSample } from '../data/offlineExtractions.js';

/**
 * Builds the system prompt sent to the extraction model.
 *
 * `schemaJsonText` must be the raw, verbatim text content of schema.json
 * (not a re-serialized JS object) — the assignment requires the schema to
 * appear in the system prompt exactly as written in the file, not a
 * reformatted/re-ordered copy. Callers get this via Vite's `?raw` import of
 * schema.json, or by reading the file directly in Node/tests.
 */
export function buildSystemPrompt(schemaJsonText) {
  return `You are a clinical intake extraction engine for VoiceHIS, a demo hospital information system used for a university assignment. You read one outpatient encounter transcript and extract structured data from it. Nothing you output is used for real patient care.

The target schema, verbatim from schema.json, is:

${schemaJsonText}

Respond with a single JSON object shaped like that schema, EXCEPT every leaf field must be wrapped as:
  { "value": <string> | null, "confidence": "high" | "medium" | "low" | null }
confidence must be null whenever value is null, and non-null whenever value is non-null.

Special case — "medications" is an array; each item must be:
  { "name": {value, confidence}, "dose": {value, confidence}, "frequency": {value, confidence} }
If no medications were mentioned, "medications" must be an empty array [].

Special case — "icd10Suggestion" is an object, not a plain leaf field:
  { "value": [ { "code": "...", "label": "..." }, ... up to 3 items ], "confidence": "high"|"medium"|"low"|null }
List your best candidate first. If the transcript gives no basis at all for a diagnosis, value must be [] and confidence null.

Rules — follow all of them exactly, with no exceptions:
1. Respond with JSON only. No prose, no preamble, no explanation, no markdown code fences (no \`\`\`), nothing before or after the JSON object.
2. If a datum is not explicitly stated in the transcript, its value is null. Never guess, estimate, or fill in a plausible-sounding value.
3. Never infer examination findings that were not spoken. If the transcript doesn't describe an exam finding, "examination" must be null — do not infer it from the diagnosis.
4. Free-text fields (chiefComplaint, duration, allergies, examination, followUp) must preserve the speaker's own wording and language exactly as spoken. If the transcript is in Arabic or mixes Arabic and English, keep that text as-is — do not translate it.
5. Coded/structured fields (diagnosis, icd10Suggestion candidates, medications[].name) must be normalized to standard English clinical terminology regardless of the transcript's language.
6. "temperature" and "bloodPressure" should be a short normalized value string including units as stated (e.g. "38.2°C", "120/80 mmHg"); null if not stated.
7. Only use "high" confidence when the value is stated explicitly and unambiguously. Use "medium" when it required light normalization (e.g. converting a spoken unit). Use "low" when the transcript was vague, hesitant, or you are inferring a likely diagnosis/code rather than reading a stated one.`;
}

/**
 * Strips common wrapper artifacts (markdown code fences, stray leading/
 * trailing prose) a model might add despite instructions, then JSON.parses.
 * Never throws for "expected" malformed output — always returns a result
 * object so the UI can show a readable error state instead of crashing.
 */
export function parseExtractionResponse(rawText, schemaJsonText) {
  const requiredKeys = Object.keys(JSON.parse(schemaJsonText));

  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    return { status: 'error', message: 'Empty response from model.', raw: rawText };
  }

  const stripped = stripCodeFences(rawText);

  let parsed;
  try {
    parsed = JSON.parse(stripped);
  } catch (err) {
    return {
      status: 'error',
      message: `Model response was not valid JSON: ${err.message}`,
      raw: rawText
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { status: 'error', message: 'Model response was valid JSON but not an object.', raw: rawText };
  }

  const missingKeys = requiredKeys.filter((key) => !(key in parsed));
  if (missingKeys.length > 0) {
    return {
      status: 'error',
      message: `Model response is missing required field(s): ${missingKeys.join(', ')}`,
      raw: rawText
    };
  }

  if (!Array.isArray(parsed.medications)) {
    return { status: 'error', message: '"medications" must be an array.', raw: rawText };
  }

  return { status: 'ok', data: parsed, requiredKeys };
}

function stripCodeFences(text) {
  let t = text.trim();
  // ```json ... ``` or ``` ... ```
  const fenceMatch = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    t = fenceMatch[1].trim();
  }
  // Occasionally a model still prefixes/suffixes stray text around the
  // JSON object even without fences — fall back to slicing between the
  // first "{" and the last "}" if the whole string doesn't parse as-is.
  return t;
}

/**
 * Full pipeline: transcript -> Anthropic call -> defensively parsed result.
 * Never throws; always resolves to { status: 'ok', data } or
 * { status: 'error', message, raw? }.
 *
 * Offline fallback: when no API key is configured (hasApiKey() === false),
 * this never calls the network. Instead, if `transcript` matches one of the
 * 3 bundled sample transcripts exactly (via `offlineSampleTexts`, injected
 * by the caller — see ExtractionPanel.jsx), it returns hand-written canned
 * data for that sample so the whole workflow can be demoed offline. If the
 * transcript doesn't match a known sample, it returns a clear error instead
 * of guessing. The live API branch below is completely unchanged from
 * before this fallback was added.
 */
export async function runExtraction({ transcript, schemaJsonText, offlineSampleTexts }) {
  if (!transcript || transcript.trim().length === 0) {
    return { status: 'error', message: 'Transcript is empty — nothing to extract.' };
  }

  if (!hasApiKey()) {
    const matchedId = matchOfflineSample(transcript, offlineSampleTexts);
    if (matchedId && OFFLINE_EXTRACTIONS[matchedId]) {
      const data = OFFLINE_EXTRACTIONS[matchedId];
      return { status: 'ok', data, raw: JSON.stringify(data, null, 2), offline: true, offlineSampleId: matchedId };
    }
    return {
      status: 'error',
      message:
        'No API key configured, and this transcript doesn\'t match one of the 3 bundled offline samples. ' +
        'Load "Sample 1", "Sample 2", or "Sample 3" to see the offline demo, or set VITE_ANTHROPIC_API_KEY to extract from any transcript.',
      raw: null
    };
  }

  const system = buildSystemPrompt(schemaJsonText);
  const userMessage = `Transcript:\n"""\n${transcript.trim()}\n"""`;

  let rawText;
  try {
    rawText = await callAnthropic({ system, userMessage });
  } catch (err) {
    return { status: 'error', message: err.message || 'Unknown error calling the extraction API.' };
  }

  return parseExtractionResponse(rawText, schemaJsonText);
}
