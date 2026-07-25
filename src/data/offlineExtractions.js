/**
 * Offline demo data — used ONLY when no Anthropic API key is configured
 * (see extract.js#runExtraction / anthropicClient.js#hasApiKey). This lets
 * the full input -> extract -> review -> commit workflow be demonstrated
 * without network access or a key.
 *
 * These were written by hand, following the exact same extraction rules the
 * live system prompt enforces (see extract.js#buildSystemPrompt):
 *  - null for anything not explicitly stated
 *  - no inferred examination/diagnosis findings
 *  - free-text fields keep the speaker's own wording/language
 *  - coded fields (diagnosis, icd10, medication names) normalized to English
 *  - confidence reflects how explicitly/confidently it was actually stated
 *
 * IMPORTANT: this is demo-only content for 3 fixed, known transcripts. It is
 * matched by exact transcript text (see matchOfflineSample below) — it is
 * never used as a fallback for arbitrary/unrecognized transcripts, so the
 * "never fabricate data" rule holds in offline mode too.
 */

export const OFFLINE_EXTRACTIONS = {
  sample1: {
    chiefComplaint: { value: 'Sore throat', confidence: 'high' },
    duration: { value: 'Three days', confidence: 'high' },
    temperature: { value: '38.2°C', confidence: 'high' },
    bloodPressure: { value: '120/80 mmHg', confidence: 'high' },
    allergies: { value: 'No known allergies', confidence: 'high' },
    examination: { value: 'Red, inflamed tonsils', confidence: 'high' },
    diagnosis: { value: 'Acute pharyngitis', confidence: 'high' },
    icd10Suggestion: {
      value: [
        { code: 'J02.9', label: 'Acute pharyngitis, unspecified' },
        { code: 'J03.90', label: 'Acute tonsillitis, unspecified' },
        { code: 'J06.9', label: 'Acute upper respiratory infection, unspecified' }
      ],
      confidence: 'medium'
    },
    medications: [
      {
        name: { value: 'Amoxicillin', confidence: 'high' },
        dose: { value: '500 mg', confidence: 'high' },
        frequency: { value: 'Three times daily for seven days', confidence: 'high' }
      }
    ],
    followUp: { value: 'In one week, if symptoms persist', confidence: 'high' }
  },

  // Mixed Arabic/English clinician dictation. Free-text fields keep the
  // speaker's own mixed wording; diagnosis/medication name are normalized to
  // English per the coded-field rule.
  sample2: {
    chiefComplaint: { value: 'عنده sore throat', confidence: 'high' },
    duration: { value: '3 days', confidence: 'high' },
    temperature: { value: '38.2°C', confidence: 'high' },
    bloodPressure: { value: '120/80 mmHg', confidence: 'high' },
    allergies: { value: 'مفيش known allergies', confidence: 'high' },
    examination: { value: 'red inflamed tonsils', confidence: 'high' },
    diagnosis: { value: 'Acute pharyngitis', confidence: 'high' },
    icd10Suggestion: {
      value: [
        { code: 'J02.9', label: 'Acute pharyngitis, unspecified' },
        { code: 'J03.90', label: 'Acute tonsillitis, unspecified' },
        { code: 'J06.9', label: 'Acute upper respiratory infection, unspecified' }
      ],
      confidence: 'medium'
    },
    medications: [
      {
        name: { value: 'Amoxicillin', confidence: 'high' },
        dose: { value: '500 mg', confidence: 'high' },
        frequency: { value: 'Three times daily for seven days', confidence: 'high' }
      }
    ],
    followUp: { value: 'بعد أسبوع لو الأعراض لسه موجودة', confidence: 'high' }
  },

  // Messy, hedged patient-reported dictation. Note: the patient never states
  // a diagnosis or blood pressure at all — both stay null, and no ICD-10
  // candidates are suggested for an undiagnosed condition. Hedged values
  // ("I think", "around") get "medium" confidence rather than "high".
  sample3: {
    chiefComplaint: { value: 'Sore throat', confidence: 'high' },
    duration: { value: 'About three days', confidence: 'high' },
    temperature: { value: '38.2°C (approximate — patient said "around")', confidence: 'medium' },
    bloodPressure: { value: null, confidence: null },
    allergies: { value: 'No known allergies', confidence: 'high' },
    examination: { value: 'Tonsils red (per patient, relaying doctor\u2019s exam)', confidence: 'medium' },
    diagnosis: { value: null, confidence: null },
    icd10Suggestion: { value: [], confidence: null },
    medications: [
      {
        name: { value: 'Amoxicillin', confidence: 'high' },
        dose: { value: '500 mg (patient said "I think")', confidence: 'medium' },
        frequency: { value: 'Three times daily for one week', confidence: 'high' }
      }
    ],
    followUp: { value: 'Return if not better after one week', confidence: 'high' }
  }
};

/**
 * Matches an incoming transcript against the raw text of the 3 bundled
 * samples and returns the matching sample id, or null if it doesn't match
 * any of them. `sampleTextsById` must be a map like
 * { sample1: '...raw text...', sample2: '...', sample3: '...' } — callers
 * supply this (rather than this module reading files itself) so the same
 * matching logic works identically in the browser (Vite `?raw` imports) and
 * in plain Node test/script contexts (fs.readFileSync). Comparison is
 * whitespace-trim-insensitive only — this is intentionally strict so an
 * unrecognized transcript falls through to a clear error rather than
 * silently matching the wrong canned data.
 */
export function matchOfflineSample(transcript, sampleTextsById) {
  if (!transcript || !sampleTextsById) return null;
  const normalized = transcript.trim();
  for (const [id, text] of Object.entries(sampleTextsById)) {
    if (typeof text === 'string' && text.trim() === normalized) {
      return id;
    }
  }
  return null;
}
