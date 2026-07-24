import React, { useEffect, useRef, useState } from 'react';
import { getSpeechSupportState } from '../../lib/transcriptSource.js';

/**
 * Browser audio recording with a live transcript, using the Web Speech API.
 * Falls back to a clear message (no crash, no silent no-op) when the API
 * isn't available — e.g. Firefox or Safari without the vendor prefix.
 */
export default function RecorderPanel({ onTranscriptChange, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  const SpeechRecognitionImpl =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const support = getSpeechSupportState(Boolean(SpeechRecognitionImpl));

  useEffect(() => {
    return () => {
      // Clean up if the component unmounts mid-recording.
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, []);

  function startRecording() {
    if (!support.supported) return;
    setError(null);

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = liveText ? liveText + ' ' : '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += chunk + ' ';
        } else {
          interim += chunk;
        }
      }
      const combined = (finalTranscript + interim).trim();
      setLiveText(combined);
      onTranscriptChange(combined);
    };

    recognition.onerror = (event) => {
      setError(
        event.error === 'not-allowed'
          ? 'Microphone permission was denied. Allow mic access, or paste the transcript instead.'
          : `Speech recognition error: ${event.error}. You can paste the transcript instead.`
      );
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  function stopRecording() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  }

  if (!support.supported) {
    return (
      <div className="recorder-panel recorder-panel--unsupported" role="note">
        <p className="recorder-fallback-message">{support.message}</p>
      </div>
    );
  }

  return (
    <div className="recorder-panel">
      <div className="recorder-controls">
        <button
          type="button"
          className={isRecording ? 'btn btn-recording' : 'btn btn-primary'}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled}
        >
          {isRecording ? '● Stop recording' : '🎙 Start recording'}
        </button>
        {isRecording && <span className="recording-indicator">Listening…</span>}
      </div>
      {error && <p className="recorder-error">{error}</p>}
      <p className="recorder-hint">
        Speech is transcribed live as you speak. Review and edit the text below before extracting.
      </p>
    </div>
  );
}
