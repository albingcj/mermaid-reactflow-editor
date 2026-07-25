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
  const replaced = src.replace(/([A-Za-z0-9_]+)\[((?:(?![\"']).)*?)\]/g, (m, id, label) => {
    if (/^[\"']/.test(label)) return m;
    if (/[()\"\[\],:;]/.test(label)) {
      const esc = String(label).replace(/\\/g, "\\\\").replace(/\"/g, '\\\"');
      return `${id}[\"${esc}\"]`;
    }
    return m;
  });

  // Sanitize subgraph headers. Mermaid supports two forms:
  //   1. Bare title:        subgraph Frontend (Global)
  //   2. Explicit id+title: subgraph ide1 [Some Title]   (or  ide1 ["Some Title"])
  //
  // IMPORTANT: a naive regex that treats the entire rest of the line as "the
  // title" will misfire on form (2). For example `subgraph VPC["VPC"]` would
  // get its whole `VPC["VPC"]` chunk (id + brackets + quotes) wrapped in an
  // outer quote and escaped, producing the corrupted, unparseable header
  // `subgraph "VPC[\"VPC\"]"`. That single broken header desyncs id/title
  // parsing for the whole nested block, which is what caused garbled nested
  // VPC/AZ/subnet containers and crossed edges in rendered diagrams.
  //
  // So we must first detect the id+bracket form and only touch the bracketed
  // title portion, leaving the id token outside untouched.
  const subgraphFixed = replaced.replace(/^([ \t]*subgraph\s+)(.+)$/gmi, (m, pre, rest) => {
    const trimmed = String(rest).trim();

    // Already a quoted bare title, e.g. subgraph "Some Title" -- leave as-is.
    if (/^["']/.test(trimmed)) return m;

    // Form: id [title]  or  id ["title"]
    const idBracketMatch = trimmed.match(/^([^\s\[]+)\s*\[(.+)\]$/);
    if (idBracketMatch) {
      const id = idBracketMatch[1];
      const rawTitle = idBracketMatch[2];
      const alreadyQuoted = /^["'](.*)["']$/.test(rawTitle);
      const innerTitle = alreadyQuoted ? rawTitle.slice(1, -1) : rawTitle;

      // Only re-wrap if the title actually needs quoting (contains punctuation
      // that could break parsing) or was already quoted (re-emit consistently).
      if (alreadyQuoted || /[()"\[\],:;]/.test(innerTitle)) {
        const esc = innerTitle.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        return `${pre}${id}["${esc}"]`;
      }
      return m;
    }

    // Bare title, no explicit id/brackets, e.g. subgraph Frontend (Global)
    if (/[()"\[\],:;]/.test(trimmed)) {
      const esc = trimmed.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return `${pre}"${esc}"`;
    }
    return m;
  });

  // Enforce single diagram: keep only the first diagram block.
  // IMPORTANT: only treat a diagram keyword as the start of a *new* diagram
  // when it appears at the start of a line (optionally indented). Matching
  // anywhere in the text would misfire on perfectly valid node labels like
  // "Knowledge Graph" or "Customer Journey", silently truncating the rest
  // of the diagram.
  const diagRegex = /^[ \t]*(graph|flowchart|sequenceDiagram|stateDiagram|classDiagram|gantt|journey|erDiagram|gitGraph|pie|timeline|infoDiagram)\b/i;
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