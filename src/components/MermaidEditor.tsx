import Editor from '@monaco-editor/react';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function MermaidEditor({ value, onChange }: Props) {
  return (
    <div className="px-3 py-2 bg-white">
      <div className="mb-2 d-flex align-items-center justify-content-between">
        <label className="form-label small text-muted mb-0 fw-medium">
          <i className="bi bi-file-code me-1"></i>
          Mermaid Source
        </label>
        <small className="text-muted" style={{ fontSize: 11 }}>
          Edit mermaid code only
        </small>
      </div>

      <div style={{ height: 260, borderRadius: 6, overflow: 'hidden', border: '1px solid #e9ecef' }}>
        <Editor
          height="100%"
          defaultLanguage="markdown"
          language="markdown"
          value={value}
          onChange={(val) => onChange(val ?? '')}
          options={{
            minimap: { enabled: false },
            wordWrap: 'on',
            fontSize: 13,
            lineNumbers: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            tabSize: 2,
          }}
        />
      </div>

      <div className="mt-2 text-muted small">Tip: this editor accepts only Mermaid code (no markdown fences).</div>
    </div>
  );
}
