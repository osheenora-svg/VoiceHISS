import React from 'react';

export default function PasteTranscript({ value, onChange, disabled }) {
  return (
    <div className="paste-transcript">
      <label htmlFor="transcript-textarea" className="field-label">
        Transcript
      </label>
      <textarea
        id="transcript-textarea"
        className="transcript-textarea"
        rows={10}
        placeholder="Paste an encounter transcript here, use the recorder above, or load a sample below…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      <div className="transcript-meta">
        <span>{value.trim().length} characters</span>
        {value.trim().length > 0 && (
          <button
            type="button"
            className="btn btn-link"
            onClick={() => onChange('')}
            disabled={disabled}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
