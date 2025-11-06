/**
 * Hook return type definitions
 *
 * This file contains TypeScript types for all custom hook return values.
 * Import these types when defining props that accept hook return values.
 */

import { Node, Edge } from 'reactflow';
import { ReactFlowData } from '@/features/diagram/converter';
import { PanelType } from '@/constants';

// ============================================================================
// useDiagram Hook Types
// ============================================================================

export interface SavedDiagram {
  id: string;
  name: string;
  mermaid: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: number;
  updatedAt: number;
}

export interface UseDiagramReturn {
  mermaidSource: string;
  setMermaidSource: (source: string) => void;
  flowData: ReactFlowData;
  setFlowData: React.Dispatch<React.SetStateAction<ReactFlowData>>;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  savedDiagrams: SavedDiagram[];
  setSavedDiagrams: (diagrams: SavedDiagram[]) => void;
  lastAppliedMermaidRef: React.MutableRefObject<string>;
  convertMermaid: (source: string) => Promise<void>;
}

// ============================================================================
// useTheme Hook Types
// ============================================================================

export type ThemePreference = 'system' | 'light' | 'dark';
export type EffectiveTheme = 'light' | 'dark';

export interface UseThemeReturn {
  themePref: ThemePreference;
  setThemePref: (pref: ThemePreference) => void;
  effectiveTheme: EffectiveTheme;
}

// ============================================================================
// usePanelVisibility Hook Types
// ============================================================================

export interface UsePanelVisibilityReturn {
  visiblePanels: Record<PanelType, boolean>;
  togglePanelVisibility: (panel: PanelType) => void;
  visiblePanelCount: number;
  getDefaultPanelSize: (panel: PanelType) => number;
}

// ============================================================================
// useDialog Hook Types
// ============================================================================

export interface UseDialogReturn {
  showLoadDialog: boolean;
  clearDialogOpen: boolean;
  isPropertiesOpen: boolean;
  showAiGenerator: boolean;
  isMobileMenuOpen: boolean;
  openLoadDialog: () => void;
  closeLoadDialog: () => void;
  openClearDialog: () => void;
  closeClearDialog: () => void;
  openProperties: () => void;
  closeProperties: () => void;
  toggleAiGenerator: () => void;
  toggleMobileMenu: () => void;
}

// ============================================================================
// useAccordion Hook Types
// ============================================================================

export type AccordionSection = 'editor' | 'palette' | 'saved';

export interface UseAccordionReturn {
  accordionOpen: Record<AccordionSection, boolean>;
  setAccordionOpen: React.Dispatch<React.SetStateAction<Record<AccordionSection, boolean>>>;
  activeAccordion: AccordionSection;
  setActiveAccordion: (section: AccordionSection) => void;
  toggleAccordion: (section: AccordionSection) => void;
}

// ============================================================================
// useFlowMethods Hook Types
// ============================================================================

export interface FlowMethods {
  openSearch?: () => void;
  exportImage?: () => Promise<void>;
  selectSubgraphContents?: (id?: string) => void;
}

export interface UseFlowMethodsReturn {
  flowMethodsRef: React.MutableRefObject<FlowMethods | null>;
  registerFlowMethods: (methods: FlowMethods | {}) => void;
}

// ============================================================================
// useFullscreen Hook Types
// ============================================================================

import type { FullscreenPanel } from '@/constants';

export interface UseFullscreenReturn {
  fullscreenPanel: FullscreenPanel | null;  // Can be a panel name or null
  toggleFullscreen: (panel: FullscreenPanel) => void;
}

// ============================================================================
// useNodeSelection Hook Types
// ============================================================================

export interface UseNodeSelectionReturn {
  selectedNodes: string[];
  setSelectedNodes: (nodes: string[]) => void;
  editingNode: Node | null;
  setEditingNode: (node: Node | null) => void;
  handleNodeClick: (nodeId: string, isMultiSelect: boolean, nodes: Node[]) => void;
  clearNodeSelection: () => void;
}

// ============================================================================
// useToast Hook Types
// ============================================================================

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export interface UseToastReturn {
  toasts: Toast[];
  showToast: (message: string, type: ToastType, duration?: number) => void;
  dismissToast: (id: string) => void;
}
