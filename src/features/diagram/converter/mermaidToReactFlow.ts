import { Node, Edge, MarkerType, Position } from "reactflow";
import mermaid from "mermaid";
import dagre from "dagre";
import { LAYOUT_SPACING } from "@/constants/layout";

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
  // Set by convertMermaidToReactFlow's optional `resolveNodeImage` hook when a
  // caller (e.g. the AWS architecture flow) wants to attach a service icon
  // BEFORE layout, so the node is sized as a compact icon node instead of a
  // text label from the very start.
  resolvedImageUrl?: string;
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

// Layout spacing constants used by the compound-graph layout engine below.
const SUBGRAPH_HEADER_HEIGHT = LAYOUT_SPACING.SUBGRAPH_HEADER_HEIGHT; // Space reserved for each subgraph's title bar
const SUBGRAPH_CONTENT_TOP_MARGIN = LAYOUT_SPACING.SUBGRAPH_CONTENT_TOP_MARGIN; // Additional space below the title before content starts

// Node spacing - controls minimum distance between nodes/clusters in the same rank/across ranks
const NODE_SEPARATION_HORIZONTAL = LAYOUT_SPACING.NODE_SEPARATION_HORIZONTAL;
const NODE_SEPARATION_VERTICAL = LAYOUT_SPACING.NODE_SEPARATION_VERTICAL;

// Outer margin for the entire diagram
const META_GRAPH_MARGIN = LAYOUT_SPACING.META_GRAPH_MARGIN;

const DAGRE_RANKER: 'network-simplex' | 'tight-tree' | 'longest-path' = 'tight-tree';

// Fixed square size for service-icon nodes (e.g. AWS architecture diagrams).
// Deliberately small and constant - the icon graphic itself is always the
// same visual size regardless of how long the service name is; only the
// separate floating caption below the node varies with label length.
const ICON_NODE_SIZE = 56;

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
  // Fixed, small icon size for image (service icon) nodes. This is
  // intentionally independent of the label/caption length - the caption
  // renders in a separate floating element below the node (see
  // `.image-caption` in App.css) and is never truncated, so the icon box
  // itself should stay a consistent compact size no matter how long the
  // service name is.
  if (isImageNode) {
    return { width: ICON_NODE_SIZE, height: ICON_NODE_SIZE };
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
    // Fallback heuristic - more accurate character width
    return text.length * 7.5;
  }

  const maxLineWidth = Math.max(...lines.map((line) => Math.ceil(measureLineWidth(line))));

  // Tighter padding for more compact nodes
  const horizontalPadding = 24; // Left + right padding
  const verticalPadding = 16; // Top + bottom padding
  const lineHeight = 18; // Line height for text
  
  const baseWidth = maxLineWidth + horizontalPadding;
  const baseHeight = lines.length * lineHeight + verticalPadding;
  
  // Reasonable minimums without excessive extra space
  const width = Math.max(70, baseWidth);
  const height = Math.max(36, baseHeight);

  if (shape === "diamond") {
    return {
      // Account for diagonal bounding box
      width: Math.max(80, Math.ceil(width * 1.1)),
      height: Math.max(80, Math.ceil(height * 1.1)),
    };
  }
  if (shape === "circle") {
    const size = Math.max(width, height) + 8;
    return { width: size, height: size };
  }
  return { width, height };
}

// Helper function to detect and extract image URLs from labels. If a
// `resolvedImageUrl` was already attached to the node (via the
// `resolveNodeImage` hook passed to `convertMermaidToReactFlow`), that takes
// priority over scanning the label text for an embedded URL - the label text
// itself (e.g. "Route 53") is then used as-is for the caption, unmodified.
function extractImageUrl(label: string, resolvedImageUrl?: string): { imageUrl: string | null; cleanLabel: string } {
  if (resolvedImageUrl) {
    return { imageUrl: resolvedImageUrl, cleanLabel: label };
  }

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

// ============================================================================
// Compound-graph layout engine
// ============================================================================
//
// This replaces an earlier multi-phase approach that laid out each subgraph
// independently with its own `dagre.layout()` call, then tried to glue the
// results together with a separate "meta-graph" pass and manual bounding-box
// math. That approach had no way to give dagre visibility into edges that
// cross subgraph boundaries during ranking, so containers were frequently
// undersized, overlapping, or misaligned relative to their real content
// whenever a diagram had cross-boundary edges (which real AWS architecture
// diagrams have constantly - e.g. a Lambda inside a VPC calling out to
// DynamoDB outside it).
//
// This was verified against Mermaid's own flowchart renderer source
// (mermaid-js/mermaid, packages/mermaid/src/rendering-util/layout-algorithms/
// dagre/{index.js,mermaid-graphlib.js}) and against dagre's own compound-graph
// primitives (dagre/lib/{graphlib.js,nesting-graph.js,add-border-segments.js}).
// Mermaid builds ONE compound graph via `graphlib.Graph({compound: true})` and
// `graph.setParent(nodeId, parentId)`, then calls `dagre.layout()` ONCE. Dagre
// natively supports this via its "nesting graph" technique (Sander, "Layout of
// Compound Directed Graphs"): it inserts border dummy nodes for every cluster's
// top/bottom rank and inflates `minlen` on edges so cluster contents are always
// ranked between those borders, then `removeBorderNodes` computes the final
// cluster width/height directly from the border nodes' actual positions after
// layout - not from a separate manual bounding-box pass.
//
// The one thing raw dagre's compound API cannot do is have an edge whose
// endpoint IS a cluster node itself (e.g. `subgraphA --> subgraphB`) - it
// throws inside rank assignment. Mermaid works around this by rewriting such
// edges to point at an actual descendant leaf node instead (an "anchor"),
// which is exactly what we do below in `resolveEdgeEndpoint`.
//
// Node/cluster sizing:
// - Leaf node sizes come from `calculateNodeSize` (existing helper, unchanged).
// - Cluster (subgraph) sizes are NOT computed manually. We let dagre size them
//   via its native border-node mechanism, then apply the same post-layout
//   header-height inflation Mermaid itself applies (`node.height += title
//   margin; node.y -= title margin / 2`) to reserve room for the title bar
//   without disturbing dagre's own containment math.

interface CompoundLayoutResult {
  // Absolute (top-level-graph) center-based positions/sizes for every node id
  // (both leaf mermaid nodes and subgraph container ids).
  nodes: Map<string, { x: number; y: number; width: number; height: number }>;
  edges: Array<{
    source: string;
    target: string;
    // The edge as originally authored - used to look up label/type after layout.
    original: MermaidEdge;
  }>;
}

/**
 * Builds a single dagre compound graph for the entire diagram (all nodes and
 * subgraphs, nested to any depth) and runs one `dagre.layout()` pass, mirroring
 * how Mermaid's own flowchart renderer works. This gives dagre full visibility
 * into cross-boundary edges while ranking, so subgraph containers end up
 * correctly sized and positioned around their actual content in a single
 * coherent optimization, instead of several independent layouts glued
 * together afterward.
 */
function layoutCompoundGraph(
  nodes: MermaidNode[],
  edges: MermaidEdge[],
  subgraphs: SubgraphInfo[],
  direction: string
): CompoundLayoutResult {
  const g = new dagre.graphlib.Graph({ compound: true, multigraph: true });
  g.setGraph({
    rankdir: direction,
    nodesep: NODE_SEPARATION_HORIZONTAL,
    ranksep: NODE_SEPARATION_VERTICAL,
    marginx: META_GRAPH_MARGIN,
    marginy: META_GRAPH_MARGIN,
    ranker: DAGRE_RANKER,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const subgraphById = new Map(subgraphs.map((sg) => [sg.id, sg]));

  // 1. Add every subgraph as a cluster (parent) node. No explicit width/height -
  //    dagre computes these from the border nodes it inserts for the cluster's
  //    content, exactly like Mermaid's own renderer relies on.
  const orderedSubgraphs = processSubgraphsInHierarchicalOrder(subgraphs);
  orderedSubgraphs.forEach((sg) => {
    g.setNode(sg.id, {});
  });
  // Parent relationships must be set after all cluster nodes exist, and parents
  // before children (processSubgraphsInHierarchicalOrder already guarantees
  // parent-before-child ordering, but setParent itself requires the parent
  // node to already exist in the graph, which the loop above ensures).
  orderedSubgraphs.forEach((sg) => {
    if (sg.parentId && subgraphById.has(sg.parentId)) {
      g.setParent(sg.id, sg.parentId);
    }
  });

  // 2. Add every leaf mermaid node, parented to its subgraph (if any).
  nodes.forEach((node) => {
    const { imageUrl } = extractImageUrl(node.label, node.resolvedImageUrl);
    const size = calculateNodeSize(node.label, node.shape, !!imageUrl);
    g.setNode(node.id, { width: size.width, height: size.height });
    if (node.subgraph && subgraphById.has(node.subgraph)) {
      g.setParent(node.id, node.subgraph);
    }
  });

  // 3. Resolve every edge endpoint to a real (non-cluster) node id before
  //    calling dagre.layout(). Raw dagre's compound-graph rank assignment
  //    crashes if an edge's source or target is itself a node that has
  //    children (a cluster) - see mermaid's `adjustClustersAndEdges` /
  //    `getAnchorId` for the equivalent workaround in their renderer.
  //
  //    We only need to rewrite edges whose endpoint IS a subgraph id; edges
  //    between two ordinary leaf nodes work correctly with dagre's compound
  //    API even when one or both are nested many levels deep inside clusters
  //    (verified empirically - dagre's nesting-graph handles that natively).
  const resolveEdgeEndpoint = (id: string): string | undefined => {
    if (!subgraphById.has(id)) return id; // already a leaf node
    // Descend into the first available leaf descendant. Prefer nodes that
    // belong directly to this subgraph; if it has none (only nested child
    // subgraphs), recurse into the first child subgraph.
    const sg = subgraphById.get(id)!;
    const directChild = nodes.find((n) => n.subgraph === id);
    if (directChild) return directChild.id;
    const childSubgraph = orderedSubgraphs.find((s) => s.parentId === id);
    if (childSubgraph) return resolveEdgeEndpoint(childSubgraph.id);
    return undefined; // empty subgraph with no descendants at all
  };

  const resolvedEdges: Array<{ source: string; target: string; original: MermaidEdge }> = [];
  let syntheticEdgeCounter = 0;
  edges.forEach((edge) => {
    const sourceId = resolveEdgeEndpoint(edge.source);
    const targetId = resolveEdgeEndpoint(edge.target);
    if (!sourceId || !targetId) {
      debugLog(`Skipping edge with unresolvable endpoint: ${edge.source} -> ${edge.target}`);
      return;
    }
    resolvedEdges.push({ source: sourceId, target: targetId, original: edge });

    if (sourceId === targetId) {
      // Self-loop after anchor resolution (e.g. an edge between a subgraph and
      // one of its own descendants). Dagre handles true self-edges (v === w)
      // gracefully on its own (verified empirically), so just pass it through
      // as-is rather than trying to special-case it.
      g.setEdge(sourceId, targetId, {}, `edge-${syntheticEdgeCounter++}`);
      return;
    }
    if (!g.hasEdge(sourceId, targetId)) {
      g.setEdge(sourceId, targetId, {}, `edge-${syntheticEdgeCounter++}`);
    }
  });

  // 4. Run dagre's compound-graph layout ONCE for the whole diagram.
  dagre.layout(g);

  // 5. Reserve title-bar space for every cluster by inflating its height and
  //    shifting it up, exactly as Mermaid's own renderer does post-layout
  //    (`node.height += subGraphTitleTotalMargin; node.y -= .../2`). Doing
  //    this after layout (rather than trying to reserve the space with a
  //    dummy title node before layout) avoids destabilizing dagre's rank
  //    assignment - verified empirically that pre-layout title dummy nodes
  //    can trigger rank-assignment crashes on deeply nested graphs, while
  //    post-layout inflation is simple, safe, and matches upstream Mermaid.
  const titleReserve = SUBGRAPH_HEADER_HEIGHT + SUBGRAPH_CONTENT_TOP_MARGIN;
  subgraphs.forEach((sg) => {
    const node = g.node(sg.id);
    if (!node) return;
    node.height += titleReserve;
    node.y -= titleReserve / 2;
  });

  // 6. Collect absolute positions for every node (leaves + clusters).
  const resultNodes = new Map<string, { x: number; y: number; width: number; height: number }>();
  g.nodes().forEach((id: string) => {
    const n = g.node(id);
    if (!n || typeof n.x !== "number") return;
    resultNodes.set(id, { x: n.x, y: n.y, width: n.width, height: n.height });
  });

  return { nodes: resultNodes, edges: resolvedEdges };
}

/**
 * Converts the flat, absolute-coordinate compound layout into React Flow
 * nodes/edges. Subgraph containers become `type: "group"` nodes; leaf nodes
 * and nested subgraphs get `parentNode` set to their immediate container with
 * positions made relative to that container's top-left corner, as required by
 * React Flow's parent/child node model.
 */
function compoundLayoutToReactFlow(
  nodes: MermaidNode[],
  edges: MermaidEdge[],
  subgraphs: SubgraphInfo[],
  layout: CompoundLayoutResult,
  direction: string
): ReactFlowData {
  const reactFlowNodes: Node[] = [];
  const subgraphById = new Map(subgraphs.map((sg) => [sg.id, sg]));

  const getNodeColors = (shape: string) => {
    const colorSchemes: Record<string, [string, string]> = {
      rect: ["#E3F2FD", "#1976D2"],
      diamond: ["#FFF3E0", "#F57C00"],
      circle: ["#E8F5E8", "#388E3C"],
      stadium: ["#F3E5F5", "#7B1FA2"],
      round: ["#FCE4EC", "#C2185B"],
    };
    const colors = colorSchemes[shape] || ["#F0F4F8", "#2D3748"];
    return { backgroundColor: colors[0], borderColor: colors[1] };
  };

  const getSubgraphColors = (index: number) => {
    const subgraphColors = [
      { bg: "rgba(227, 242, 253, 0.4)", border: "#1976D2" },
      { bg: "rgba(232, 245, 233, 0.4)", border: "#388E3C" },
      { bg: "rgba(243, 229, 245, 0.4)", border: "#7B1FA2" },
      { bg: "rgba(255, 243, 224, 0.4)", border: "#F57C00" },
      { bg: "rgba(252, 228, 236, 0.4)", border: "#C2185B" },
    ];
    return subgraphColors[index % subgraphColors.length];
  };

  const isHorizontal = direction === "LR" || direction === "RL";
  const sourcePos = isHorizontal ? Position.Right : Position.Bottom;
  const targetPos = isHorizontal ? Position.Left : Position.Top;

  // Absolute top-left position of a node/cluster from its center-based dagre box.
  const topLeftOf = (id: string) => {
    const box = layout.nodes.get(id);
    if (!box) return null;
    return { x: box.x - box.width / 2, y: box.y - box.height / 2, width: box.width, height: box.height };
  };

  // Subgraph containers, parents before children so React Flow can resolve
  // `parentNode` references on first render.
  const orderedSubgraphs = processSubgraphsInHierarchicalOrder(subgraphs);
  orderedSubgraphs.forEach((sg, index) => {
    const box = topLeftOf(sg.id);
    if (!box) return;

    let relX = box.x;
    let relY = box.y;
    if (sg.parentId) {
      const parentBox = topLeftOf(sg.parentId);
      if (parentBox) {
        relX = box.x - parentBox.x;
        relY = box.y - parentBox.y;
      }
    }

    const colors = getSubgraphColors(index);
    reactFlowNodes.push({
      id: `subgraph-${sg.id}`,
      type: "group",
      position: { x: relX, y: relY },
      data: { label: sg.title, isSubgraph: true },
      style: {
        backgroundColor: colors.bg,
        border: `3px solid ${colors.border}`,
        borderRadius: "12px",
        width: box.width,
        height: box.height,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        zIndex: 0,
      },
      selectable: true,
      draggable: true,
      connectable: true,
      parentNode: sg.parentId ? `subgraph-${sg.parentId}` : undefined,
      extent: sg.parentId ? "parent" : undefined,
      zIndex: sg.parentId ? 1 : 0,
    });
  });

  // Leaf nodes.
  nodes.forEach((node) => {
    const box = topLeftOf(node.id);
    if (!box) {
      debugLog(`Warning: no layout position for node ${node.id}`);
      return;
    }

    const colors = getNodeColors(node.shape);
    const { imageUrl, cleanLabel } = extractImageUrl(node.label, node.resolvedImageUrl);

    let nodeStyle: any = {
      backgroundColor: colors.backgroundColor,
      borderColor: colors.borderColor,
      borderWidth: "2px",
      borderStyle: "solid" as const,
      borderRadius: "8px",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    };
    if (imageUrl) {
      nodeStyle = {
        backgroundColor: "transparent",
        background: "transparent",
        border: "none",
        borderRadius: "8px",
        boxShadow: "none",
      };
    }
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

    let position = { x: box.x, y: box.y };
    let parentNode: string | undefined;
    if (node.subgraph && subgraphById.has(node.subgraph)) {
      const parentBox = topLeftOf(node.subgraph);
      if (parentBox) {
        position = { x: box.x - parentBox.x, y: box.y - parentBox.y };
      }
      parentNode = `subgraph-${node.subgraph}`;
    }

    const { backgroundColor, borderColor, borderWidth, borderStyle, borderRadius, boxShadow, ...layoutStyle } =
      nodeStyle;
    const nodeType = node.shape === "diamond" ? "diamond" : "custom";
    const visualStyle =
      nodeType === "diamond"
        ? { backgroundColor, borderColor, borderWidth }
        : { backgroundColor, borderColor, borderWidth, borderStyle, borderRadius, boxShadow };

    reactFlowNodes.push({
      id: node.id,
      type: nodeType,
      position,
      data: {
        label: imageUrl ? cleanLabel : node.label,
        imageUrl: imageUrl || "",
        description: "",
        shape: node.shape,
        colors,
        style: visualStyle,
      },
      style: { ...layoutStyle, width: Math.max(20, Math.round(box.width)), height: Math.max(20, Math.round(box.height)) },
      sourcePosition: sourcePos,
      targetPosition: targetPos,
      parentNode,
      extent: parentNode ? "parent" : undefined,
      draggable: true,
      zIndex: parentNode ? 2 : 1,
    });
  });

  // Edges: rendered using the ORIGINAL authored source/target ids (so an edge
  // authored as `A --> B` still visually connects nodes A and B), while the
  // anchor-resolution above was only used to keep dagre's ranking algorithm
  // from crashing on cluster-to-cluster edges. If the original endpoint was a
  // subgraph, point the rendered edge at the subgraph's React Flow group node
  // instead of the leaf anchor, matching the user's intent.
  const edgeColors = ["#1976D2", "#388E3C", "#F57C00", "#7B1FA2", "#C2185B"];
  const reactFlowEdges: Edge[] = edges.map((edge, index) => {
    const edgeColor = edgeColors[index % edgeColors.length];
    const edgeStyle: any = { stroke: edgeColor, strokeWidth: 2.5 };
    switch (edge.type) {
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

    const sourceId = subgraphById.has(edge.source) ? `subgraph-${edge.source}` : edge.source;
    const targetId = subgraphById.has(edge.target) ? `subgraph-${edge.target}` : edge.target;

    return {
      id: `edge-${edge.source}-${edge.target}-${index}`,
      source: sourceId,
      target: targetId,
      label: edge.label,
      type: "smoothstep",
      animated: true,
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
      markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: edgeColor },
      sourceHandle: isHorizontal ? "right-source" : "bottom-source",
      targetHandle: isHorizontal ? "left-target" : "top-target",
      zIndex: 0,
    };
  });

  return { nodes: reactFlowNodes, edges: reactFlowEdges };
}

// Main layout function: builds one compound dagre graph for the whole diagram
// and converts the result to React Flow nodes/edges. See the comment block at
// the top of this section for the full rationale and the upstream Mermaid
// source references this was verified against.
function layoutGraph(
  nodes: MermaidNode[],
  edges: MermaidEdge[],
  subgraphs: SubgraphInfo[],
  direction: string
): ReactFlowData {
  debugLog("Starting compound-graph layout with direction:", direction);
  debugLog(`Input: ${nodes.length} nodes, ${edges.length} edges, ${subgraphs.length} subgraphs`);

  const layout = layoutCompoundGraph(nodes, edges, subgraphs, direction);
  return compoundLayoutToReactFlow(nodes, edges, subgraphs, layout, direction);
}

// Debug helper: run full conversion but return intermediate structures for inspection
export async function debugConvertMermaid(mermaidCode: string): Promise<any> {
  const { nodes, edges, subgraphs, direction } = parseMermaidCode(mermaidCode);

  const layout = layoutCompoundGraph(nodes, edges, subgraphs, direction);
  const reactFlowData = compoundLayoutToReactFlow(nodes, edges, subgraphs, layout, direction);

  const nodePositionsPlain = Object.fromEntries(Array.from(layout.nodes.entries()));

  return {
    nodes,
    edges,
    subgraphs,
    direction,
    nodePositions: nodePositionsPlain,
    reactFlowData,
  };
}

// Extract layout from Mermaid's actual SVG rendering
async function extractMermaidLayout(mermaidCode: string): Promise<{
  nodes: Map<string, { x: number; y: number; width: number; height: number }>;
  edges: Array<{ source: string; target: string; points: Array<{ x: number; y: number }> }>;
} | null> {
  // Create a temporary container to render Mermaid. Declared outside the try
  // block so the finally clause can always clean it up, even if mermaid.render
  // throws (which happens frequently on partial/invalid code while streaming).
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  document.body.appendChild(container);

  try {
    // Render the diagram
    const { svg } = await mermaid.render('temp-mermaid-extract', mermaidCode);
    container.innerHTML = svg;

    const svgElement = container.querySelector('svg');
    if (!svgElement) {
      return null;
    }

    const nodes = new Map<string, { x: number; y: number; width: number; height: number }>();
    const edges: Array<{ source: string; target: string; points: Array<{ x: number; y: number }> }> = [];

    // Extract node positions from the SVG
    const nodeElements = svgElement.querySelectorAll('.node');
    nodeElements.forEach((nodeEl) => {
      const id = nodeEl.id?.replace('flowchart-', '')?.replace(/-\d+$/, '');
      if (!id) return;

      // Get the bounding box
      const bbox = (nodeEl as SVGGraphicsElement).getBBox();
      
      // Get transform if any
      const transform = nodeEl.getAttribute('transform');
      let tx = 0, ty = 0;
      if (transform) {
        const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
        if (match) {
          tx = parseFloat(match[1]);
          ty = parseFloat(match[2]);
        }
      }

      nodes.set(id, {
        x: bbox.x + tx,
        y: bbox.y + ty,
        width: bbox.width,
        height: bbox.height
      });
    });

    // Extract edge paths
    const edgeElements = svgElement.querySelectorAll('.edgePath');
    edgeElements.forEach((edgeEl) => {
      const pathEl = edgeEl.querySelector('path');
      if (!pathEl) return;

      // Parse the path to get points (simplified - just get start/end for now)
      const d = pathEl.getAttribute('d');
      if (!d) return;

      // Extract source/target from edge classes or data attributes
      const classes = edgeEl.getAttribute('class') || '';
      const match = classes.match(/LS-(\w+)\s+LE-(\w+)/);
      if (match) {
        edges.push({
          source: match[1],
          target: match[2],
          points: [] // Could parse path data here if needed
        });
      }
    });

    return { nodes, edges };
  } catch (error) {
    debugLog('Error extracting Mermaid layout:', error);
    return null;
  } finally {
    // Always remove the temp container, even on error, to avoid leaking
    // detached-looking (but body-attached) DOM nodes on every streamed chunk.
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/**
 * Optional hook to resolve a node's label to an icon image URL BEFORE layout
 * runs. This matters because node sizing depends on whether a node is an
 * "image node" (fixed small icon size) vs a text node (size grows with label
 * length) - if icon resolution happens after layout (as it previously did in
 * ArchitectureUI, attaching `imageUrl` post-hoc), the layout engine sizes the
 * box for a plain-text label and the icon then gets dropped into a box sized
 * for text it never actually displays, which is why icon boxes ended up much
 * larger than the icon itself. Returning null/undefined means "not an image
 * node" (falls back to normal text sizing).
 */
export type NodeImageResolver = (label: string, nodeId: string) => string | null | undefined;

export async function convertMermaidToReactFlow(
  mermaidCode: string,
  resolveNodeImage?: NodeImageResolver
): Promise<ReactFlowData> {
  try {
    debugLog("Starting Mermaid to React Flow conversion");
    debugLog("Mermaid code:", mermaidCode);

    // Try to extract layout from Mermaid's rendering first
    const mermaidLayout = await extractMermaidLayout(mermaidCode);
    
    // Parse the Mermaid code
    const { nodes, edges, subgraphs, direction } =
      parseMermaidCode(mermaidCode);

    if (nodes.length === 0) {
      debugLog("No nodes found in Mermaid diagram");
      return { nodes: [], edges: [] };
    }

    // Resolve icon images (if a resolver was supplied) BEFORE any layout
    // math runs, so node sizing can correctly treat these as compact icon
    // nodes from the start instead of sizing them for a text label.
    if (resolveNodeImage) {
      nodes.forEach((node) => {
        const resolved = resolveNodeImage(node.label, node.id);
        if (resolved) {
          (node as any).resolvedImageUrl = resolved;
        }
      });
    }

    debugLog(
      `Parsed ${nodes.length} nodes, ${edges.length} edges, ${subgraphs.length} subgraphs`
    );

    // Mermaid's native SVG layout gives us pixel-accurate node positions, but
    // its internal cluster (subgraph) element IDs are generated by Mermaid's
    // own renderer and do NOT reliably correspond to the subgraph ids our
    // parser derives from titles (especially for quoted/anonymous subgraphs,
    // e.g. `subgraph "AWS Region (e.g. us-east-1)"`). Trying to correlate the
    // two id spaces caused some nested levels to be found and others missed,
    // which left child nodes referencing a `parentNode` that was never
    // created â€” React Flow then throws "Parent node ... not found" and the
    // whole canvas crashes.
    //
    // The Dagre-based layout path below builds subgraph containers using our
    // own self-consistent ids end-to-end, so nesting is always internally
    // consistent. We only use Mermaid's native layout as a fast path for
    // diagrams with NO subgraphs at all, where there is no nesting to get
    // wrong.
    if (subgraphs.length === 0 && mermaidLayout && mermaidLayout.nodes.size > 0) {
      debugLog("Using Mermaid's native layout (no subgraphs present)");
      return convertMermaidLayoutToReactFlow(nodes, edges, subgraphs, mermaidLayout, direction);
    }

    // Dagre layout: used whenever the diagram has subgraphs (VPC/AZ/subnet
    // nesting), and as the fallback when Mermaid's own rendering fails.
    debugLog("Using Dagre layout");
    return layoutGraph(nodes, edges, subgraphs, direction);
  } catch (error) {
    console.error("Error converting Mermaid to React Flow:", error);
    return { nodes: [], edges: [] };
  }
}

// Convert Mermaid's native layout to React Flow format
function convertMermaidLayoutToReactFlow(
  nodes: MermaidNode[],
  edges: MermaidEdge[],
  subgraphs: SubgraphInfo[],
  mermaidLayout: {
    nodes: Map<string, { x: number; y: number; width: number; height: number }>;
  },
  direction: string
): ReactFlowData {
  const reactFlowNodes: Node[] = [];
  const reactFlowEdges: Edge[] = [];

  const getNodeColors = (shape: string) => {
    const colorSchemes = {
      rect: ["#E3F2FD", "#1976D2"],
      diamond: ["#FFF3E0", "#F57C00"],
      circle: ["#E8F5E8", "#388E3C"],
      stadium: ["#F3E5F5", "#7B1FA2"],
      round: ["#FCE4EC", "#C2185B"],
    };
    return colorSchemes[shape as keyof typeof colorSchemes] || ["#F0F4F8", "#2D3748"];
  };

  const isHorizontal = direction === 'LR' || direction === 'RL';
  const sourcePos = isHorizontal ? Position.Right : Position.Bottom;
  const targetPos = isHorizontal ? Position.Left : Position.Top;

  // NOTE: This function is only invoked when `subgraphs.length === 0` (see
  // `convertMermaidToReactFlow`), so there are no subgraph containers to
  // build here. Nested VPC/AZ/subnet-style diagrams always go through the
  // Dagre-based `layoutGraph` path instead, which builds subgraph containers
  // using self-consistent ids (see that function for details).

  // Create nodes using Mermaid's positions
  nodes.forEach((node) => {
    const layout = mermaidLayout.nodes.get(node.id);
    if (!layout) return;

    const colors = getNodeColors(node.shape);
    const { imageUrl, cleanLabel } = extractImageUrl(node.label, node.resolvedImageUrl);

    let nodeStyle: any = {
      backgroundColor: colors[0],
      borderColor: colors[1],
      borderWidth: "2px",
      borderStyle: "solid",
      borderRadius: "8px",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    };

    if (imageUrl) {
      nodeStyle = {
        backgroundColor: "transparent",
        background: "transparent",
        border: "none",
        borderRadius: "8px",
        boxShadow: "none",
      };
    }

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

    const nodeType = node.shape === "diamond" ? "diamond" : "custom";
    const { backgroundColor, borderColor, borderWidth, borderStyle, borderRadius, boxShadow, ...layoutStyle } = nodeStyle;
    const visualStyle = nodeType === 'diamond'
      ? { backgroundColor, borderColor, borderWidth }
      : { backgroundColor, borderColor, borderWidth, borderStyle, borderRadius, boxShadow };

    reactFlowNodes.push({
      id: node.id,
      type: nodeType,
      position: { x: layout.x, y: layout.y },
      data: {
        label: imageUrl ? cleanLabel : node.label,
        imageUrl: imageUrl || "",
        description: "",
        shape: node.shape,
        colors: { backgroundColor: colors[0], borderColor: colors[1] },
        style: visualStyle,
      },
      style: { ...layoutStyle, width: layout.width, height: layout.height },
      sourcePosition: sourcePos,
      targetPosition: targetPos,
      draggable: true,
      zIndex: 1,
    });
  });

  // Create edges
  const edgeColors = ["#1976D2", "#388E3C", "#F57C00", "#7B1FA2", "#C2185B"];
  edges.forEach((edge, index) => {
    const edgeColor = edgeColors[index % edgeColors.length];
    
    let edgeStyle: any = {
      stroke: edgeColor,
      strokeWidth: 2.5,
    };

    switch (edge.type) {
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

    reactFlowEdges.push({
      id: `edge-${edge.source}-${edge.target}-${index}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: "smoothstep",
      animated: true,
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
      sourceHandle: isHorizontal ? 'right-source' : 'bottom-source',
      targetHandle: isHorizontal ? 'left-target' : 'top-target',
      zIndex: 0,
    });
  });

  return { nodes: reactFlowNodes, edges: reactFlowEdges };
}
