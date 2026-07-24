import React from 'react';
import { SAMPLE_META, resolveSampleText } from '../../lib/transcriptSource.js';
import sample1 from '../../../samples/sample1_clinical_en.txt?raw';
import sample2 from '../../../samples/sample2_arabic_english_mix.txt?raw';
import sample3 from '../../../samples/sample3_patient_dictation.txt?raw';

const SAMPLES_BY_ID = {
  sample1,
  sample2,
  sample3
};

export default function SampleLoader({ onLoad, disabled }) {
  function handleClick(id) {
    const text = resolveSampleText(SAMPLES_BY_ID, id);
    onLoad(text);
  }

  return (
    <div className="sample-loader">
      <span className="field-label">Load a sample transcript</span>
      <div className="sample-buttons">
        {SAMPLE_META.map((sample) => (
          <button
            key={sample.id}
            type="button"
            className="btn btn-secondary"
            title={sample.description}
            onClick={() => handleClick(sample.id)}
            disabled={disabled}
          >
            {sample.label}
          </button>
        ))}
      </div>
    </div>
  );
}
