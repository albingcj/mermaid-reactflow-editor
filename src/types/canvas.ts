/**
 * Canvas and Node Type Definitions
 *
 * This file contains TypeScript types for React Flow nodes, edges, and canvas-related types.
 */

import { NodeProps } from 'reactflow';

// ============================================================================
// Node Data Types
// ============================================================================

/**
 * Common node data properties shared across all node types
 */
export interface BaseNodeData {
  label: string;
  description?: string;
  style?: React.CSSProperties;
  isDragging?: boolean;
  locked?: boolean;
  onEdit?: () => void;
}

/**
 * Custom node data for standard shapes (rect, circle, etc.)
 */
export interface CustomNodeData extends BaseNodeData {
  imageUrl?: string;
  iconColor?: string;
  shape?: 'rect' | 'circle' | 'diamond' | 'stadium' | 'round';
}

/**
 * Diamond node data
 */
export interface DiamondNodeData extends BaseNodeData {
  // Diamond nodes can have additional properties here if needed
}

/**
 * Subgraph node data
 */
export interface SubgraphNodeData {
  label: string;
  isDragging?: boolean;
}

// ============================================================================
// Node Props Types
// ============================================================================

export interface CustomNodeProps extends NodeProps {
  data: CustomNodeData;
}

export interface DiamondNodeProps extends NodeProps {
  data: DiamondNodeData;
}

export interface SubgraphNodeProps extends NodeProps {
  data: SubgraphNodeData;
}

// ============================================================================
// Canvas Types
// ============================================================================

export type DrawingTool =
  | 'select'
  | 'pan'
  | 'rectangle'
  | 'circle'
  | 'diamond'
  | 'arrow'
  | 'text';

export type AlignmentType =
  | 'left'
  | 'center'
  | 'right'
  | 'top'
  | 'middle'
  | 'bottom';

export type DistributionType = 'horizontal' | 'vertical';

export interface CanvasPosition {
  x: number;
  y: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

// ============================================================================
// Edge Types
// ============================================================================

export interface CustomEdgeData {
  label?: string;
  style?: React.CSSProperties;
  animated?: boolean;
  sourceHandle?: string;
  targetHandle?: string;
}

export type EdgeType = 'default' | 'straight' | 'step' | 'smoothstep' | 'simplebezier';
