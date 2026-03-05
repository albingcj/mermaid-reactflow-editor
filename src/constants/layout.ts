// constants/layout.ts
export const LAYOUT_SPACING = {
  SUBGRAPH_HEADER_HEIGHT: 32, // Space for subgraph title
  SUBGRAPH_PADDING: 20, // Padding around subgraph content
  SUBGRAPH_CONTENT_TOP_MARGIN: 8, // Space below title before content starts
  
  // Node spacing within subgraphs - balanced for readability
  NODE_SEPARATION_HORIZONTAL: 60, // Horizontal distance between nodes in same rank
  NODE_SEPARATION_VERTICAL: 80, // Vertical distance between different ranks
  
  // Container spacing for meta-graph layout - top-level element separation
  CONTAINER_SEPARATION_HORIZONTAL: 100, // Distance between top-level subgraphs/nodes horizontally
  CONTAINER_SEPARATION_VERTICAL: 120, // Distance between top-level subgraphs/nodes vertically
  
  // Nested subgraph spacing - child subgraphs within parents
  NESTED_SUBGRAPH_SEPARATION_HORIZONTAL: 80, // Distance between sibling subgraphs
  NESTED_SUBGRAPH_SEPARATION_VERTICAL: 100, // Distance between nested subgraph ranks
  
  // Margin constants for different layout contexts
  META_GRAPH_MARGIN: 60, // Outer margin for the entire diagram
  NESTED_CONTENT_MARGIN: 30, // Margin around content within nested subgraphs
  MIXED_CONTENT_VERTICAL_SPACING: 80, // Spacing between nodes and nested subgraphs in same parent
  MIXED_CONTENT_HORIZONTAL_SPACING: 100, // Spacing when laying out children beside nodes (LR/RL)
} as const;

export const LAYOUT_RANKERS = {
  NETWORK_SIMPLEX: 'network-simplex',
  TIGHT_TREE: 'tight-tree',
  LONGEST_PATH: 'longest-path',
} as const;

export type LayoutRanker = typeof LAYOUT_RANKERS[keyof typeof LAYOUT_RANKERS];

export const DEFAULT_LAYOUT_RANKER: LayoutRanker = LAYOUT_RANKERS.TIGHT_TREE;