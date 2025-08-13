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

const SUBGRAPH_HEADER_HEIGHT = 10;
const SUBGRAPH_PADDING = 10; // Increased from 30 to 40 for more breathing room
const DEBUG = true; // Set to true to enable debug logging
 
function debugLog(...args: any[]) {
  if (DEBUG){
    console.log("[MermaidConverter]", ...args);
  }
}

function cleanLabel(label: string): string {
  return label
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .trim();
}

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

function parseMermaidCode(code: string): {
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
  const cleanCode = code
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("%%"))
    .join("\n");

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
      .trim();
  }

  // Pre-scan to find all node definitions
  debugLog("Pre-scanning for node definitions...");
  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("subgraph") || trimmedLine === "end" || trimmedLine.startsWith("%%")) return;

    // Enhanced node definition pattern to capture more variations
    const nodeDefPattern = /([A-Za-z0-9_]+)([\[\(\{][^\]\)\}]*[\]\)\}])/g;
    let match;
    
    while ((match = nodeDefPattern.exec(trimmedLine)) !== null) {
      const [fullDef, nodeId, shapeDef] = match;
      
      if (!nodeDefinitions.has(nodeId)) {
        const shape = getNodeShape(fullDef);
        const labelMatch = shapeDef.match(/[\[\(\{]([^\]\)\}]*)[\]\)\}]/);
        const rawLabel = labelMatch ? labelMatch[1] : nodeId;
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

    // Handle subgraph start - Enhanced pattern to handle subgraph titles with spaces
    const subgraphMatch = line.match(/^subgraph\s+([^\s\[]+)(?:\s*\[(.+)\])?/);
    if (subgraphMatch) {
      const [, subgraphId, subgraphTitle] = subgraphMatch;

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

    // Handle subgraph start
    const subgraphMatch = line.match(/^subgraph\s+([^\s\[]+)(?:\s*\[(.+)\])?/);
    if (subgraphMatch) {
      const [, subgraphId] = subgraphMatch;
      subgraphStack.push(subgraphId);
      debugLog(`Entering subgraph: ${subgraphId}, stack: [${subgraphStack.join(', ')}]`);
      continue;
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

    // Enhanced edge patterns to handle all Mermaid edge types including dotted edges
    const edgePatterns = [
      // Pattern 1: A[Label] -->|EdgeLabel| B{Label} (with optional edge labels)
      /([A-Za-z0-9_]+)(?:[\[\(\{][^\]\)\}]*[\]\)\}])?\s*(-{2,3}>|->|---|={2,3}>|==>|-\.-|:-:|::|~|\.\.\.|===|-\.->)\s*(?:\|([^|]+)\|)?\s*([A-Za-z0-9_]+)(?:[\[\(\{][^\]\)\}]*[\]\)\}])?/,
      // Pattern 2: Simpler pattern A --> B (handles all edge types)
      /([A-Za-z0-9_]+)\s*(-{2,3}>|->|---|={2,3}>|==>|-\.-|:-:|::|~|\.\.\.|===|-\.->)\s*([A-Za-z0-9_]+)/,
    ];

    let edgeMatch = null;
    let patternUsed = -1;
    
    for (let p = 0; p < edgePatterns.length; p++) {
      const pattern = edgePatterns[p];
      edgeMatch = line.match(pattern);
      if (edgeMatch) {
        patternUsed = p;
        debugLog(`Line "${line}" matched edge pattern ${p}: [${edgeMatch.join(', ')}]`);
        break;
      }
    }

    if (!edgeMatch) {
      debugLog(`Line "${line}" did not match any edge pattern - checking for standalone nodes`);
    }

    if (edgeMatch) {
      try {
        let sourceId: string;
        let edgeType: string;
        let edgeLabel: string;
        let targetId: string;

        if (patternUsed === 0) {
          // Pattern 1: A[Label] -->|EdgeLabel| B{Label}
          sourceId = edgeMatch[1];
          edgeType = edgeMatch[2];
          edgeLabel = edgeMatch[3] || "";
          targetId = edgeMatch[4];
        } else {
          // Pattern 2: A --> B
          sourceId = edgeMatch[1];
          edgeType = edgeMatch[2];
          targetId = edgeMatch[3];
          edgeLabel = "";
        }

        debugLog(
          `Found edge: ${sourceId} ${edgeType} ${targetId} with label: "${edgeLabel}" in context: ${currentSubgraph || "global"}`
        );

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
  const maxLineLength = Math.max(...lines.map((line) => line.length));
  
  // Base size from content, with reasonable minimums and generous padding
  const baseWidth = maxLineLength * 8 + 30; // Content-based width
  const baseHeight = lines.length * 20 + 20; // Content-based height
  
  // Add some additional space based on content (not rigid minimums)
  const width = Math.max(80, baseWidth + 30); // Content + 30px extra, min 80px for readability
  const height = Math.max(40, baseHeight + 20); // Content + 20px extra, min 40px for readability

  if (shape === "diamond") {
    return {
      width: Math.max(80, width * 0.9), // Slightly smaller for diamond visual balance
      height: Math.max(80, height * 0.9),
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

    // Create a new graph for this subgraph
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: direction,
      nodesep: 40,
      ranksep: 60,
      marginx: SUBGRAPH_PADDING,
      marginy: SUBGRAPH_PADDING + SUBGRAPH_HEADER_HEIGHT,
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

    subgraphNodes.forEach((node) => {
      const nodeLayout = g.node(node.id);
      if (!nodeLayout) {
        debugLog(
          `Warning: No layout information for node ${node.id} in subgraph ${subgraph.id}`
        );
        return;
      }

      const size = calculateNodeSize(node.label, node.shape);

      nodePositions.set(node.id, {
        x: nodeLayout.x,
        y: nodeLayout.y,
        width: size.width,
        height: size.height,
      });

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

    // Normalize positions to start from (0, 0) with header space
    const offsetX = -minX + SUBGRAPH_PADDING;
    const offsetY = -minY + SUBGRAPH_PADDING + SUBGRAPH_HEADER_HEIGHT;

    nodePositions.forEach((pos, nodeId) => {
      nodePositions.set(nodeId, {
        ...pos,
        x: pos.x + offsetX,
        y: pos.y + offsetY,
      });
    });

    // Calculate base size from actual content
    const baseWidth = maxX - minX + SUBGRAPH_PADDING * 2;
    const baseHeight = maxY - minY + SUBGRAPH_PADDING * 2 + SUBGRAPH_HEADER_HEIGHT;

    // Use only a small fixed buffer for width/height (no multipliers)
    const width = baseWidth + 10; // Small buffer
    const height = baseHeight + 10;

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
  recalculateParentSubgraphSizes(subgraphLayouts, orderedSubgraphs);

  return subgraphLayouts;
}

// Recalculate parent subgraph sizes to include nested subgraphs
function recalculateParentSubgraphSizes(
  subgraphLayouts: Map<string, SubgraphLayout>,
  orderedSubgraphs: SubgraphInfo[]
) {
  // Process in reverse order (children first, then parents)
  for (let i = orderedSubgraphs.length - 1; i >= 0; i--) {
    const subgraph = orderedSubgraphs[i];
    const layout = subgraphLayouts.get(subgraph.id);
    
    if (!layout) continue;

    // Find all direct child subgraphs
    const childSubgraphs = orderedSubgraphs.filter(sg => sg.parentId === subgraph.id);
    
    if (childSubgraphs.length === 0) continue;

    // Calculate the minimum required size to contain all child subgraphs
    let maxChildRight = 0;
    let maxChildBottom = 0;

    childSubgraphs.forEach(childSg => {
      const childLayout = subgraphLayouts.get(childSg.id);
      if (childLayout) {
        // Child will be positioned at SUBGRAPH_PADDING from left/top
        const childRight = SUBGRAPH_PADDING + childLayout.width;
        const childBottom = SUBGRAPH_HEADER_HEIGHT + SUBGRAPH_PADDING + childLayout.height;
        
        maxChildRight = Math.max(maxChildRight, childRight);
        maxChildBottom = Math.max(maxChildBottom, childBottom);
      }
    });

    // Calculate minimum required parent size based on child content + generous additional space
    const baseRequiredWidth = maxChildRight + SUBGRAPH_PADDING;
    const baseRequiredHeight = maxChildBottom + SUBGRAPH_PADDING;
    
    // Add content-based additional space (not multipliers)
    const additionalWidthForChildren = Math.max(80, baseRequiredWidth * 0.3); // Add 30% more, min 80px
    const additionalHeightForChildren = Math.max(60, baseRequiredHeight * 0.3); // Add 30% more, min 60px
    
    const minRequiredWidth = baseRequiredWidth + additionalWidthForChildren;
    const minRequiredHeight = baseRequiredHeight + additionalHeightForChildren;

    // Update parent size if it needs to be larger
    const needsUpdate = minRequiredWidth > layout.width || minRequiredHeight > layout.height;
    
    if (needsUpdate) {
      // Use the larger of current size or required size, with generous buffer
      layout.width = Math.max(layout.width, minRequiredWidth);
      layout.height = Math.max(layout.height, minRequiredHeight);
      
      debugLog(
        `Updated subgraph ${subgraph.id} size to accommodate nested subgraphs: width=${layout.width}, height=${layout.height} (was too small for ${childSubgraphs.length} children)`
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
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    nodesep: 80,
    ranksep: 100,
    marginx: 50,
    marginy: 50,
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

  // Position nested subgraphs relative to their parents
  const processedSubgraphs = new Set<string>();

  // Position nested subgraphs relative to their parents
  function positionNestedSubgraphs() {
    let progress = false;

    subgraphLayouts.forEach((layout, id) => {
      if (!processedSubgraphs.has(id) && layout.parentId) {
        const parentPos = subgraphPositions.get(layout.parentId);
        const parentLayout = subgraphLayouts.get(layout.parentId);

        if (parentPos && parentLayout) {
          // Position inside parent with some padding
          const x = parentPos.x + SUBGRAPH_PADDING;
          const y = parentPos.y + SUBGRAPH_HEADER_HEIGHT + SUBGRAPH_PADDING;

          subgraphPositions.set(id, { x, y });
          processedSubgraphs.add(id);
          progress = true;

          debugLog(
            `Positioned nested subgraph ${id} at (${x}, ${y}) relative to parent ${layout.parentId}`
          );
        }
      }
    });

    return progress;
  }

  // Keep positioning nested subgraphs until no more progress is made
  while (positionNestedSubgraphs()) {}

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
  standalonePositions: Map<string, { x: number; y: number }>
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

      reactFlowNodes.push({
        id: `subgraph-${subgraph.id}`,
        type: "group",
        position: position,
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
          zIndex: -1,
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

    let position: { x: number; y: number };
    let parentNode: string | undefined;

    if (node.subgraph) {
      // Node is inside a subgraph
      const subgraphLayout = subgraphLayouts.get(node.subgraph);
      const subgraphPosition = subgraphPositions.get(node.subgraph);
      const nodeLayout = subgraphLayout?.nodes.get(node.id);

      if (nodeLayout && subgraphPosition) {
        // Position relative to the subgraph container (not global coordinates)
        // The nodeLayout positions are already relative within the subgraph
        position = {
          x: nodeLayout.x - nodeLayout.width / 2,
          y: nodeLayout.y - nodeLayout.height / 2,
        };
        parentNode = `subgraph-${node.subgraph}`;
      } else {
        position = { x: 0, y: 0 };
      }
    } else {
      // Standalone node
      const standalonePos = standalonePositions.get(node.id);
      position = standalonePos || { x: 0, y: 0 };
    }

    reactFlowNodes.push({
      id: node.id,
      type: "custom",
      position: position,
      data: {
        label: imageUrl ? cleanLabel : node.label,
        imageUrl: imageUrl || "",
        // githubUrl: "",
        description: "",
        shape: node.shape,
        colors,
      },
      style: nodeStyle,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
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
    // These ensure consistent connections
    sourceHandle: edge.isSourceSubgraph ? "bottom-source" : "bottom-source",
    targetHandle: edge.isTargetSubgraph ? "top-target" : "top-target",
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

  // Phase 3: Combine layouts and create React Flow elements
  return createReactFlowElements(
    nodes,
    edges,
    subgraphs,
    subgraphLayouts,
    subgraphPositions,
    standalonePositions
  );
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
