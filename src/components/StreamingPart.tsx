import { useEffect, useRef, useState } from 'react';

interface Props {
  promptSource?: string; // optional initial source to stream from
  chunkSize?: number; // how many chars per tick
  tickMs?: number; // ms between chunks
  onComplete: (result: string) => void;
  onChunk?: (partial: string) => void; // called for each streamed chunk
  onStart?: () => void;
  onStop?: () => void;
}

// Simple streaming simulator: reveals `chunkSize` chars every `tickMs` ms
export default function StreamingPart({ promptSource = '', chunkSize = 3, tickMs = 80, onComplete, onChunk, onStart, onStop }: Props) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [display, setDisplay] = useState('');
  const [inputText, setInputText] = useState(promptSource || '');
  const idxRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const start = (source?: string) => {
    if (isStreaming) return;
  if (onStart) onStart();
    const text = source ?? promptSource ?? '';
    setDisplay('');
    idxRef.current = 0;
    setIsStreaming(true);

    timerRef.current = window.setInterval(() => {
      const nextIdx = Math.min(text.length, idxRef.current + chunkSize);
      const next = text.slice(0, nextIdx);
      setDisplay(next);
      if (onChunk) onChunk(next);
      idxRef.current = nextIdx;
      if (nextIdx >= text.length) {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setIsStreaming(false);
    if (onStop) onStop();
        onComplete(text);
      }
    }, tickMs);
  };

  const stop = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsStreaming(false);
  if (onStop) onStop();
  };

  return (
    <div className="px-3 py-2 bg-white">
      <div className="mb-2 d-flex align-items-center justify-content-between">
        <label className="form-label small text-muted mb-0 fw-medium">
          <i className="bi bi-wifi me-1"></i>
          Streaming Part (demo)
        </label>
        <small className="text-muted" style={{ fontSize: 11 }}>
          Simulates LLM streaming (chunked chars)
        </small>
      </div>

      <div style={{ minHeight: 80, borderRadius: 6, overflow: 'hidden', border: '1px solid #e9ecef', padding: 10 }}>
        <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13, minHeight: 60 }}>
          {display || <span style={{ color: '#888' }}>No streamed output yet.</span>}
        </div>
      </div>

      <div className="mt-2">
        <label className="form-label small text-muted">Paste content to stream</label>
        <textarea
          className="form-control"
          rows={4}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste mermaid source here to stream..."
          style={{ fontFamily: 'monospace', fontSize: 13 }}
        />
      </div>

      <div className="mt-2 d-flex gap-2">
        <button className="btn btn-sm btn-primary" onClick={() => start(inputText)} disabled={isStreaming || !inputText}>
          Stream pasted
        </button>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => stop()} disabled={!isStreaming}>
          Stop
        </button>
        <button
          className="btn btn-sm btn-outline-success"
          onClick={() => start(promptSource)}
          disabled={isStreaming || !promptSource}
          title="Stream current editor content"
        >
          Stream editor content
        </button>
        <button
          className="btn btn-sm btn-outline-info"
          onClick={() => start('graph TD\\nA-->B\\nB-->C\\nC-->D')}
          disabled={isStreaming}
        >
          Stream sample
        </button>
      </div>

      <div className="mt-2 text-muted small">Chunk size: {chunkSize} chars · Delay: {tickMs}ms</div>
    </div>
  );
}
