import { Node, Edge, MarkerType, Position } from "reactflow";
import mermaid from "mermaid";
import dagre from "dagre";

export interface ReactFlowData {
  nodes: Node[];
  edges: Edge[];
}

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  flowchart: {
    htmlLabels: false,
    curve: "linear",
  },
});

interface MermaidNode {
  id: string;
  label: string;
  shape: string;
  subgraph?: string;
  parentSubgraph?: string; // For nested subgraphs
}

interface MermaidEdge {
  source: string;
  target: string;
  label?: string;
  type: string;
  isSourceSubgraph?: boolean;
  isTargetSubgraph?: boolean;
}

interface SubgraphInfo {
  id: string;
  title: string;
  nodes: string[];
  parentId?: string; // For nested subgraphs
  childrenIds: string[]; // For nested subgraphs
  direction?: string; // Optional per-subgraph layout direction (TB/LR/BT/RL)
}

interface SubgraphLayout {
  id: string;
  title: string;
  nodes: Map<string, { x: number; y: number; width: number; height: number }>;
  width: number;
  height: number;
  position?: { x: number; y: number };
  parentId?: string;
}

// Layout spacing constants - Fine-tune these for better visual separation
const SUBGRAPH_HEADER_HEIGHT = 35; // Increased for proper title clearance
const SUBGRAPH_PADDING = 8; // Base padding around subgraph edges (reduced to tighten layout)
const SUBGRAPH_CONTENT_TOP_MARGIN = 10; // Additional space below title before content

// Node spacing within subgraphs - controls minimum distance between nodes
const NODE_SEPARATION_HORIZONTAL = 80; // Minimum horizontal distance between nodes in same rank
const NODE_SEPARATION_VERTICAL = 100; // Minimum vertical distance between different ranks

// Container spacing for meta-graph layout - controls distance between top-level elements
const CONTAINER_SEPARATION_HORIZONTAL = 120; // Distance between top-level subgraphs/nodes horizontally (reduced)
const CONTAINER_SEPARATION_VERTICAL = 160; // Distance between top-level subgraphs/nodes vertically (slightly reduced)

// Nested subgraph spacing - controls spacing of child subgraphs within parents
const NESTED_SUBGRAPH_SEPARATION_HORIZONTAL = 120; // Distance between sibling subgraphs (increased)
const NESTED_SUBGRAPH_SEPARATION_VERTICAL = 140; // Distance between nested subgraph ranks (increased)

// Margin constants for different layout contexts
const META_GRAPH_MARGIN = 100; // Outer margin for the entire diagram
const NESTED_CONTENT_MARGIN = 40; // Margin around content within nested subgraphs (increased)
const MIXED_CONTENT_VERTICAL_SPACING = 100; // Extra spacing between nodes and nested subgraphs in same parent (increased)
const MIXED_CONTENT_HORIZONTAL_SPACING = 120; // Extra spacing when laying out children beside nodes (LR/RL)
const DAGRE_RANKER: 'network-simplex' | 'tight-tree' | 'longest-path' = 'tight-tree';

const DEBUG = (typeof process !== 'undefined' && typeof process.env !== 'undefined' && process.env.DEBUG_MERMAID === 'true');
 
function debugLog(...args: any[]) {
  if (DEBUG){
    console.log("[MermaidConverter]", ...args);
  }
}

// The `cleanLabel` helper was previously used to strip HTML from labels and
// normalize line breaks. It is currently unused because we use `enhancedCleanLabel`
// throughout parsing which provides better unicode and escape handling.
//
// Keeping the original implementation commented out for reference and to
// make it easy to re-enable if needed in the future.
/*
function cleanLabel(label: string): string {
  return label
    .replace(/<br\s*\/?>(/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .trim();
}
*/

function getNodeShape(nodeDefinition: string): string {
  if (nodeDefinition.includes("{") && nodeDefinition.includes("}"))
    return "diamond";
  if (nodeDefinition.includes("((") && nodeDefinition.includes("))"))
    return "circle";
  if (nodeDefinition.includes("([") && nodeDefinition.includes("])"))
    return "stadium";
  if (nodeDefinition.includes("[") && nodeDefinition.includes("]"))
    return "rect";
  if (nodeDefinition.includes("(") && nodeDefinition.includes(")"))
    return "round";
  return "rect";
}

// Update the parseMermaidCode function to handle subgraph connections

export function parseMermaidCode(code: string): {
  nodes: MermaidNode[];
  edges: MermaidEdge[];
  subgraphs: SubgraphInfo[];
  direction: string;
} {
  const nodes: MermaidNode[] = [];
  const edges: MermaidEdge[] = [];
  const subgraphs: SubgraphInfo[] = [];
  const nodeMap = new Map<string, MermaidNode>();
  const subgraphMap = new Map<string, SubgraphInfo>();
  
  // Track all node definitions found in the code
  const nodeDefinitions = new Map<string, { label: string; shape: string; fullDef: string }>();

  // Default direction is top-to-bottom
  let direction = "TB";

  // Remove comments and clean up the code
  let cleanCode = code
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("%%"))
    .join("\n");

  // Pre-process to fix multi-line node definitions
  // This handles cases where labels are split across lines like:
  // AI["Transactions Database
  // (MySQL)"]
  const preprocessedLines: string[] = [];
  const rawLines = cleanCode.split("\n");
  let i = 0;
  
  while (i < rawLines.length) {
    const line = rawLines[i].trim();
    
    // Check if this line has an unclosed bracket (indicating a multi-line definition)
    const openBrackets = (line.match(/[\[\(\{]/g) || []).length;
    const closeBrackets = (line.match(/[\]\)\}]/g) || []).length;
    
    if (openBrackets > closeBrackets && i < rawLines.length - 1) {
      // This line has unclosed brackets, try to find the closing line
      let combinedLine = line;
      let j = i + 1;
      let currentOpenBrackets = openBrackets;
      let currentCloseBrackets = closeBrackets;
      
      while (j < rawLines.length && currentOpenBrackets > currentCloseBrackets) {
        const nextLine = rawLines[j].trim();
        combinedLine += " " + nextLine;
        
        currentOpenBrackets += (nextLine.match(/[\[\(\{]/g) || []).length;
        currentCloseBrackets += (nextLine.match(/[\]\)\}]/g) || []).length;
        j++;
      }
      
      preprocessedLines.push(combinedLine);
      i = j; // Skip the lines we just combined
    } else {
      preprocessedLines.push(line);
      i++;
    }
  }
  
  // Update cleanCode with preprocessed lines
  cleanCode = preprocessedLines.join("\n");

  debugLog("Clean code:", cleanCode);

  // Parse graph direction - Updated to handle both flowchart and graph
  const directionMatch = cleanCode.match(/(?:flowchart|graph)\s+(TB|TD|BT|RL|LR)/i);
  if (directionMatch) {
    direction = directionMatch[1].toUpperCase();
    // Normalize TD to TB
    if (direction === "TD") direction = "TB";
    debugLog("Detected graph direction:", direction);
  }

  const lines = cleanCode.split("\n");
  const subgraphStack: string[] = [];

  // Enhanced cleanLabel function to handle unicode and special characters
  function enhancedCleanLabel(label: string): string {
    return label
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/\\u([0-9a-fA-F]{4})/g, (match, code) => {
        try {
          return String.fromCharCode(parseInt(code, 16));
        } catch (e) {
          debugLog(`Warning: Could not parse unicode character: ${match}`);
          return match;
        }
      })
      .replace(/\\n/g, "\n")
      .replace(/\s*\n\s*/g, "\n") // Normalize line breaks and remove extra whitespace
      .trim();
  }

  // Pre-scan to find all node definitions
  debugLog("Pre-scanning for node definitions...");
  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("subgraph") || trimmedLine === "end" || trimmedLine.startsWith("%%")) return;

    // Improved node definition scanner: match complete node definitions
    // Look for node definitions that appear at word boundaries or after arrows/spaces
    // This prevents matching letters within labels
    const nodeDefPattern = /(^|[\s\-\>]|\|[^|]*\|)([A-Za-z0-9_]+)([\[\(\{])/g;
    let match;
    const processedMatches = new Set(); // Track processed positions to avoid duplicates
    
    while ((match = nodeDefPattern.exec(trimmedLine)) !== null) {
      const prefix = match[1];
      const nodeId = match[2];
      const openChar = match[3];
      const matchStart = match.index + prefix.length; // Start of node ID
      
      // Skip if we already processed this position or if node already exists
      if (processedMatches.has(matchStart) || nodeDefinitions.has(nodeId)) continue;
      processedMatches.add(matchStart);

      const openIndex = matchStart + nodeId.length; // position of opening bracket
      const closeChar = openChar === '[' ? ']' : openChar === '(' ? ')' : '}';

      // Find the matching closing bracket, considering nesting
      let closeIndex = -1;
      let depth = 0;
      for (let i = openIndex; i < trimmedLine.length; i++) {
        const char = trimmedLine[i];
        if (char === openChar) {
          depth++;
        } else if (char === closeChar) {
          depth--;
          if (depth === 0) {
            closeIndex = i;
            break;
          }
        }
      }

      let fullDef = nodeId;
      let shapeDef = '';
      if (closeIndex !== -1) {
        fullDef = trimmedLine.slice(matchStart, closeIndex + 1);
        shapeDef = trimmedLine.slice(openIndex, closeIndex + 1);
      } else {
        // Fallback: try to find any bracket sequence starting from our position
        const remainingLine = trimmedLine.slice(matchStart);
        const fallback = remainingLine.match(/([A-Za-z0-9_]+)([\[\(\{][^\]\)\}]*[\]\)\}])/);
        if (fallback && fallback[1] === nodeId) {
          fullDef = fallback[0];
          shapeDef = fallback[2];
        }
      }

      // Only process if we have a valid shape definition
      if (shapeDef) {
        const shape = getNodeShape(fullDef);

        let rawLabel = nodeId;
        const labelContentMatch = shapeDef.match(/^[\[\(\{](.*)[\]\)\}]$/s);
        if (labelContentMatch) {
          rawLabel = labelContentMatch[1];
          // Strip surrounding quotes if present
          rawLabel = rawLabel.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
        }

        const label = enhancedCleanLabel(rawLabel);
        nodeDefinitions.set(nodeId, { label, shape, fullDef });
        debugLog(`Pre-scan found node definition: ${nodeId} -> "${label}" (${shape}) from line ${lineIndex + 1}`);
      }
    }
  });

  // First pass: identify all subgraphs
  debugLog("First pass: identifying subgraphs...");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Handle subgraph start - more robust parsing to support:
    // - subgraph id [Title]
    // - subgraph id "Title with spaces"
    // - subgraph "Title with spaces" (no id)
  if (line.startsWith('subgraph')) {
      const rest = line.slice('subgraph'.length).trim();

      let subgraphId: string | undefined;
      let subgraphTitle: string | undefined;

      // If rest starts with a quote, treat entire quoted string as title and generate an id
      const quoteMatch = rest.match(/^(["'])(.*?)\1/);
      if (quoteMatch) {
        subgraphTitle = quoteMatch[2];
        // create a slug id from title
        subgraphId = subgraphTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || `sg-${i}`;
      } else {
        // Otherwise, try to extract an id and an optional bracketed title first
        const bracketMatch = rest.match(/^([^\s\[]+)(?:\s*\[(.+?)\])?/);
        if (bracketMatch) {
          subgraphId = bracketMatch[1];
          if (bracketMatch[2]) subgraphTitle = bracketMatch[2];
        }

        // If no explicit bracketed/quoted title was found and the rest contains spaces,
        // treat the entire `rest` as the subgraph title (this supports `subgraph Component C`).
        if (!subgraphTitle && rest.indexOf(' ') !== -1) {
          subgraphTitle = rest;
          // Generate a slug id from the title
          subgraphId = subgraphTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || `sg-${i}`;
        }

        // Also check for an explicit quoted title after the id: e.g. subgraph id "Title"
        if (!subgraphTitle) {
          const altQuote = rest.match(/^[^\s]+\s+(["'])(.*?)\1/);
          if (altQuote) subgraphTitle = altQuote[2];
        }
      }

      if (subgraphId) {
        // Get parent from stack if this is a nested subgraph
        const parentId =
          subgraphStack.length > 0
            ? subgraphStack[subgraphStack.length - 1]
            : undefined;

        const cleanTitle = subgraphTitle ? enhancedCleanLabel(subgraphTitle) : subgraphId;

        debugLog(
          `Found subgraph: ${subgraphId}, title: "${cleanTitle}", parent: ${parentId || "none"}`
        );

        subgraphStack.push(subgraphId);

        const newSubgraph: SubgraphInfo = {
          id: subgraphId,
          title: cleanTitle,
          nodes: [],
          parentId,
          childrenIds: [],
        };

        subgraphMap.set(subgraphId, newSubgraph);

        if (parentId) {
          const parentSubgraph = subgraphMap.get(parentId);
          if (parentSubgraph) {
            parentSubgraph.childrenIds.push(subgraphId);
          }
        }

        subgraphs.push(newSubgraph);
      }
    } else if (line.toLowerCase().startsWith('direction ')) {
      // Capture per-subgraph direction if inside a subgraph
      const dirMatch = line.match(/^direction\s+(TB|TD|BT|RL|LR)$/i);
      if (dirMatch && subgraphStack.length > 0) {
        const top = subgraphStack[subgraphStack.length - 1];
        const sg = subgraphMap.get(top);
        if (sg) {
          const d = dirMatch[1].toUpperCase();
          sg.direction = d === 'TD' ? 'TB' : d;
        }
      }
    } else if (line === "end" && subgraphStack.length > 0) {
      subgraphStack.pop();
    }
  }

  // Reset for second pass
  subgraphStack.length = 0;

  // Helper function to create or get existing node
  const createOrGetNode = (nodeId: string, currentSubgraph?: string): MermaidNode => {
    // Check if node already exists
    if (nodeMap.has(nodeId)) {
      const existingNode = nodeMap.get(nodeId)!;
      
      // Update subgraph if the node is being referenced in a new context
      if (currentSubgraph && !existingNode.subgraph) {
        existingNode.subgraph = currentSubgraph;
        const subgraph = subgraphMap.get(currentSubgraph);
        if (subgraph && !subgraph.nodes.includes(nodeId)) {
          subgraph.nodes.push(nodeId);
        }
        debugLog(`Updated existing node ${nodeId} to be part of subgraph ${currentSubgraph}`);
      }
      
      return existingNode;
    }

    // Create new node using pre-scanned definition if available
    const nodeDef = nodeDefinitions.get(nodeId);
    let label: string;
    let shape: string;

    if (nodeDef) {
      // Use the pre-scanned definition
      label = nodeDef.label;
      shape = nodeDef.shape;
      debugLog(`Creating node ${nodeId} using pre-scanned definition: "${label}" (${shape})`);
    } else {
      // Fallback to simple node
      label = nodeId;
      shape = "rect";
      debugLog(`Creating simple fallback node: ${nodeId}`);
    }

    const node: MermaidNode = {
      id: nodeId,
      label,
      shape,
      subgraph: currentSubgraph,
      parentSubgraph:
        subgraphStack.length > 1
          ? subgraphStack[subgraphStack.length - 2]
          : undefined,
    };

    nodes.push(node);
    nodeMap.set(nodeId, node);

    if (currentSubgraph) {
      const subgraph = subgraphMap.get(currentSubgraph);
      if (subgraph) subgraph.nodes.push(nodeId);
    }

    return node;
  };

  // Second pass: process nodes and edges
  debugLog("Second pass: processing nodes and edges...");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle subgraph start (robust parsing to support quoted titles and bracket titles)
    if (line.startsWith('subgraph')) {
      const rest = line.slice('subgraph'.length).trim();

      let subgraphId: string | undefined;

      // If rest starts with quote, generate id from title
      const quoteMatch = rest.match(/^(?:["'])(.*?)(?:["'])/);
      if (quoteMatch) {
        const title = quoteMatch[1];
        subgraphId = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || `sg-${i}`;
      } else {
        // First try id with optional bracketed title
        const bracketMatch = rest.match(/^([^\s\[]+)(?:\s*\[(.+?)\])?/);
        if (bracketMatch) {
          const idToken = bracketMatch[1];
          const bracketTitle = bracketMatch[2];
          // If there was an explicit bracketed title use the id token as-is
          if (bracketTitle) {
            subgraphId = idToken;
          } else if (rest.indexOf(' ') !== -1) {
            // If rest contains spaces (e.g. `subgraph Component C`) treat the whole rest as the title
            const title = rest;
            subgraphId = title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '') || `sg-${i}`;
          } else {
            // Simple single-token id
            subgraphId = idToken;
          }
        }
      }

      if (subgraphId) {
        subgraphStack.push(subgraphId);
        debugLog(`Entering subgraph: ${subgraphId}, stack: [${subgraphStack.join(', ')}]`);
        continue;
      }
    }

    // Handle subgraph end
    if (line === "end") {
      if (subgraphStack.length > 0) {
        const exitingSubgraph = subgraphStack[subgraphStack.length - 1];
        subgraphStack.pop();
        debugLog(`Exiting subgraph: ${exitingSubgraph}, stack: [${subgraphStack.join(', ')}]`);
      } else {
        debugLog('Warning: Found "end" without matching subgraph start');
      }
      continue;
    }

    // Skip various non-edge lines
  if (line.startsWith("direction ") || 
    line.startsWith("flowchart ") || 
        line.startsWith("graph ") ||
        line.startsWith("%%")) {
      debugLog(`Skipping line: ${line}`);
      continue;
    }

    // Get current subgraph from the top of the stack
    const currentSubgraph =
      subgraphStack.length > 0
        ? subgraphStack[subgraphStack.length - 1]
        : undefined;

    debugLog(`Processing line: "${line}" in subgraph: ${currentSubgraph || "none"}`);

    // Manual edge parser to avoid brittle regex that stops at the first
    // closing bracket of any type. This scanner finds bracketed sections
    // by locating the matching closing bracket for the opening bracket
    // (same bracket type) and supports optional edge labels like |label|.
    function extractToken(str: string, startIndex: number) {
      // Match identifier
      const idMatch = str.slice(startIndex).match(/^\s*([A-Za-z0-9_]+)/);
      if (!idMatch) return null;
      const id = idMatch[1];
      let idx = startIndex + idMatch[0].length; // position after id (includes leading spaces)

      // if next non-space char is an opening bracket, find its matching close
      const rest = str.slice(idx);
      const openCharMatch = rest.match(/^[\s]*([\[\(\{])/);
      if (openCharMatch) {
        const openChar = openCharMatch[1];
        const openPos = idx + rest.indexOf(openChar);
        const closeChar = openChar === '[' ? ']' : openChar === '(' ? ')' : '}';
        const closePos = str.indexOf(closeChar, openPos + 1);
        if (closePos !== -1) {
          const full = str.slice(startIndex + idMatch[0].search(/\S/), closePos + 1).trim();
          return { id, full, endIndex: closePos + 1 };
        }
      }

      // Otherwise return just the id token
      return { id, full: id, endIndex: idx };
    }

    function parseEdge(str: string) {
      try {
        let i = 0;
        // source token
        const src = extractToken(str, i);
        if (!src) return null;
        i = src.endIndex;

        // consume whitespace
        while (i < str.length && /\s/.test(str[i])) i++;

        // Enhanced operator and label parsing to support both
        // 1) pipe labels:   A -->|Yes| B
        // 2) inline labels: A -- Yes --> B
        // and legacy connectors without arrows: A --- B, A -.-> B, etc.

        // First, try to locate a known arrow head further in the string.
        const arrowHeads = ['-.->', '-->', '==>', '->>', '<->', '-<>', '<-', '->'];
        let foundArrowIndex = -1;
        let foundArrow = '';
        for (const ah of arrowHeads) {
          const idx = str.indexOf(ah, i);
          if (idx !== -1 && (foundArrowIndex === -1 || idx < foundArrowIndex)) {
            foundArrowIndex = idx;
            foundArrow = ah;
          }
        }

        let op: string | null = null;
        let edgeLabel = '';

        if (foundArrowIndex !== -1) {
          // There is an arrow head later in the string. The region between
          // current index and the arrow head can contain dashes and an inline label.
          const between = str.slice(i, foundArrowIndex);

          // First, check for pipe label BEFORE the arrow (non-standard but tolerated)
          const prePipeMatch = between.match(/\|(.*?)\|/);
          if (prePipeMatch) {
            edgeLabel = prePipeMatch[1];
          } else {
            // Remove leading/trailing connector chars, what's left is an inline label
            const inline = between
              .replace(/^\s*[\-\.=:\~]+\s*/g, '')
              .replace(/\s*[\-\.=:\~]+\s*$/g, '')
              .trim();
            if (inline) edgeLabel = inline;
          }

          op = foundArrow;
          // Advance past the arrow head
          i = foundArrowIndex + foundArrow.length;

          // Standard Mermaid syntax places pipe labels AFTER the operator:
          //   A -->|label| B  or  A -.->|label| B
          // If we didn't already capture a label, or even if we did, prefer the
          // explicit pipe label immediately after the arrow.
          while (i < str.length && /\s/.test(str[i])) i++;
          if (str[i] === '|') {
            const next = str.indexOf('|', i + 1);
            if (next !== -1) {
              edgeLabel = str.slice(i + 1, next);
              i = next + 1;
            }
          }
        } else {
          // Fallback to legacy immediate-operator parsing (no arrow head found)
          const operators = ['---', '-.-', '::', ':-:', '...', '~', '==='];
          for (const o of operators.sort((a, b) => b.length - a.length)) {
            if (str.startsWith(o, i)) {
              op = o;
              i += o.length;
              break;
            }
          }
          if (!op) return null;

          // optional edge label |label| after operator
          while (i < str.length && /\s/.test(str[i])) i++;
          if (str[i] === '|') {
            const next = str.indexOf('|', i + 1);
            if (next !== -1) {
              edgeLabel = str.slice(i + 1, next);
              i = next + 1;
            }
          }
        }

        // skip whitespace then parse target
        while (i < str.length && /\s/.test(str[i])) i++;
        const tgt = extractToken(str, i);
        if (!tgt) return null;

        return {
          sourceId: src.id,
          sourceFull: src.full,
          targetId: tgt.id,
          targetFull: tgt.full,
          edgeType: op!,
          edgeLabel,
        };
      } catch (e) {
        return null;
      }
    }

    const parsedEdge = parseEdge(line);
    if (!parsedEdge) {
      debugLog(`Line "${line}" did not match edge pattern - checking for standalone nodes`);
    }

    if (parsedEdge) {
      try {
        const { sourceId, targetId, edgeType, edgeLabel } = parsedEdge;
        debugLog(`Found edge: ${sourceId} ${edgeType} ${targetId} with label: "${edgeLabel}" in context: ${currentSubgraph || "global"}`);

        // Check if source/target are subgraphs
        const isSourceSubgraph = subgraphMap.has(sourceId);
        const isTargetSubgraph = subgraphMap.has(targetId);

        debugLog(
          `Source "${sourceId}" is ${isSourceSubgraph ? "a subgraph" : "a node"}`
        );
        debugLog(
          `Target "${targetId}" is ${isTargetSubgraph ? "a subgraph" : "a node"}`
        );

        // Handle source node creation
        if (!isSourceSubgraph) {
          const existingSource = nodeMap.get(sourceId);
          if (existingSource) {
            debugLog(`Source ${sourceId} already exists in subgraph: ${existingSource.subgraph || "none"}`);
          } else {
            createOrGetNode(sourceId, currentSubgraph);
          }
        }

        // Handle target node creation
        if (!isTargetSubgraph) {
          const existingTarget = nodeMap.get(targetId);
          
          if (existingTarget) {
            debugLog(`Target ${targetId} already exists in subgraph: ${existingTarget.subgraph || "none"}`);
          } else {
            // Target doesn't exist yet - assign to current subgraph if we're inside one
            const targetSubgraph = currentSubgraph;
            
            debugLog(`Creating target ${targetId} with subgraph assignment: ${targetSubgraph || "none"} (current subgraph: ${currentSubgraph || "none"})`);
            createOrGetNode(targetId, targetSubgraph);
          }
        }

        // Add edge
        edges.push({
          source: sourceId,
          target: targetId,
          label: enhancedCleanLabel(edgeLabel),
          type: edgeType,
          isSourceSubgraph: isSourceSubgraph,
          isTargetSubgraph: isTargetSubgraph,
        });

        debugLog(`Added edge: ${sourceId} -> ${targetId} (source subgraph: ${isSourceSubgraph}, target subgraph: ${isTargetSubgraph})`);

      } catch (error) {
        debugLog(`Error parsing edge: ${line}`, error);
      }
    } else {
      // Parse standalone node definitions
      try {
        const nodePatterns = [
          /^([A-Za-z0-9_]+)([\[\(\{][^\]\)\}]*[\]\)\}])/,
          /^([A-Za-z0-9_]+)$/,
        ];

        let foundStandaloneNode = false;
        for (const pattern of nodePatterns) {
          const nodeMatch = line.match(pattern);
          if (nodeMatch && !nodeMap.has(nodeMatch[1])) {
            const nodeId = nodeMatch[1];

            // Skip if this is a subgraph ID
            if (subgraphMap.has(nodeId)) {
              debugLog(`Skipping node creation for ${nodeId} as it's a subgraph`);
              break;
            }

            debugLog(`Found standalone node definition: ${nodeId} in context: ${currentSubgraph || "global"}`);
            createOrGetNode(nodeId, currentSubgraph);
            foundStandaloneNode = true;
            break;
          }
        }

        if (!foundStandaloneNode) {
          debugLog(`Line "${line}" did not match any pattern (edge or standalone node)`);
        }
      } catch (error) {
        debugLog(`Error parsing standalone node: ${line}`, error);
      }
    }
  }

  // Final verification and cleanup
  debugLog("=== FINAL VERIFICATION ===");
  debugLog("Subgraph hierarchy:");
  subgraphs.forEach((sg) => {
    debugLog(`- ${sg.id}: "${sg.title}" (parent: ${sg.parentId || "none"}, children: ${sg.childrenIds.join(", ") || "none"}, nodes: ${sg.nodes.length})`);
  });

  debugLog("Final node assignments:");
  nodes.forEach((node) => {
    debugLog(`- ${node.id}: "${node.label}" in subgraph ${node.subgraph || "none"} (shape: ${node.shape})`);
  });

  debugLog("Final edges:");
  edges.forEach((edge, index) => {
    debugLog(`- Edge ${index}: ${edge.source} -> ${edge.target} (label: "${edge.label}", type: "${edge.type}")`);
  });

  return { nodes, edges, subgraphs, direction };
}




// Calculate dynamic node sizes based on label length
function calculateNodeSize(label: string, shape: string, isImageNode: boolean = false) {
  // Fixed size for image nodes
  if (isImageNode) {
    return { width: 80, height: 80 };
  }

  const lines = label.split("\n");

  // Measure text width more accurately using canvas when available
  function measureLineWidth(text: string): number {
    try {
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Match CSS used in nodes
          ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          return ctx.measureText(text).width;
        }
      }
    } catch {}
    // Fallback heuristic
    return text.length * 8;
  }

  const maxLineWidth = Math.max(...lines.map((line) => Math.ceil(measureLineWidth(line))));

  // Base size from content, with reasonable minimums and padding
  const baseWidth = maxLineWidth + 30; // text width + padding
  const baseHeight = lines.length * 18 + 20; // line-height 18 + padding
  
  // Add some additional space based on content (not rigid minimums)
  const width = Math.max(80, baseWidth + 30); // Content + 30px extra, min 80px for readability
  const height = Math.max(40, baseHeight + 20); // Content + 20px extra, min 40px for readability

  if (shape === "diamond") {
    return {
      // Slightly increase to account for diagonal bounding box
      width: Math.max(90, Math.ceil(width * 1.05)),
      height: Math.max(90, Math.ceil(height * 1.05)),
    };
  }
  if (shape === "circle") {
    const size = Math.max(width, height) + 10; // Equal dimensions for circles
    return { width: size, height: size };
  }
  return { width, height };
}

// Helper function to detect and extract image URLs from labels
function extractImageUrl(label: string): { imageUrl: string | null; cleanLabel: string } {
  // Match common image URL patterns
  const imageUrlPattern = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|svg|webp)(\?[^\s]*)?/i;
  const match = label.match(imageUrlPattern);
  
  if (match) {
    const imageUrl = match[0];
    const cleanLabel = label.replace(imageUrl, '').trim();
    return { imageUrl, cleanLabel };
  }
  
  return { imageUrl: null, cleanLabel: label };
}

// Process subgraphs in hierarchical order (parents before children)
function processSubgraphsInHierarchicalOrder(
  subgraphs: SubgraphInfo[]
): SubgraphInfo[] {
  const result: SubgraphInfo[] = [];
  const processed = new Set<string>();

  // First pass: add all subgraphs without parents
  subgraphs.forEach((subgraph) => {
    if (!subgraph.parentId) {
      result.push(subgraph);
      processed.add(subgraph.id);
    }
  });

  // Process remaining subgraphs in hierarchical order
  let lastProcessedCount = 0;
  while (
    processed.size < subgraphs.length &&
    lastProcessedCount !== processed.size
  ) {
    lastProcessedCount = processed.size;

    subgraphs.forEach((subgraph) => {
      if (
        !processed.has(subgraph.id) &&
        subgraph.parentId &&
        processed.has(subgraph.parentId)
      ) {
        result.push(subgraph);
        processed.add(subgraph.id);
      }
    });
  }

  // Add any remaining subgraphs (in case of circular references)
  subgraphs.forEach((subgraph) => {
    if (!processed.has(subgraph.id)) {
      debugLog(
        `Warning: Subgraph ${subgraph.id} has circular reference or missing parent. Adding it anyway.`
      );
      result.push(subgraph);
    }
  });

  return result;
}

// Phase 1: Layout each subgraph independently
function layoutSubgraphs(
  nodes: MermaidNode[],
  edges: MermaidEdge[],
  subgraphs: SubgraphInfo[],
  direction: string
): Map<string, SubgraphLayout> {
  const subgraphLayouts = new Map<string, SubgraphLayout>();

  // Process subgraphs in hierarchical order
  const orderedSubgraphs = processSubgraphsInHierarchicalOrder(subgraphs);

  debugLog(
    `Laying out ${orderedSubgraphs.length} subgraphs in hierarchical order`
  );

  orderedSubgraphs.forEach((subgraph) => {
    const subgraphNodes = nodes.filter((n) => n.subgraph === subgraph.id);
    const subgraphEdges = edges.filter((e) => {
      const sourceNode = nodes.find((n) => n.id === e.source);
      const targetNode = nodes.find((n) => n.id === e.target);
      return (
        sourceNode?.subgraph === subgraph.id &&
        targetNode?.subgraph === subgraph.id
      );
    });

    debugLog(
      `Laying out subgraph: ${subgraph.id} with ${subgraphNodes.length} nodes and ${subgraphEdges.length} edges`
    );

    // Create a new graph for this subgraph with proper node spacing
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: subgraph.direction || direction,
      // Node separation settings - ensure minimum distance between nodes
      nodesep: NODE_SEPARATION_HORIZONTAL, // Horizontal spacing between nodes in same rank
      ranksep: NODE_SEPARATION_VERTICAL,   // Vertical spacing between different ranks
      // Margins - space around the entire subgraph content area
      marginx: SUBGRAPH_PADDING,
      marginy: SUBGRAPH_PADDING + SUBGRAPH_HEADER_HEIGHT + SUBGRAPH_CONTENT_TOP_MARGIN,
      ranker: DAGRE_RANKER, // Algorithm for ranking nodes (tight-tree gives compact layouts)
    });
    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes
    subgraphNodes.forEach((node) => {
      const { imageUrl } = extractImageUrl(node.label);
      const size = calculateNodeSize(node.label, node.shape, !!imageUrl);
      g.setNode(node.id, { width: size.width, height: size.height });
    });

    // Add edges
    subgraphEdges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

  // Layout this subgraph
    dagre.layout(g);

    // Calculate bounding box
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    const nodePositions = new Map<
      string,
      { x: number; y: number; width: number; height: number }
    >();

    // Transform dagre coordinates to React Flow coordinates
    // Dagre gives us center-based coordinates, but we need to track bounding boxes
    // for proper subgraph sizing and relative positioning
    subgraphNodes.forEach((node) => {
      const nodeLayout = g.node(node.id);
      if (!nodeLayout) {
        debugLog(
          `Warning: No layout information for node ${node.id} in subgraph ${subgraph.id}`
        );
        return;
      }

      const size = calculateNodeSize(node.label, node.shape);

      // Store center-based coordinates from dagre (will be converted to top-left later)
      nodePositions.set(node.id, {
        x: nodeLayout.x,
        y: nodeLayout.y,
        width: size.width,
        height: size.height,
      });

      // Calculate bounding box for subgraph sizing
      // Note: dagre coordinates are center-based, so we calculate edges
      minX = Math.min(minX, nodeLayout.x - size.width / 2);
      maxX = Math.max(maxX, nodeLayout.x + size.width / 2);
      minY = Math.min(minY, nodeLayout.y - size.height / 2);
      maxY = Math.max(maxY, nodeLayout.y + size.height / 2);
    });

    // Handle empty subgraphs by providing minimum dimensions
    if (subgraphNodes.length === 0 || minX === Infinity || minY === Infinity) {
      // Set default size for empty subgraph
      const defaultWidth = 200;
      const defaultHeight = 100;
      minX = 0;
      minY = 0;
      maxX = defaultWidth;
      maxY = defaultHeight;
      debugLog(
        `Using default dimensions for subgraph ${subgraph.id}: ${defaultWidth}x${defaultHeight}`
      );
    }

    // Normalize positions for React Flow coordinate system
    // React Flow expects top-left coordinates, but dagre gives center coordinates
    // We offset everything so the content starts at the proper position within the subgraph
    const offsetX = -minX + SUBGRAPH_PADDING;
    const offsetY = -minY + SUBGRAPH_PADDING + SUBGRAPH_HEADER_HEIGHT + SUBGRAPH_CONTENT_TOP_MARGIN;

    // Convert center-based coordinates to top-left coordinates for React Flow
    nodePositions.forEach((pos, nodeId) => {
      nodePositions.set(nodeId, {
        ...pos,
        // Apply offset and convert from center to top-left
        x: pos.x + offsetX,
        y: pos.y + offsetY,
      });
    });

    // Validate that nodes have adequate spacing (helps debug layout issues)
    validateNodeSpacing(nodePositions, subgraph.id);

    // Calculate base size from actual content including header and content margin
    const baseWidth = maxX - minX + SUBGRAPH_PADDING * 2;
    const baseHeight = maxY - minY + SUBGRAPH_PADDING * 2 + SUBGRAPH_HEADER_HEIGHT + SUBGRAPH_CONTENT_TOP_MARGIN;

  // Use only a small fixed buffer for width/height (no multipliers)
  const width = baseWidth + 4; // Small buffer (reduced)
  const height = baseHeight + 4;

    subgraphLayouts.set(subgraph.id, {
      id: subgraph.id,
      title: subgraph.title,
      nodes: nodePositions,
      width,
      height,
      parentId: subgraph.parentId,
    });

    debugLog(
      `Subgraph ${subgraph.id} sizing: base(${baseWidth.toFixed(1)}x${baseHeight.toFixed(1)}) = final(${width.toFixed(1)}x${height.toFixed(1)})`
    );
  });

  // Recalculate parent subgraph sizes to accommodate nested subgraphs
  recalculateParentSubgraphSizes(subgraphLayouts, orderedSubgraphs, direction);

  return subgraphLayouts;
}

// Recalculate parent subgraph sizes to include nested subgraphs
// This runs AFTER child positioning to ensure accurate sizing
function recalculateParentSubgraphSizes(
  subgraphLayouts: Map<string, SubgraphLayout>,
  orderedSubgraphs: SubgraphInfo[],
  direction: string
) {
  // Process in reverse order (children first, then parents)
  for (let i = orderedSubgraphs.length - 1; i >= 0; i--) {
    const subgraph = orderedSubgraphs[i];
    const layout = subgraphLayouts.get(subgraph.id);
    
    if (!layout) continue;

    // Find all direct child subgraphs
    const childSubgraphs = orderedSubgraphs.filter(sg => sg.parentId === subgraph.id);
    
    if (childSubgraphs.length === 0) continue;

  // Calculate the minimum required size based on actual content
  let maxContentRight = 0;
  let maxContentBottom = 0;

    // Consider existing nodes in the parent
    layout.nodes.forEach((nodePos) => {
      const nodeRight = nodePos.x + nodePos.width / 2;
      const nodeBottom = nodePos.y + nodePos.height / 2;
      maxContentRight = Math.max(maxContentRight, nodeRight);
      maxContentBottom = Math.max(maxContentBottom, nodeBottom);
    });

    const isHorizontal = direction === 'LR' || direction === 'RL';

    // Consider child subgraphs (they will be positioned with proper spacing)
    childSubgraphs.forEach(childSg => {
      const childLayout = subgraphLayouts.get(childSg.id);
      if (childLayout) {
        // Estimate child position accounting for dagre spacing and mixed content
        const estimatedChildX = isHorizontal
          ? Math.max(
              SUBGRAPH_PADDING + childLayout.width / 2,
              maxContentRight + MIXED_CONTENT_HORIZONTAL_SPACING + childLayout.width / 2
            )
          : SUBGRAPH_PADDING + childLayout.width / 2;
        const estimatedChildY = isHorizontal
          ? Math.max(
              SUBGRAPH_HEADER_HEIGHT + SUBGRAPH_CONTENT_TOP_MARGIN + SUBGRAPH_PADDING + childLayout.height / 2,
              childLayout.height / 2 // keep near top content area when horizontal
            )
          : Math.max(
              SUBGRAPH_HEADER_HEIGHT + SUBGRAPH_CONTENT_TOP_MARGIN + SUBGRAPH_PADDING + childLayout.height / 2,
              maxContentBottom + MIXED_CONTENT_VERTICAL_SPACING + childLayout.height / 2
            );

        const childRight = estimatedChildX + childLayout.width / 2;
        const childBottom = estimatedChildY + childLayout.height / 2;

        maxContentRight = Math.max(maxContentRight, childRight);
        maxContentBottom = Math.max(maxContentBottom, childBottom);
      }
    });

    // Calculate minimum required parent size with generous padding
  const minRequiredWidth = maxContentRight + SUBGRAPH_PADDING * 3; // Extra padding for visual breathing room
  const minRequiredHeight = maxContentBottom + SUBGRAPH_PADDING * 3;
    
    // Ensure minimum size for readability
    const absoluteMinWidth = 300;
    const absoluteMinHeight = 200;
    
    const finalWidth = Math.max(layout.width, minRequiredWidth, absoluteMinWidth);
    const finalHeight = Math.max(layout.height, minRequiredHeight, absoluteMinHeight);

    // Update parent size if it needs to be larger
    if (finalWidth > layout.width || finalHeight > layout.height) {
      const oldWidth = layout.width;
      const oldHeight = layout.height;
      layout.width = finalWidth;
      layout.height = finalHeight;
      
      debugLog(
        `Pre-sized parent ${subgraph.id}: ${oldWidth}x${oldHeight} → ${layout.width}x${layout.height} to contain ${childSubgraphs.length} children + nodes`
      );
      
      // Also log the child details for debugging
      childSubgraphs.forEach(child => {
        const childLayout = subgraphLayouts.get(child.id);
        if (childLayout) {
          debugLog(`  Child ${child.id}: ${childLayout.width}x${childLayout.height}`);
        }
      });
    }
  }
}

// Calculate connection weights between containers
function calculateConnectionWeights(
  nodes: MermaidNode[],
  edges: MermaidEdge[]
): Map<string, Map<string, number>> {
  const weights = new Map<string, Map<string, number>>();

  edges.forEach((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    if (!sourceNode || !targetNode) return;

    // Get container IDs (either subgraph ID or node ID for standalone nodes)
    const sourceContainer = sourceNode.subgraph || sourceNode.id;
    const targetContainer = targetNode.subgraph || targetNode.id;

    // Skip self-connections within the same container
    if (sourceContainer === targetContainer) return;

    // Initialize maps if needed
    if (!weights.has(sourceContainer)) {
      weights.set(sourceContainer, new Map<string, number>());
    }

    const sourceWeights = weights.get(sourceContainer)!;
    const currentWeight = sourceWeights.get(targetContainer) || 0;
    sourceWeights.set(targetContainer, currentWeight + 1);
  });

  return weights;
}

// Post-positioning size adjustment: ensure parent containers properly contain all positioned children
function adjustParentSizesAfterPositioning(
  subgraphLayouts: Map<string, SubgraphLayout>,
  subgraphPositions: Map<string, { x: number; y: number }>,
  orderedSubgraphs: SubgraphInfo[],
  direction: string
): void {
  const isHorizontal = direction === 'LR' || direction === 'RL';

  // Iterate a few times to propagate size growth up through ancestors
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 5) {
    iterations++;
    changed = false;

    // Process parents ensuring they contain both own nodes and positioned children
    orderedSubgraphs.forEach((subgraph) => {
      const layout = subgraphLayouts.get(subgraph.id);
      const position = subgraphPositions.get(subgraph.id);
      if (!layout || !position) return;

      // Bounds from this parent's own nodes (relative to parent origin)
      let maxNodeRight = 0;
      let maxNodeBottom = SUBGRAPH_HEADER_HEIGHT + SUBGRAPH_CONTENT_TOP_MARGIN + SUBGRAPH_PADDING; // at least header zone
      layout.nodes.forEach((nodePos) => {
        const nodeRight = nodePos.x + nodePos.width / 2;
        const nodeBottom = nodePos.y + nodePos.height / 2;
        maxNodeRight = Math.max(maxNodeRight, nodeRight);
        maxNodeBottom = Math.max(maxNodeBottom, nodeBottom);
      });

      // Bounds from child subgraphs (direct children only)
      let maxChildRight = 0;
      let maxChildBottom = 0;
      const childSubgraphs = orderedSubgraphs.filter((sg) => sg.parentId === subgraph.id);
      childSubgraphs.forEach((child) => {
        const childLayout = subgraphLayouts.get(child.id);
        const childPosition = subgraphPositions.get(child.id);
        if (!childLayout || !childPosition) return;
        const relX = childPosition.x - position.x;
        const relY = childPosition.y - position.y;
        maxChildRight = Math.max(maxChildRight, relX + childLayout.width);
        maxChildBottom = Math.max(maxChildBottom, relY + childLayout.height);
      });

      // Combine bounds
      const contentMaxRight = Math.max(maxNodeRight, maxChildRight);
      const contentMaxBottom = Math.max(maxNodeBottom, maxChildBottom);

      // Required dimensions with safety margins
      const requiredWidth = contentMaxRight + (isHorizontal ? SUBGRAPH_PADDING * 4 : SUBGRAPH_PADDING * 3);
      const requiredHeight = contentMaxBottom + SUBGRAPH_PADDING * 3;

  const newWidth = Math.max(layout.width, requiredWidth, isHorizontal ? 600 : 240);
      const newHeight = Math.max(layout.height, requiredHeight, 200);

      if (newWidth > layout.width || newHeight > layout.height) {
        debugLog(
          `Post-positioning resize (iter ${iterations}): ${subgraph.id} ${layout.width}x${layout.height} → ${newWidth}x${newHeight}`
        );
        layout.width = newWidth;
        layout.height = newHeight;
        changed = true;
      }
    });
  }
}

// Helper function to calculate the bottom boundary of nodes within a parent subgraph
function getParentNodesBottomBoundary(
  parentId: string, 
  parentLayout: SubgraphLayout
): number {
  let maxBottom = 0;
  
  // Check all nodes that belong directly to this parent subgraph
  parentLayout.nodes.forEach((nodePos) => {
    // nodePos contains center-based coordinates and dimensions
    const nodeBottom = nodePos.y + nodePos.height / 2;
    maxBottom = Math.max(maxBottom, nodeBottom);
  });
  
  debugLog(`Parent ${parentId} nodes extend to bottom Y=${maxBottom}`);
  return maxBottom;
}

// Validate and enforce minimum spacing between nodes
function validateNodeSpacing(
  nodePositions: Map<string, { x: number; y: number; width: number; height: number }>,
  subgraphId: string
): void {
  const positions = Array.from(nodePositions.values());
  let hasOverlap = false;

  // Check for overlapping nodes
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const node1 = positions[i];
      const node2 = positions[j];
      
      // Calculate distance between node centers
      const centerDistance = Math.sqrt(
        Math.pow(node1.x - node2.x, 2) + Math.pow(node1.y - node2.y, 2)
      );
      
      // Calculate minimum required distance (sum of half-widths + half-heights + padding)
      const minDistance = (node1.width + node2.width) / 2 + (node1.height + node2.height) / 2 + 20;
      
      if (centerDistance < minDistance) {
        hasOverlap = true;
        debugLog(`Warning: Potential node overlap in subgraph ${subgraphId} - distance: ${centerDistance.toFixed(1)}, required: ${minDistance.toFixed(1)}`);
      }
    }
  }
  
  if (!hasOverlap) {
    debugLog(`✓ Node spacing validated for subgraph ${subgraphId} - no overlaps detected`);
  }
}

// Phase 2: Layout meta-graph (containers + standalone nodes)
function layoutMetaGraph(
  nodes: MermaidNode[],
  edges: MermaidEdge[],
  subgraphLayouts: Map<string, SubgraphLayout>,
  direction: string
): {
  subgraphPositions: Map<string, { x: number; y: number }>;
  standalonePositions: Map<string, { x: number; y: number }>;
} {
  // Create meta-graph for top-level layout with generous spacing
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    // Container separation - ensure top-level elements don't overlap
    nodesep: CONTAINER_SEPARATION_HORIZONTAL,  // Horizontal spacing between top-level containers
    ranksep: CONTAINER_SEPARATION_VERTICAL,   // Vertical spacing between container ranks
    // Outer margins for the entire diagram
    marginx: META_GRAPH_MARGIN,   
    marginy: META_GRAPH_MARGIN,
    ranker: DAGRE_RANKER, // Use tight-tree for better container arrangement
  });
  g.setDefaultEdgeLabel(() => ({}));

  debugLog("Laying out meta-graph");

  // Calculate connection weights between containers
  const connectionWeights = calculateConnectionWeights(nodes, edges);

  // Add subgraph containers as nodes
  subgraphLayouts.forEach((layout, id) => {
    // Skip nested subgraphs - they'll be positioned relative to their parents
    if (!layout.parentId) {
      g.setNode(id, { width: layout.width, height: layout.height });
      debugLog(
        `Added subgraph ${id} to meta-graph (width=${layout.width}, height=${layout.height})`
      );
    }
  });

  // Add standalone nodes
  const standaloneNodes = nodes.filter((n) => !n.subgraph);
  standaloneNodes.forEach((node) => {
    const { imageUrl } = extractImageUrl(node.label);
    const size = calculateNodeSize(node.label, node.shape, !!imageUrl);
    g.setNode(node.id, { width: size.width, height: size.height });
    debugLog(`Added standalone node ${node.id} to meta-graph`);
  });

  // Add edges between containers and standalone nodes with weights
  connectionWeights.forEach((targets, sourceId) => {
    targets.forEach((weight, targetId) => {
      // Skip edges between nested subgraphs and their parents
      const sourceLayout = subgraphLayouts.get(sourceId);
      const targetLayout = subgraphLayouts.get(targetId);

      if (
        (sourceLayout && sourceLayout.parentId === targetId) ||
        (targetLayout && targetLayout.parentId === sourceId)
      ) {
        return;
      }

      // Only add edges between top-level containers or standalone nodes
      const sourceIsTopLevel = !sourceLayout || !sourceLayout.parentId;
      const targetIsTopLevel = !targetLayout || !targetLayout.parentId;

      if (sourceIsTopLevel && targetIsTopLevel) {
        // Check if both nodes exist in the graph
        if (g.hasNode(sourceId) && g.hasNode(targetId)) {
          if (!g.hasEdge(sourceId, targetId)) {
            g.setEdge(sourceId, targetId, { weight });
            debugLog(
              `Added meta-edge from ${sourceId} to ${targetId} with weight ${weight}`
            );
          }
        }
      }
    });
  });

  // Layout the meta-graph
  dagre.layout(g);

  // Extract positions
  const subgraphPositions = new Map<string, { x: number; y: number }>();
  const standalonePositions = new Map<string, { x: number; y: number }>();

  // Position top-level subgraphs
  subgraphLayouts.forEach((layout, id) => {
    if (!layout.parentId) {
      const node = g.node(id);
      if (node) {
        subgraphPositions.set(id, {
          x: node.x - layout.width / 2,
          y: node.y - layout.height / 2,
        });
        debugLog(
          `Positioned subgraph ${id} at (${node.x - layout.width / 2}, ${
            node.y - layout.height / 2
          })`
        );
      } else {
        debugLog(`Warning: No position for subgraph ${id} in meta-graph`);
      }
    }
  });

  // Dagre-based positioning for nested subgraphs within each parent container
  // Access ordered subgraphs to read per-subgraph direction
  const orderedForMeta = processSubgraphsInHierarchicalOrder(
    Array.from(new Set(
      Array.from(subgraphLayouts.keys()).map(id => ({
        id,
        parentId: subgraphLayouts.get(id)?.parentId,
        title: subgraphLayouts.get(id)?.title || id,
      }))
    )) as any
  );
  const processedSubgraphs = new Set<string>();

  function layoutChildrenWithinParent(parentId: string): boolean {
    const parentPos = subgraphPositions.get(parentId);
    const parentLayout = subgraphLayouts.get(parentId);
    if (!parentPos || !parentLayout) return false;

    // Collect direct child subgraphs
    const childIds: string[] = [];
    subgraphLayouts.forEach((layout, id) => {
      if (layout.parentId === parentId) childIds.push(id);
    });

    if (childIds.length === 0) return false;

    // CRITICAL FIX: Calculate the occupied space by existing nodes in the parent
    // This prevents nested subgraphs from overlapping with parent's direct nodes
    let maxNodeBottom = 0;
    const parentNodesBottom = getParentNodesBottomBoundary(parentId, parentLayout);
    if (parentNodesBottom > 0) {
      maxNodeBottom = parentNodesBottom;
      debugLog(`Parent ${parentId} has nodes extending to Y=${maxNodeBottom}, will position child subgraphs below this`);
    }

  // Build a dagre graph for child subgraphs with proper nested spacing
    const cg = new dagre.graphlib.Graph();
  // We didn't carry direction through here; default to global direction for meta stage
  const parentDir = direction;
    cg.setGraph({
      rankdir: parentDir,
      // Nested subgraph separation - spacing between sibling subgraphs within parent
      nodesep: NESTED_SUBGRAPH_SEPARATION_HORIZONTAL,   // Horizontal spacing between sibling subgraphs
      ranksep: NESTED_SUBGRAPH_SEPARATION_VERTICAL,     // Vertical spacing between subgraph ranks
      // Margins within parent content area
      marginx: NESTED_CONTENT_MARGIN,  
      marginy: NESTED_CONTENT_MARGIN,
      ranker: DAGRE_RANKER, // Consistent ranking algorithm
    });
    cg.setDefaultEdgeLabel(() => ({}));

    // Add child subgraphs as nodes with their sizes
    childIds.forEach((cid) => {
      const cl = subgraphLayouts.get(cid)!;
      cg.setNode(cid, { width: cl.width, height: cl.height });
    });

    // Add edges between children based on connection weights in the full graph
    // Only include edges where both source and target are in childIds
    let hasEdges = false;
    childIds.forEach((sourceId) => {
      const targets = connectionWeights.get(sourceId);
      if (!targets) return;
      targets.forEach((weight, targetId) => {
        if (childIds.includes(targetId) && !cg.hasEdge(sourceId, targetId)) {
          cg.setEdge(sourceId, targetId, { weight });
          hasEdges = true;
        }
      });
    });

    // If there are no inter-child edges, create a simple flow layout
    if (!hasEdges && childIds.length > 1) {
      // Create a simple chain to spread them out better
      for (let i = 0; i < childIds.length - 1; i++) {
        cg.setEdge(childIds[i], childIds[i + 1], { weight: 1 });
      }
    }

    dagre.layout(cg);

    // Compute bounding box of children from dagre positions
    let minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
    const childTopLefts = new Map<string, { x: number; y: number }>();

    childIds.forEach((cid) => {
      const n = cg.node(cid);
      const cl = subgraphLayouts.get(cid)!;
      const left = n.x - cl.width / 2;
      const top = n.y - cl.height / 2;
      const right = n.x + cl.width / 2;
      const bottom = n.y + cl.height / 2;
      childTopLefts.set(cid, { x: left, y: top });
      minLeft = Math.min(minLeft, left);
      minTop = Math.min(minTop, top);
      maxRight = Math.max(maxRight, right);
      maxBottom = Math.max(maxBottom, bottom);
    });

  // Origin inside parent content area (absolute coords) - below header with content margin
  let contentOriginX = parentPos.x + SUBGRAPH_PADDING;
  let contentOriginY = parentPos.y + SUBGRAPH_HEADER_HEIGHT + SUBGRAPH_CONTENT_TOP_MARGIN + SUBGRAPH_PADDING;

    // CRITICAL: If parent has nodes, position child subgraphs below them with adequate spacing
  const isHorizontal = parentDir === 'LR' || parentDir === 'RL';
    if (isHorizontal) {
      // In horizontal flow, keep children near the top content band and shift X if parent has wide nodes
      const parentNodesMaxRight = Array.from(parentLayout.nodes.values()).reduce((acc, n) => Math.max(acc, n.x + n.width / 2), 0);
      if (parentNodesMaxRight > 0) {
        const proposedX = parentPos.x + Math.max(SUBGRAPH_PADDING, parentNodesMaxRight + MIXED_CONTENT_HORIZONTAL_SPACING);
        contentOriginX = Math.max(contentOriginX, proposedX);
        debugLog(`Adjusted child subgraph start position to X=${contentOriginX} for LR/RL to avoid parent nodes`);
      }
      // Keep Y anchored at content start for LR/RL to avoid growing height unnecessarily
    } else {
      if (maxNodeBottom > 0) {
        const nodeBottomInParentCoords = maxNodeBottom;
        const proposedY = parentPos.y + nodeBottomInParentCoords + MIXED_CONTENT_VERTICAL_SPACING;
        // Use the lower of the two positions (either normal content start or below existing nodes)
        contentOriginY = Math.max(contentOriginY, proposedY);
        debugLog(`Adjusted child subgraph start position to Y=${contentOriginY} to avoid parent nodes (added ${MIXED_CONTENT_VERTICAL_SPACING}px spacing)`);
      }
    }

    // Calculate the available space in the parent for centering (accounting for header + content margin)
  const availableWidth = parentLayout.width - (SUBGRAPH_PADDING * 2);
  const usedVerticalSpace = contentOriginY - parentPos.y;
  const availableHeight = parentLayout.height - usedVerticalSpace - SUBGRAPH_PADDING;
    
    // Calculate the actual content dimensions
    const contentWidth = maxRight - minLeft;
    const contentHeight = maxBottom - minTop;
    
  // Align children within the available parent space
  // For vertical flows (TB/BT), left-align to avoid excess right whitespace; center only horizontally oriented layouts
  const centerOffsetX = isHorizontal ? Math.max(0, (availableWidth - contentWidth) / 2) : 0;
  const centerOffsetY = isHorizontal ? 0 : Math.max(0, (availableHeight - contentHeight) / 2);

    // Position children with centering offset
    childIds.forEach((cid) => {
      const tl = childTopLefts.get(cid)!;
      const absX = contentOriginX + centerOffsetX + (tl.x - minLeft);
      const absY = contentOriginY + centerOffsetY + (tl.y - minTop);
      subgraphPositions.set(cid, { x: absX, y: absY });
      processedSubgraphs.add(cid);
      debugLog(`Positioned nested subgraph "${cid}" within parent ${parentId} at (${absX}, ${absY}) with centering`);
    });

    // Ensure parent is large enough to contain both existing nodes and the centered children
    // Use generous padding to prevent overflow issues
    const requiredWidth = isHorizontal
      ? Math.max(contentWidth + SUBGRAPH_PADDING * 6, (contentOriginX - parentPos.x) + contentWidth + SUBGRAPH_PADDING * 3)
      : contentWidth + (SUBGRAPH_PADDING * 6); // Extra generous padding for centering and overflow prevention

    // Calculate required height considering both node content and child subgraphs
    const childrenBottomBoundary = contentOriginY + centerOffsetY + (maxBottom - minTop) - parentPos.y;
    const minRequiredHeight = isHorizontal
      ? Math.max(SUBGRAPH_HEADER_HEIGHT + SUBGRAPH_CONTENT_TOP_MARGIN + SUBGRAPH_PADDING * 2 + contentHeight + SUBGRAPH_PADDING * 2, 300)
      : Math.max(
          childrenBottomBoundary + SUBGRAPH_PADDING * 4, // Height to fit positioned children with safety margin
          maxNodeBottom + MIXED_CONTENT_VERTICAL_SPACING + contentHeight + SUBGRAPH_PADDING * 4 // Height for nodes + spacing + children with safety margin
        );

    // Apply minimum dimensions to prevent cramped layouts
    const finalRequiredWidth = Math.max(requiredWidth, isHorizontal ? 600 : 400); // Wider min for LR/RL
    const finalRequiredHeight = Math.max(minRequiredHeight, 300); // Minimum height for readability
    
    if (finalRequiredWidth > parentLayout.width || finalRequiredHeight > parentLayout.height) {
      const oldWidth = parentLayout.width;
      const oldHeight = parentLayout.height;
      parentLayout.width = Math.max(parentLayout.width, finalRequiredWidth);
      parentLayout.height = Math.max(parentLayout.height, finalRequiredHeight);
      debugLog(`Expanded parent ${parentId} from ${oldWidth}x${oldHeight} to ${parentLayout.width}x${parentLayout.height} to fit nodes + ${childIds.length} child subgraphs (overflow-safe)`);
    }

    return true;
  }

  // Process parents in waves from top-level down until all nested are positioned
  const processedParents = new Set<string>();
  let madeProgress = true;
  let safetyCounter = 0;
  while (madeProgress && safetyCounter < 100) {
    safetyCounter++;
    madeProgress = false;
    // For each subgraph that already has an absolute position, try to lay out its direct children once
    subgraphLayouts.forEach((_, id) => {
      if (subgraphPositions.has(id) && !processedParents.has(id)) {
        const progressed = layoutChildrenWithinParent(id);
        if (progressed) {
          madeProgress = true;
          processedParents.add(id);
        }
      }
    });
  }
  if (safetyCounter === 100) {
    debugLog("Warning: nested subgraph layout reached iteration cap; potential cyclic dependency");
  }

  // Position standalone nodes
  standaloneNodes.forEach((node) => {
    const nodeLayout = g.node(node.id);
    if (nodeLayout) {
      const size = calculateNodeSize(node.label, node.shape);
      standalonePositions.set(node.id, {
        x: nodeLayout.x - size.width / 2,
        y: nodeLayout.y - size.height / 2,
      });
      debugLog(
        `Positioned standalone node ${node.id} at (${
          nodeLayout.x - size.width / 2
        }, ${nodeLayout.y - size.height / 2})`
      );
    } else {
      debugLog(
        `Warning: No position for standalone node ${node.id} in meta-graph`
      );
    }
  });

  return { subgraphPositions, standalonePositions };
}

// Phase 3: Combine layouts and create React Flow elements
function createReactFlowElements(
  nodes: MermaidNode[],
  edges: MermaidEdge[],
  subgraphs: SubgraphInfo[],
  subgraphLayouts: Map<string, SubgraphLayout>,
  subgraphPositions: Map<string, { x: number; y: number }>,
  standalonePositions: Map<string, { x: number; y: number }>,
  direction: string
): ReactFlowData {
  const reactFlowNodes: Node[] = [];

  debugLog("Creating React Flow elements");

  // Color schemes
  const getNodeColors = (shape: string) => {
    const colorSchemes = {
      rect: ["#E3F2FD", "#1976D2"], // Blue
      diamond: ["#FFF3E0", "#F57C00"], // Orange
      circle: ["#E8F5E8", "#388E3C"], // Green
      stadium: ["#F3E5F5", "#7B1FA2"], // Purple
      round: ["#FCE4EC", "#C2185B"], // Pink
    };

    const defaultColors = ["#F0F4F8", "#2D3748"];
    const colors =
      colorSchemes[shape as keyof typeof colorSchemes] || defaultColors;

    return {
      backgroundColor: colors[0],
      borderColor: colors[1],
    };
  };

  const getSubgraphColors = (index: number) => {
    const subgraphColors = [
      { bg: "rgba(227, 242, 253, 0.4)", border: "#1976D2" }, // Blue
      { bg: "rgba(232, 245, 233, 0.4)", border: "#388E3C" }, // Green
      { bg: "rgba(243, 229, 245, 0.4)", border: "#7B1FA2" }, // Purple
      { bg: "rgba(255, 243, 224, 0.4)", border: "#F57C00" }, // Orange
      { bg: "rgba(252, 228, 236, 0.4)", border: "#C2185B" }, // Pink
    ];
    return subgraphColors[index % subgraphColors.length];
  };

  // Process subgraphs in hierarchical order (parents first for proper rendering)
  const orderedSubgraphs = processSubgraphsInHierarchicalOrder(subgraphs);

  // Add subgraph containers in the correct order (parents before children)
  orderedSubgraphs.forEach((subgraph, index) => {
    const layout = subgraphLayouts.get(subgraph.id);
    const position = subgraphPositions.get(subgraph.id);

    if (layout && position) {
      const colors = getSubgraphColors(index);

      // React Flow expects child positions to be RELATIVE to their parent.
      // Our layoutMetaGraph currently stores ABSOLUTE positions for all subgraphs.
      // Convert to relative coordinates for nested subgraphs so they render in place
      // immediately (without requiring a drag to reflow).
      let finalPosition = position;
      if (layout.parentId) {
        const parentAbsPos = subgraphPositions.get(layout.parentId);
        if (parentAbsPos) {
          finalPosition = {
            x: position.x - parentAbsPos.x,
            y: position.y - parentAbsPos.y,
          };
        }
      }

      reactFlowNodes.push({
        id: `subgraph-${subgraph.id}`,
        type: "group",
        position: finalPosition,
        data: {
          label: subgraph.title,
          isSubgraph: true,
        },
        style: {
          backgroundColor: colors.bg,
          border: `3px solid ${colors.border}`,
          borderRadius: "12px",
          width: layout.width,
          height: layout.height,
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            zIndex: 0,
        },
        selectable: true,
        draggable: true,
        connectable: true,
        parentNode: layout.parentId ? `subgraph-${layout.parentId}` : undefined,
        extent: layout.parentId ? "parent" : undefined,
        zIndex: layout.parentId ? 1 : 0, // Child subgraphs should render above parents
      });
    }
  });

  // Add nodes
  nodes.forEach((node) => {
    const colors = getNodeColors(node.shape);
    const { imageUrl, cleanLabel } = extractImageUrl(node.label);

    let nodeStyle: any = {
      backgroundColor: colors.backgroundColor,
      borderColor: colors.borderColor,
      borderWidth: "2px",
      borderStyle: "solid" as const,
      borderRadius: "8px",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    };

    // Special handling for image nodes - remove borders and background completely
    if (imageUrl) {
      nodeStyle = {
        backgroundColor: "transparent",
        background: "transparent",
        border: "none",
        borderRadius: "8px",
        boxShadow: "none",
      };
    }

    // Adjust style based on shape
    switch (node.shape) {
      case "diamond":
        nodeStyle.borderRadius = "0px";
        break;
      case "circle":
        nodeStyle.borderRadius = "50%";
        break;
      case "stadium":
        nodeStyle.borderRadius = "30px";
        break;
      case "round":
        nodeStyle.borderRadius = "15px";
        break;
    }

    // Calculate node position based on whether it's in a subgraph or standalone
    let position: { x: number; y: number };
    let parentNode: string | undefined;

    if (node.subgraph) {
      // Node positioning within a subgraph
      const subgraphLayout = subgraphLayouts.get(node.subgraph);
      const subgraphPosition = subgraphPositions.get(node.subgraph);
      const nodeLayout = subgraphLayout?.nodes.get(node.id);

      if (nodeLayout && subgraphPosition) {
        // CRITICAL: React Flow expects positions relative to parent group
        // nodeLayout coordinates are already positioned relative to subgraph (0,0)
        // We convert from center-based to top-left coordinates for React Flow
        position = {
          x: nodeLayout.x - nodeLayout.width / 2,  // Convert center-x to top-left-x
          y: nodeLayout.y - nodeLayout.height / 2, // Convert center-y to top-left-y
        };
        parentNode = `subgraph-${node.subgraph}`;
        
        debugLog(`Node ${node.id} positioned at (${position.x}, ${position.y}) within subgraph ${node.subgraph}`);
      } else {
        // Fallback position if layout data is missing
        position = { x: 0, y: 0 };
        debugLog(`Warning: Missing layout data for node ${node.id} in subgraph ${node.subgraph}`);
      }
    } else {
      // Standalone node positioning (global coordinates)
      const standalonePos = standalonePositions.get(node.id);
      position = standalonePos || { x: 0, y: 0 };
      
      debugLog(`Standalone node ${node.id} positioned at (${position.x}, ${position.y})`);
    }

  // Source/Target handle preference by layout direction
  const isHorizontal = direction === 'LR' || direction === 'RL';
  const sourcePos = isHorizontal ? Position.Right : Position.Bottom;
  const targetPos = isHorizontal ? Position.Left : Position.Top;

    // Split visual vs layout styles. Visuals should live in node.data.style so the
    // inner `.custom-node` element can own appearance while the wrapper keeps layout props.
    const { backgroundColor, borderColor, borderWidth, borderStyle, borderRadius, boxShadow, ...layoutStyle } = nodeStyle;
    const nodeType = node.shape === "diamond" ? "diamond" : "custom";
    // For diamond nodes, keep the wrapper clean (no background/border). Only pass colors into data.style.
    const visualStyle = nodeType === 'diamond'
      ? { backgroundColor, borderColor, borderWidth }
      : { backgroundColor, borderColor, borderWidth, borderStyle, borderRadius, boxShadow };

    // Determine concrete width/height for the React Flow node wrapper:
    // - For nodes inside subgraphs, use the subgraph layout node dimensions
    // - For standalone nodes, compute based on label/shape (same as used for Dagre)
    let wrapperWidth = 150;
    let wrapperHeight = 60;
    if (node.subgraph) {
      const subgraphLayout = subgraphLayouts.get(node.subgraph);
      const nodeLayout = subgraphLayout?.nodes.get(node.id);
      if (nodeLayout) {
        wrapperWidth = Math.max(20, Math.round(nodeLayout.width));
        wrapperHeight = Math.max(20, Math.round(nodeLayout.height));
      }
    } else {
      const size = calculateNodeSize(node.label, node.shape, !!imageUrl);
      wrapperWidth = Math.max(20, Math.round(size.width));
      wrapperHeight = Math.max(20, Math.round(size.height));
    }

    reactFlowNodes.push({
      id: node.id,
      type: nodeType,
      position: position,
      data: {
        label: imageUrl ? cleanLabel : node.label,
        imageUrl: imageUrl || "",
        // githubUrl: "",
        description: "",
        shape: node.shape,
        colors,
        style: visualStyle,
      },
  // Keep layout-only style on the node wrapper and ensure width/height are explicit
  style: { ...layoutStyle, width: wrapperWidth, height: wrapperHeight },
      sourcePosition: sourcePos,
      targetPosition: targetPos,
      parentNode: parentNode,
      extent: parentNode ? "parent" : undefined,
      draggable: true,
      zIndex: 1,
    });
  });

  // Create edges with consistent styling
const reactFlowEdges: Edge[] = edges.map((edge, index) => {
  const edgeColors = ["#1976D2", "#388E3C", "#F57C00", "#7B1FA2", "#C2185B"];
  const edgeColor = edgeColors[index % edgeColors.length];

  // Default edge style - make all edges consistent
  let edgeStyle: any = {
    stroke: edgeColor,
    strokeWidth: 2.5, // Increased default width
  };

  // Always use smoothstep for consistency
  const edgeType = "smoothstep";
  let animated = true; // Default to animated for all edges

  // Style edges based on type, but keep animation consistent
  switch (edge.type) {
    case "-->":
    case "->":
      // Already has default animation and width
      break;
    case "---":
      edgeStyle.strokeDasharray = "8,4";
      break;
    case "-.-":
      edgeStyle.strokeDasharray = "4,4";
      break;
    case "==>":
    case "===>":
      edgeStyle.strokeWidth = 4;
      break;
  }

  // Adjust source and target IDs if they refer to subgraphs
  const sourceId = edge.isSourceSubgraph
    ? `subgraph-${edge.source}`
    : edge.source;
  const targetId = edge.isTargetSubgraph
    ? `subgraph-${edge.target}`
    : edge.target;

  // Create edge with explicit properties - ensure consistent styling
  return {
    id: `edge-${edge.source}-${edge.target}-${index}`,
    source: sourceId,
    target: targetId,
    label: edge.label,
    type: edgeType,
    animated, // Apply animation to ALL edges
    style: edgeStyle,
    labelStyle: {
      fontSize: "12px",
      fontWeight: "500",
      color: edgeColor,
      backgroundColor: "white",
      padding: "2px 6px",
      borderRadius: "4px",
      border: `1px solid ${edgeColor}`,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: edgeColor,
    },
  // Attach to side based on layout direction for better alignment
  sourceHandle: (direction === 'LR' || direction === 'RL') ? 'right-source' : 'bottom-source',
  targetHandle: (direction === 'LR' || direction === 'RL') ? 'left-target' : 'top-target',
    zIndex: 0,
  };
});


  return { nodes: reactFlowNodes, edges: reactFlowEdges };
}

// Main layout function using the three-phase approach
function layoutGraph(
  nodes: MermaidNode[],
  edges: MermaidEdge[],
  subgraphs: SubgraphInfo[],
  direction: string
): { nodes: Node[]; edges: Edge[] } {
  debugLog("Starting graph layout with direction:", direction);
  debugLog(
    `Input: ${nodes.length} nodes, ${edges.length} edges, ${subgraphs.length} subgraphs`
  );

  // Phase 1: Layout each subgraph independently
  const subgraphLayouts = layoutSubgraphs(nodes, edges, subgraphs, direction);

  // Phase 2: Layout meta-graph (containers + standalone nodes)
  const { subgraphPositions, standalonePositions } = layoutMetaGraph(
    nodes,
    edges,
    subgraphLayouts,
    direction
  );

  // Phase 2.5: Post-positioning adjustment - ensure parent containers properly contain positioned children
  const orderedSubgraphs = processSubgraphsInHierarchicalOrder(subgraphs);
  adjustParentSizesAfterPositioning(subgraphLayouts, subgraphPositions, orderedSubgraphs, direction);

  // Phase 3: Combine layouts and create React Flow elements
  return createReactFlowElements(
    nodes,
    edges,
    subgraphs,
    subgraphLayouts,
    subgraphPositions,
    standalonePositions,
    direction
  );
}

// Debug helper: run full conversion but return intermediate structures for inspection
export async function debugConvertMermaid(
  mermaidCode: string
): Promise<any> {
  const { nodes, edges, subgraphs, direction } = parseMermaidCode(mermaidCode);

  const subgraphLayouts = layoutSubgraphs(nodes, edges, subgraphs, direction);
  const { subgraphPositions, standalonePositions } = layoutMetaGraph(
    nodes,
    edges,
    subgraphLayouts,
    direction
  );

  const orderedSubgraphs = processSubgraphsInHierarchicalOrder(subgraphs);
  adjustParentSizesAfterPositioning(
    subgraphLayouts,
    subgraphPositions,
    orderedSubgraphs,
    direction
  );

  const reactFlowData = createReactFlowElements(
    nodes,
    edges,
    subgraphs,
    subgraphLayouts,
    subgraphPositions,
    standalonePositions,
    direction
  );

  // Convert Maps to plain objects/arrays for JSON-friendly output
  const subgraphLayoutsPlain: Record<string, any> = {};
  subgraphLayouts.forEach((v, k) => {
    subgraphLayoutsPlain[k] = {
      id: v.id,
      title: v.title,
      width: v.width,
      height: v.height,
      parentId: v.parentId,
      nodes: Array.from(v.nodes.entries()).map(([nid, pos]) => ({ id: nid, ...pos })),
    };
  });

  const subgraphPositionsPlain = Object.fromEntries(
    Array.from(subgraphPositions.entries())
  );
  const standalonePositionsPlain = Object.fromEntries(
    Array.from(standalonePositions.entries())
  );

  return {
    nodes,
    edges,
    subgraphs,
    direction,
    subgraphLayouts: subgraphLayoutsPlain,
    subgraphPositions: subgraphPositionsPlain,
    standalonePositions: standalonePositionsPlain,
    reactFlowData,
  };
}

export async function convertMermaidToReactFlow(
  mermaidCode: string
): Promise<ReactFlowData> {
  try {
    debugLog("Starting Mermaid to React Flow conversion");
    debugLog("Mermaid code:", mermaidCode);

    // Parse the Mermaid code
    const { nodes, edges, subgraphs, direction } =
      parseMermaidCode(mermaidCode);

    if (nodes.length === 0) {
      debugLog("No nodes found in Mermaid diagram");
      return { nodes: [], edges: [] };
    }

    debugLog(
      `Parsed ${nodes.length} nodes, ${edges.length} edges, ${subgraphs.length} subgraphs`
    );

    // Layout the graph and return
    return layoutGraph(nodes, edges, subgraphs, direction);
  } catch (error) {
    console.error("Error converting Mermaid to React Flow:", error);
    return { nodes: [], edges: [] };
  }
}
