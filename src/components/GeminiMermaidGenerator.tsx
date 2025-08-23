import { useState } from 'react';
import LLM from '@themaximalist/llm.js';
import { streamGemini } from '../utils/geminiStream';

interface Props {
  onComplete: (mermaidCode: string) => void;
  onChunk?: (partial: string) => void;
  onStart?: () => void;
  onStop?: () => void;
}

const MERMAID_SYSTEM_PROMPT = `You are a Mermaid diagram expert. STRICTLY output ONLY Mermaid diagram code. Do NOT provide any explanations, commentary, or markdown outside the code.

Output rules (enforceable):
- Prefer to wrap the Mermaid code with fenced block using \`\`\`mermaid ... \`\`\` if possible, otherwise output raw Mermaid text only.
- Do NOT include any surrounding prose, headings, or markdown other than the optional code fence.
- Generate valid Mermaid syntax for the requested diagram type (flowchart, sequenceDiagram, classDiagram, stateDiagram, gantt, journey, erDiagram, gitGraph, etc.).
- Use unique node IDs and descriptive labels.
- Keep output concise: only the diagram source.

If the user request is ambiguous, choose reasonable defaults but still output only Mermaid code.`;

export default function GeminiMermaidGenerator({ onComplete, onChunk, onStart, onStop }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.0-flash');
  const [userInput, setUserInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const examplePrompts = [
    "Create a flowchart for user authentication process",
    "Generate a sequence diagram for API calls between frontend and backend",
    "Create a class diagram for an e-commerce system",
    "Make a state diagram for order processing workflow",
    "Design a git workflow diagram",
    "Create a network architecture diagram"
  ];

  // Few-shot examples: user -> assistant pairs to bias structure
  const FEW_SHOT_EXAMPLES = [
    {
      user: "Create a simple signup flow (start, fill form, verify email, success)",
      assistant: "```mermaid\ngraph TB\n  A[Start] --> B[Fill Signup Form]\n  B --> C[Send Verification Email]\n  C --> D{Email Verified?}\n  D -- Yes --> E[Account Created]\n  D -- No --> F[Resend Email]\n  F --> C\n```"
    },
    {
      user: "Generate a sequence diagram for a client requesting data from API",
      assistant: "```mermaid\nsequenceDiagram\n  participant Client\n  participant Server\n  Client->>Server: GET /items\n  Server-->>Client: 200 OK (items)\n```"
    }
  ];

  const useExamplePrompt = (prompt: string) => {
    setUserInput(prompt);
  };

  const generateMermaid = async () => {
    if (!apiKey || !userInput) {
      setError('Please provide both API key and prompt');
      return;
    }
    
  setLoading(true);
  setResponse('');
    setError('');
    
    if (onStart) onStart();

  // Build messages: system, few-shot examples, then user prompt
    // We inject few-shot examples as alternating user/assistant messages
    const messages: any[] = [{ role: "system" as const, content: MERMAID_SYSTEM_PROMPT }];
    for (const ex of FEW_SHOT_EXAMPLES) {
      messages.push({ role: "user" as const, content: ex.user });
      messages.push({ role: "assistant" as const, content: ex.assistant });
    }

  // Augmented prompt shown to the user while generating (for transparency)
  const augmentedPrompt = `---BEGIN GENERATED PROMPT---\n${userInput}\n---END GENERATED PROMPT---`;
  const originalUserInput = userInput;
  setUserInput(augmentedPrompt);

  messages.push({ role: "user" as const, content: userInput });

    const config = {
      service: 'google',
      model: model,
      apiKey: apiKey,
      temperature: 0.3, // Lower temperature for more consistent code generation
      max_tokens: 20000,
      stream: true
    };

    // Helper: create a parser that extracts mermaid code between ```mermaid and ```
    // Also detects raw (unfenced) mermaid starts like 'graph', 'sequenceDiagram', etc.
    function createMermaidStreamParser(onPartial: (s: string) => void, onDone: (s: string) => void) {
      let buffer = '';
      let mermaid = '';
      let inCode = false;
      let finished = false;
      const startMarker = '```mermaid';
      const endMarker = '```';
      const rawStartRegex = /\b(graph|flowchart|sequenceDiagram|stateDiagram|classDiagram|gantt|journey|erDiagram|gitGraph|pie|timeline|infoDiagram)\b/i;

      const append = (chunk: string) => {
        if (finished) return;
        buffer += chunk;
        while (buffer.length && !finished) {
          if (!inCode) {
            const si = buffer.indexOf(startMarker);
            if (si !== -1) {
              const after = si + startMarker.length;
              if (buffer.length > after && buffer[after] === '\n') buffer = buffer.slice(after + 1);
              else buffer = buffer.slice(after);
              inCode = true;
              continue;
            }
            const m = buffer.match(rawStartRegex);
            if (m) {
              const idx = buffer.indexOf(m[0]);
              if (idx !== -1) {
                inCode = true;
                mermaid += buffer.slice(idx);
                buffer = '';
                onPartial(mermaid);
                break;
              }
            }
            if (buffer.length > 2048) buffer = buffer.slice(-2048);
            break;
          } else {
            const ei = buffer.indexOf(endMarker);
            if (ei === -1) {
              mermaid += buffer;
              buffer = '';
              onPartial(mermaid);
              break;
            } else {
              mermaid += buffer.slice(0, ei);
              finished = true;
              onDone(mermaid);
              buffer = buffer.slice(ei + endMarker.length);
              break;
            }
          }
        }
      };

      const finish = () => {
        if (finished) return;
        if (!inCode) {
          const m = buffer.match(rawStartRegex);
          if (m) {
            const idx = buffer.indexOf(m[0]);
            if (idx !== -1) mermaid += buffer.slice(idx);
          }
        } else {
          mermaid += buffer;
        }
        finished = true;
        onDone(mermaid);
      };

      return { append, finish };
    }

    // Instantiate parser first so helpers can reference it
    const parser = createMermaidStreamParser(
      (partial) => {
        setResponse(partial);
        if (onChunk) onChunk(partial);
      },
      (finalStr) => {
        const cleaned = finalStr.trim();
        setResponse(cleaned);
        if (onComplete) onComplete(cleaned);
      }
    );

    try {
      console.log('[GeminiMermaidGenerator] starting stream (prefer Google SDK)', { model: config.model });

      // Helpers for consumption and coercion
      const textDecoder = new TextDecoder();
      const coerceToString = (token: any): string => {
        try {
          if (typeof token === 'string') return token;
          if (ArrayBuffer.isView(token) || token?.buffer instanceof ArrayBuffer) {
            try { return textDecoder.decode(token as any); } catch { return String(token); }
          }
          if (typeof token === 'object' && token !== null) {
            const s = token.text ?? token.delta ?? token.content ?? token.message?.content ?? token.choices?.[0]?.delta?.content ?? token.choices?.[0]?.text;
            if (typeof s === 'string') return s;
            if (typeof token.data === 'string') return token.data;
            return JSON.stringify(token);
          }
          return String(token);
        } catch {
          return String(token);
        }
      };
      const isAsyncIterable = (obj: any) => obj && typeof obj[Symbol.asyncIterator] === 'function';
      const isReadableStreamLike = (obj: any) => obj && typeof obj.getReader === 'function';

      const emitPiece = (piece: string) => {
        if (!piece) return;
        console.log('[GeminiMermaidGenerator] piece', piece.slice(0, 200));
        parser.append(piece);
      };
      const consumeString = (s: string) => {
        if (!s) return;
        if (s.includes('data:')) {
          let current = '';
          const lines = s.split(/\r?\n/);
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const payload = line.slice(5).trimStart();
              if (payload === '[DONE]') continue;
              try {
                const obj = JSON.parse(payload);
                const text = obj.text ?? obj.delta ?? obj.content ?? obj.message?.content ?? obj.candidates?.[0]?.content?.parts?.[0]?.text ?? obj.choices?.[0]?.delta?.content ?? obj.choices?.[0]?.text;
                if (typeof text === 'string') emitPiece(text);
                else emitPiece(payload);
              } catch {
                emitPiece(payload);
              }
            } else if (line.trim() === '') {
              if (current) { emitPiece(current); current = ''; }
            } else {
              current += (current ? '\n' : '') + line;
            }
          }
          if (current) emitPiece(current);
        } else {
          console.log('[GeminiMermaidGenerator] chunk', s.slice(0, 200));
          parser.append(s);
        }
      };

  // Prefer direct Google SDK streaming; fall back to LLM.js
  try {
        await streamGemini(apiKey, model, MERMAID_SYSTEM_PROMPT, userInput, (txt) => consumeString(txt));
      } catch (e) {
        console.warn('[GeminiMermaidGenerator] direct Google SDK streaming failed, falling back to LLM.js', e);
        const streamAny: any = await LLM(messages, config);
        if (isAsyncIterable(streamAny)) {
          console.log('[GeminiMermaidGenerator] consuming async iterator stream');
          for await (const token of streamAny) {
            try { console.log('[GeminiMermaidGenerator] raw token', token); } catch {}
            const s = coerceToString(token);
            consumeString(s);
          }
        } else if (isReadableStreamLike(streamAny)) {
          console.log('[GeminiMermaidGenerator] consuming ReadableStream');
          const reader = (streamAny as ReadableStream<any>).getReader();
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const s = coerceToString(value);
            consumeString(s);
          }
        } else if (streamAny?.body && isReadableStreamLike(streamAny.body)) {
          console.log('[GeminiMermaidGenerator] consuming Response.body ReadableStream');
          const reader = (streamAny.body as ReadableStream<any>).getReader();
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const s = coerceToString(value);
            consumeString(s);
          }
        } else {
          console.log('[GeminiMermaidGenerator] unknown stream type; attempting to coerce once');
          const s = coerceToString(streamAny);
          consumeString(s);
        }
      }

      // Ensure parser finalizes when stream ends
      parser.finish();
    } catch (error: any) {
      const errorMessage = error?.message || String(error) || 'Failed to generate Mermaid code';
      setError(errorMessage);
      setResponse('Error: ' + errorMessage);
    } finally {
      // restore original user input
      setUserInput(originalUserInput);
      setLoading(false);
      if (onStop) onStop();
    }
  };

  const clearResponse = () => {
    setResponse('');
    setError('');
  };

  return (
    <div className="px-3 py-2 bg-white">
      <div className="mb-2 d-flex align-items-center justify-content-between">
        <label className="form-label small text-muted mb-0 fw-medium">
          <i className="bi bi-robot me-1"></i>
          AI Mermaid Generator
        </label>
        <small className="text-muted" style={{ fontSize: 11 }}>
          Powered by Gemini
        </small>
      </div>

      {/* API Configuration */}
      <div className="mb-3">
        <div className="row g-2">
          <div className="col-8">
            <label className="form-label small text-muted">Gemini API Key</label>
            <input
              type="password"
              className="form-control form-control-sm"
              placeholder="Enter your Gemini API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="col-4">
            <label className="form-label small text-muted">Model</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="e.g. gemini-1.5-pro or gemini-1.5-flash"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
            <div>
              <small className="text-muted">You can enter any Gemini model name.</small>
            </div>
          </div>
        </div>
      </div>

      {/* User Input */}
      <div className="mb-3">
        <label className="form-label small text-muted">Describe your diagram</label>
        <textarea
          className="form-control"
          rows={3}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="E.g., 'Create a flowchart for user authentication process' or 'Generate a sequence diagram for API calls'"
          style={{ fontSize: 13 }}
        />
      </div>

      {/* Example Prompts */}
      <div className="mb-3">
        <label className="form-label small text-muted">Quick Examples</label>
        <div className="d-flex flex-wrap gap-1">
          {examplePrompts.map((prompt, index) => (
            <button
              key={index}
              type="button"
              className="btn btn-outline-secondary btn-sm"
              style={{ fontSize: 11 }}
              onClick={() => useExamplePrompt(prompt)}
              disabled={loading}
            >
              {prompt.substring(0, 30)}{prompt.length > 30 ? '...' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-3 d-flex gap-2">
        <button 
          className="btn btn-sm btn-primary" 
          onClick={generateMermaid} 
          disabled={loading || !apiKey || !userInput}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              Generating...
            </>
          ) : (
            <>
              <i className="bi bi-magic me-1"></i>
              Generate Mermaid
            </>
          )}
        </button>
        <button 
          className="btn btn-sm btn-outline-secondary" 
          onClick={clearResponse}
          disabled={loading}
        >
          Clear
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger alert-sm py-2" role="alert">
          <i className="bi bi-exclamation-triangle me-1"></i>
          {error}
        </div>
      )}

      {/* Response Display */}
      <div style={{ minHeight: 120, borderRadius: 6, overflow: 'hidden', border: '1px solid #e9ecef', backgroundColor: '#f8f9fa' }}>
        <div className="p-2 border-bottom bg-light">
          <small className="text-muted fw-medium">Generated Mermaid Code:</small>
        </div>
        <div style={{ padding: 10, minHeight: 80, maxHeight: 300, overflowY: 'auto' }}>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            fontFamily: 'monospace', 
            fontSize: 12, 
            margin: 0,
            color: response ? '#333' : '#888'
          }}>
            {response || 'Generated Mermaid code will appear here...'}
          </pre>
        </div>
      </div>

  {/* raw stream debug removed; use console.log to inspect tokens */}

      {/* Help Text */}
      <div className="mt-2">
        <small className="text-muted">
          <i className="bi bi-info-circle me-1"></i>
          Tip: Be specific about the type of diagram and include key elements you want to visualize.
        </small>
      </div>
    </div>
  );
}
