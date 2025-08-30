// constants/alignment.ts
export const ALIGNMENT_TYPES = {
  LEFT: 'left',
  RIGHT: 'right',
  TOP: 'top',
  BOTTOM: 'bottom',
  CENTER_HORIZONTAL: 'center-horizontal',
  CENTER_VERTICAL: 'center-vertical',
} as const;

export type AlignmentType = typeof ALIGNMENT_TYPES[keyof typeof ALIGNMENT_TYPES];

export const DISTRIBUTION_TYPES = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
} as const;

export type DistributionType = typeof DISTRIBUTION_TYPES[keyof typeof DISTRIBUTION_TYPES];

export const LAYOUT_DIRECTIONS = {
  TOP_TO_BOTTOM: 'TB',
  BOTTOM_TO_TOP: 'BT',
  LEFT_TO_RIGHT: 'LR',
  RIGHT_TO_LEFT: 'RL',
} as const;

export type LayoutDirection = typeof LAYOUT_DIRECTIONS[keyof typeof LAYOUT_DIRECTIONS];