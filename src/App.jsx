import React, { useState } from 'react';
import RecorderPanel from './components/input/RecorderPanel.jsx';
import PasteTranscript from './components/input/PasteTranscript.jsx';
import SampleLoader from './components/input/SampleLoader.jsx';
import ExtractionPanel from './components/extract/ExtractionPanel.jsx';
import ReviewForm from './components/review/ReviewForm.jsx';
import CommittedList from './components/committed/CommittedList.jsx';

export default function App() {
  const [transcript, setTranscript] = useState('');
  const [draft, setDraft] = useState(null);
  const [extractedAt, setExtractedAt] = useState(null);
  const [committedRecords, setCommittedRecords] = useState([]);

  function handleExtracted(data, timestamp) {
    setDraft(data);
    setExtractedAt(timestamp);
  }

  function handleCommit(record) {
    setCommittedRecords((prev) => [record, ...prev]);
  }

  function handleStartNew() {
    setTranscript('');
    setDraft(null);
    setExtractedAt(null);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>VoiceHIS</h1>
        <p className="app-subtitle">
          Outpatient consultation intake — demo AI dictation to structured HIS entry
        </p>
      </header>

      <main className="input-page">
        <section className="panel">
          <h2>1. Capture the encounter</h2>

          <RecorderPanel onTranscriptChange={setTranscript} disabled={false} />

          <div className="divider">
            <span>or</span>
          </div>

          <PasteTranscript value={transcript} onChange={setTranscript} disabled={false} />

          <SampleLoader onLoad={setTranscript} disabled={false} />
        </section>

        <ExtractionPanel transcript={transcript} onExtracted={handleExtracted} />

        {draft && (
          <ReviewForm
            key={JSON.stringify(draft)}
            draft={draft}
            extractedAt={extractedAt}
            transcript={transcript}
            onCommit={handleCommit}
            onStartNew={handleStartNew}
          />
        )}

        <CommittedList records={committedRecords} />
      </main>
    </div>
  );
}
