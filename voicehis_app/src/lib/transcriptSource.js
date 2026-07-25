/**
 * Pure helpers for the input page. Kept free of React so they can be
 * exercised directly in Node (see /scripts/verify-samples.mjs) without a
 * browser or bundler.
 */

export const SAMPLE_META = [
  {
    id: 'sample1',
    label: 'Sample 1 — Clinical English',
    description: 'Clean clinician-dictated English narrative.'
  },
  {
    id: 'sample2',
    label: 'Sample 2 — Arabic/English mix',
    description: 'Mixed Arabic/English clinician dictation.'
  },
  {
    id: 'sample3',
    label: 'Sample 3 — Patient dictation',
    description: 'Messy, hesitant patient-reported narrative (BP not stated).'
  }
];

/**
 * Given the raw sample text map (id -> string) and a sample id, return the
 * trimmed transcript text that should populate the transcript textarea.
 * Throws if the id is unknown, so a bad wiring fails loudly instead of
 * silently loading blank text.
 */
export function resolveSampleText(samplesById, id) {
  if (!Object.prototype.hasOwnProperty.call(samplesById, id)) {
    throw new Error(`Unknown sample id: ${id}`);
  }
  const text = samplesById[id];
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new Error(`Sample "${id}" is empty`);
  }
  return text.trim();
}

/**
 * Decide what the recording control should show, based on whether the
 * browser exposes SpeechRecognition. Pure so it's testable without a DOM.
 */
export function getSpeechSupportState(hasSpeechRecognition) {
  return hasSpeechRecognition
    ? { supported: true, message: null }
    : {
        supported: false,
        message:
          'Live speech-to-text isn\'t available in this browser. Use the paste box below, or try Chrome/Edge on desktop.'
      };
}
