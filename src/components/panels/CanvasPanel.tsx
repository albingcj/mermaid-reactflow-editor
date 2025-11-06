import { Button } from "@/components/ui";
import { FlowDiagram } from "@/features/canvas/FlowDiagram";
import Logo from "@/components/Logo";
import { X, Maximize2, PlusCircle } from "lucide-react";
import { Node, Edge } from "reactflow";
import type { EffectiveTheme, UseAccordionReturn } from "@/types";

export interface CanvasPanelProps {
  nodes: Node[];
  edges: Edge[];
  isStreaming: boolean;
  theme: EffectiveTheme;
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onRegisterMethods: (methods: {
    openSearch?: () => void;
    exportImage?: () => Promise<void>;
    selectSubgraphContents?: (id?: string) => void
  } | {}) => void;
  toggleFullscreen: () => void;
  onClose: () => void;
  accordion: UseAccordionReturn;
  isFullscreen?: boolean;
}

export function CanvasPanel({
  nodes,
  edges,
  isStreaming,
  theme,
  onNodesChange,
  onEdgesChange,
  onRegisterMethods,
  toggleFullscreen,
  onClose,
  accordion,
  isFullscreen = false,
}: CanvasPanelProps) {
  return (
    <>
      <div className="p-2 border-b flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Logo className="h-4 w-4 text-foreground" aria-hidden />
          <span className="font-medium text-sm">React Flow Canvas</span>
        </div>
        {!isFullscreen && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:scale-105 transition-transform"
              onClick={toggleFullscreen}
              title="Fullscreen"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:scale-105 transition-transform"
              onClick={onClose}
              title="Close Panel"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 relative overflow-hidden">
        <div className="w-full h-full">
          {nodes.length > 0 ? (
            <FlowDiagram
              nodes={nodes}
              edges={edges}
              interactive={!isStreaming}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onSelectionChange={() => {}}
              onRequestPreview={() => {}}
              onRegisterMethods={onRegisterMethods}
              theme={theme}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <div className="mx-auto mb-4 opacity-50">
                  <Logo className="h-12 w-12 mx-auto text-muted-foreground" aria-hidden />
                </div>
                <h4 className="text-lg font-normal text-muted-foreground mb-2">
                  No diagram to display
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a diagram in the editor or load a saved one
                </p>
                <Button
                  onClick={() => {
                    accordion.setAccordionOpen((prev) => ({ ...prev, editor: true }));
                  }}
                  className="gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Create Diagram
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
