// Utilities to extract and sanitize Mermaid code from LLM output or text blobs

// Extract mermaid code from fenced blocks or raw text. Returns inner code if fences found,
// otherwise attempts to locate a mermaid diagram start keyword and returns from there.
export function extractMermaidFromFences(content: string) {
  if (!content) return content;
  const fencedRegex = /```(?:\s*mermaid\b)?\s*\n([\s\S]*?)```/im;
  const m = content.match(fencedRegex);
  if (m && m[1]) return m[1].trim();

  // Generic fenced block without language
  const genericFenced = /```([\s\S]*?)```/m;
  const mg = content.match(genericFenced);
  if (mg && mg[1]) {
    const inner = mg[1].trim();
    if (/\b(graph|flowchart|sequenceDiagram|stateDiagram|classDiagram|gantt|journey|erDiagram|gitGraph|pie|timeline|infoDiagram)\b/i.test(inner)) {
      return inner;
    }
  }

  // Fallback: locate first mermaid keyword and return from there
  const rawStartRegex = /\b(graph|flowchart|sequenceDiagram|stateDiagram|classDiagram|gantt|journey|erDiagram|gitGraph|pie|timeline|infoDiagram)\b/i;
  const mr = content.match(rawStartRegex);
  if (mr) {
    const idx = content.indexOf(mr[0]);
    if (idx !== -1) {
      const nextFence = content.indexOf('```', idx);
      if (nextFence !== -1) return content.slice(idx, nextFence).trim();
      return content.slice(idx).trim();
    }
  }

  return content.trim();
}

// Ensure node labels and subgraph titles are quoted when they include punctuation
// and keep only the first diagram if multiple are present.
export function sanitizeMermaidLabels(src: string) {
  if (!src) return src;
  // Replace unquoted square-bracket node labels that contain punctuation
  const replaced = src.replace(/([A-Za-z0-9_]+)\[((?:(?!["']).)*?)\]/g, (m, id, label) => {
    if (/^["']/.test(label)) return m;
    if (/[()"\[\],:;]/.test(label)) {
      const esc = String(label).replace(/\\/g, "\\\\").replace(/\"/g, '\\"');
      return `${id}["${esc}"]`;
    }
    return m;
  });

  // Sanitize subgraph titles like: subgraph Frontend (Global)
  const subgraphFixed = replaced.replace(/^([ \t]*subgraph\s+)([^|\n\r]+)(\|[^\n\r]*)?$/gmi, (m, pre, title, rest) => {
    let t = String(title).trim();
    if (/^["']/.test(t)) return m;
    if (/[()"\[\],:;]/.test(t)) {
      const esc = t.replace(/\\/g, "\\\\").replace(/\"/g, '\\"');
      return `${pre}"${esc}"${rest || ""}`;
    }
    return m;
  });

  // Enforce single diagram: keep only the first diagram block
  const diagRegex = /\b(graph|flowchart|sequenceDiagram|stateDiagram|classDiagram|gantt|journey|erDiagram|gitGraph|pie|timeline|infoDiagram)\b/i;
  const allStarts: number[] = [];
  let mm: RegExpExecArray | null;
  const globalRegex = new RegExp(diagRegex.source, 'gim');
  while ((mm = globalRegex.exec(subgraphFixed)) !== null) {
    allStarts.push(mm.index);
    if (globalRegex.lastIndex === mm.index) globalRegex.lastIndex++;
  }

  if (allStarts.length <= 1) {
    return subgraphFixed;
  }

  const first = allStarts[0];
  const second = allStarts[1];
  return subgraphFixed.slice(first, second).trim();
}
