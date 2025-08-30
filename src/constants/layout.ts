// constants/layout.ts
export const LAYOUT_SPACING = {
  SUBGRAPH_HEADER_HEIGHT: 35, // Increased for proper title clearance
  SUBGRAPH_PADDING: 8, // Base padding around subgraph edges (reduced to tighten layout)
  SUBGRAPH_CONTENT_TOP_MARGIN: 10, // Additional space below title before content
  
  // Node spacing within subgraphs - controls minimum distance between nodes
  NODE_SEPARATION_HORIZONTAL: 80, // Minimum horizontal distance between nodes in same rank
  NODE_SEPARATION_VERTICAL: 100, // Minimum vertical distance between different ranks
  
  // Container spacing for meta-graph layout - controls distance between top-level elements
  CONTAINER_SEPARATION_HORIZONTAL: 120, // Distance between top-level subgraphs/nodes horizontally (reduced)
  CONTAINER_SEPARATION_VERTICAL: 160, // Distance between top-level subgraphs/nodes vertically (slightly reduced)
  
  // Nested subgraph spacing - controls spacing of child subgraphs within parents
  NESTED_SUBGRAPH_SEPARATION_HORIZONTAL: 120, // Distance between sibling subgraphs (increased)
  NESTED_SUBGRAPH_SEPARATION_VERTICAL: 140, // Distance between nested subgraph ranks (increased)
  
  // Margin constants for different layout contexts
  META_GRAPH_MARGIN: 100, // Outer margin for the entire diagram
  NESTED_CONTENT_MARGIN: 40, // Margin around content within nested subgraphs (increased)
  MIXED_CONTENT_VERTICAL_SPACING: 100, // Extra spacing between nodes and nested subgraphs in same parent (increased)
  MIXED_CONTENT_HORIZONTAL_SPACING: 120, // Extra spacing when laying out children beside nodes (LR/RL)
} as const;

export const LAYOUT_RANKERS = {
  NETWORK_SIMPLEX: 'network-simplex',
  TIGHT_TREE: 'tight-tree',
  LONGEST_PATH: 'longest-path',
} as const;

export type LayoutRanker = typeof LAYOUT_RANKERS[keyof typeof LAYOUT_RANKERS];

export const DEFAULT_LAYOUT_RANKER: LayoutRanker = LAYOUT_RANKERS.TIGHT_TREE;