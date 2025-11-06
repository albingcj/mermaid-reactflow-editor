import { Button, Badge, Card } from "@/components/ui";
import { CodePanel } from "@/components/panels";
import { MermaidRenderer } from "@/features/diagram/MermaidRenderer";
import { FlowDiagram } from "@/features/canvas/FlowDiagram";
import { Minimize2, FileText } from "lucide-react";
import { Node, Edge } from "reactflow";
import type {
  UseDiagramReturn,
  UseThemeReturn,
  UseToastReturn,
  FullscreenPanel,
} from "@/types";
import { AISettings } from "@/components/AppUI";
import { cn } from "@/lib/utils";

export interface FullscreenViewProps {
  fullscreenPanel: FullscreenPanel;
  diagram: UseDiagramReturn;
  theme: UseThemeReturn;
  toast: UseToastReturn;
  showAiGenerator: boolean;
  toggleAiGenerator: () => void;
  toggleFullscreen: (panel: FullscreenPanel) => void;
  aiSettings: AISettings;
  setAiSettings: React.Dispatch<React.SetStateAction<AISettings>>;
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onRegisterMethods: (methods: {
    openSearch?: () => void;
    exportImage?: () => Promise<void>;
    selectSubgraphContents?: (id?: string) => void
  } | {}) => void;
}

export function FullscreenView({
  fullscreenPanel,
  diagram,
  theme,
  toast,
  showAiGenerator,
  toggleAiGenerator,
  toggleFullscreen,
  aiSettings,
  setAiSettings,
  aiPrompt,
  setAiPrompt,
  onNodesChange,
  onEdgesChange,
  onRegisterMethods,
}: FullscreenViewProps) {
  const getPanelTitle = () => {
    switch (fullscreenPanel) {
      case "code":
        return "Code Editor";
      case "preview":
        return "Mermaid Preview";
      case "canvas":
        return "React Flow Canvas";
      default:
        return "";
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col min-h-0 overflow-hidden">
      {/* Fullscreen Header */}
      <header className="border-b bg-card px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-foreground">{getPanelTitle()}</h1>
          <Badge variant="secondary" className="text-xs">
            Fullscreen
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleFullscreen(fullscreenPanel)}
          className="gap-2 hover:bg-muted/80 transition-colors"
        >
          <Minimize2 className="h-4 w-4" />
          <span className="hidden sm:inline">Exit Fullscreen</span>
        </Button>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden">
        {fullscreenPanel === "code" && (
          <div className="h-full p-3 sm:p-6 flex flex-col min-h-0 overflow-hidden">
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAiGenerator}
                className="gap-2 mb-3 hover:bg-primary/10 transition-all duration-200"
              >
                <span>AI Generate</span>
              </Button>
            </div>

            <Card className="flex-1 min-h-0 p-6 bg-muted/30 hover:bg-muted/40 transition-colors flex flex-col overflow-hidden">
              <div className="font-mono text-sm text-muted-foreground mb-4">
                Mermaid Code Editor - Fullscreen
              </div>
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <CodePanel
                  diagram={diagram}
                  theme={theme.effectiveTheme}
                  toast={toast}
                  showAiGenerator={showAiGenerator}
                  toggleAiGenerator={toggleAiGenerator}
                  toggleFullscreen={() => toggleFullscreen("code")}
                  onClose={() => toggleFullscreen("code")}
                  aiSettings={aiSettings}
                  setAiSettings={setAiSettings}
                  aiPrompt={aiPrompt}
                  setAiPrompt={setAiPrompt}
                  isFullscreen={true}
                />
              </div>
            </Card>
          </div>
        )}

        {fullscreenPanel === "preview" && (
          <div className="h-full p-6">
            <Card className="h-full p-6 flex items-center justify-center bg-muted/30 hover:bg-muted/40 transition-colors">
              {diagram.mermaidSource ? (
                <MermaidRenderer
                  code={diagram.mermaidSource}
                  className="w-full h-full min-h-0"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Mermaid Preview - Fullscreen</p>
                  <p className="text-sm mt-2">Live preview will render here with full detail</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {fullscreenPanel === "canvas" && (
          <div className="h-full flex flex-col">
            <div className="flex-1 relative overflow-hidden">
              <div
                className={cn(
                  "w-full h-full bg-background relative transition-all duration-300",
                  "bg-[radial-gradient(circle,_theme(colors.border)_1px,_transparent_1px)] bg-[length:20px_20px]",
                )}
                style={{ transform: `scale(${100 / 100})` }}
              >
                <FlowDiagram
                  nodes={diagram.flowData.nodes}
                  edges={diagram.flowData.edges}
                  interactive={!diagram.isStreaming}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onSelectionChange={() => {}}
                  onRequestPreview={() => {}}
                  onRegisterMethods={onRegisterMethods}
                  theme={theme.effectiveTheme}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
