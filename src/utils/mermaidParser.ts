export interface MermaidDiagram {
  type: string;
  code: string;
  name: string;
  position: {
    start: number;
    end: number;
  };
}

export function extractMermaidDiagrams(markdown: string): MermaidDiagram[] {
  const diagrams: MermaidDiagram[] = [];
  const lines = markdown.split('\n');
  const mermaidBlockRegex = /```mermaid\n([\s\S]*?)```/g;
  
  let match;
  while ((match = mermaidBlockRegex.exec(markdown)) !== null) {
    const code = match[1].trim();
    const type = detectDiagramType(code);
    
    // Find the heading above this diagram
    const diagramStartLine = markdown.substring(0, match.index).split('\n').length - 1;
    let name = `${type} diagram`;
    
    // Look backwards from the diagram to find the nearest heading
    for (let i = diagramStartLine - 1; i >= 0; i--) {
      const line = lines[i].trim();
      
      // Check if it's a heading (starts with #)
      if (line.startsWith('#')) {
        // Extract the heading text without the # symbols
        name = line.replace(/^#+\s*/, '').trim();
        break;
      }
      
      // Stop if we hit another code block or empty lines followed by content
      if (line.startsWith('```') || (line === '' && i > 0 && lines[i-1].trim() === '')) {
        break;
      }
    }
    
    diagrams.push({
      type,
      code,
      name,
      position: {
        start: match.index,
        end: match.index + match[0].length
      }
    });
  }
  
  return diagrams;
}

function detectDiagramType(code: string): string {
  const firstLine = code.split('\n')[0].trim().toLowerCase();
  
  if (firstLine.includes('graph') || firstLine.includes('flowchart')) {
    return 'flowchart';
  } else if (firstLine.includes('sequencediagram')) {
    return 'sequence';
  } else if (firstLine.includes('classDiagram')) {
    return 'class';
  } else if (firstLine.includes('stateDiagram')) {
    return 'state';
  } else if (firstLine.includes('erDiagram')) {
    return 'er';
  } else if (firstLine.includes('gantt')) {
    return 'gantt';
  } else if (firstLine.includes('pie')) {
    return 'pie';
  }
  
  return 'unknown';
}