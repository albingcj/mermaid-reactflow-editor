// constants/nodeShapes.ts
export const NODE_SHAPES = {
  RECTANGLE: 'rect',
  DIAMOND: 'diamond',
  CIRCLE: 'circle',
  STADIUM: 'stadium',
  ROUND: 'round',
} as const;

export type NodeShape = typeof NODE_SHAPES[keyof typeof NODE_SHAPES];

export const DEFAULT_NODE_SHAPE = NODE_SHAPES.RECTANGLE;

export const NODE_SHAPE_COLORS = {
  [NODE_SHAPES.RECTANGLE]: ['#E3F2FD', '#1976D2'], // Blue
  [NODE_SHAPES.DIAMOND]: ['#FFF3E0', '#F57C00'], // Orange
  [NODE_SHAPES.CIRCLE]: ['#E8F5E8', '#388E3C'], // Green
  [NODE_SHAPES.STADIUM]: ['#F3E5F5', '#7B1FA2'], // Purple
  [NODE_SHAPES.ROUND]: ['#FCE4EC', '#C2185B'], // Pink
} as const;