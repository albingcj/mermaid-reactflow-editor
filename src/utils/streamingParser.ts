// Minimal streaming parser that extracts mermaid code from either fenced blocks or raw starts.

export type StreamHandlers = {
  onPartial?: (s: string) => void;
  onDone?: (s: string) => void;
};

export function createMermaidStreamParser(handlers: StreamHandlers) {
  let buffer = "";
  let mermaid = "";
  let inCode = false;
  let finished = false;
  const startMarker = "```mermaid";
  const endMarker = "```";
  const rawStartRegex = /\b(graph|flowchart|sequenceDiagram|stateDiagram|classDiagram|gantt|journey|erDiagram|gitGraph|pie|timeline|infoDiagram)\b/i;

  const append = (chunk: string) => {
    if (finished || !chunk) return;
    buffer += chunk;

    while (buffer.length && !finished) {
      if (!inCode) {
        const si = buffer.indexOf(startMarker);
        if (si !== -1) {
          const after = si + startMarker.length;
          if (buffer.length > after && buffer[after] === "\n") {
            buffer = buffer.slice(after + 1);
          } else {
            buffer = buffer.slice(after);
          }
          inCode = true;
          continue;
        }

        const m = buffer.match(rawStartRegex);
        if (m) {
          const idx = buffer.indexOf(m[0]);
          if (idx !== -1) {
            inCode = true;
            mermaid += buffer.slice(idx);
            buffer = "";
            handlers.onPartial?.(mermaid);
            break;
          }
        }

        if (buffer.length > 2048) {
          buffer = buffer.slice(-2048);
        }
        break;
      } else {
        const ei = buffer.indexOf(endMarker);
        if (ei === -1) {
          mermaid += buffer;
          buffer = "";
          handlers.onPartial?.(mermaid);
          break;
        } else {
          mermaid += buffer.slice(0, ei);
          finished = true;
          handlers.onDone?.(mermaid);
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
        if (idx !== -1) {
          mermaid += buffer.slice(idx);
        }
      }
    } else {
      mermaid += buffer;
    }
    finished = true;
    handlers.onDone?.(mermaid);
  };

  return { append, finish };
}
