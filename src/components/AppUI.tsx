import { useCallback, useRef } from "react";
import { Node, Edge } from "reactflow";
import { LoadDialog } from "@/components/LoadDialog";
import { AppHeader } from "@/components/AppHeader";
import { FullscreenView } from "@/components/FullscreenView";
import { CodePanel, PreviewPanel, CanvasPanel } from "@/components/panels";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from "@/components/ui";
import { Toasts } from "@/components/Toasts";
import type {
  UseDiagramReturn,
  UseThemeReturn,
  UsePanelVisibilityReturn,
  UseAccordionReturn,
  UseToastReturn,
  UseFullscreenReturn,
  UseDialogReturn,
} from "@/types";

export interface AISettings {
  apiKey: string;
  model: string;
  isEditingSettings: boolean;
  provider: string;
}

export interface AppUIProps {
  diagram: UseDiagramReturn;
  theme: UseThemeReturn;
  panel: UsePanelVisibilityReturn;
  accordion: UseAccordionReturn;
  toast: UseToastReturn;
  fullscreen: UseFullscreenReturn;
  dialog: UseDialogReturn;
  aiSettings: AISettings;
  setAiSettings: React.Dispatch<React.SetStateAction<AISettings>>;
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
}

export function AppUI({
  diagram,
  theme,
  panel,
  accordion,
  toast,
  fullscreen,
  dialog,
  aiSettings,
  setAiSettings,
  aiPrompt,
  setAiPrompt
}: AppUIProps) {
  const flowMethodsRef = useRef<{
    openSearch?: () => void;
    exportImage?: () => Promise<void>;
    selectSubgraphContents?: (id?: string) => void
  } | null>(null);

  // Register flow methods
  const registerFlowMethods = useCallback((methods: {
    openSearch?: () => void;
    exportImage?: () => Promise<void>;
    selectSubgraphContents?: (id?: string) => void
  } | {}) => {
    if (!methods || Object.keys(methods).length === 0) {
      flowMethodsRef.current = null;
    } else {
      flowMethodsRef.current = methods as any;
    }
  }, []);

  // Handle nodes change
  const handleNodesChange = useCallback((nodes: Node[]) => {
    diagram.setFlowData((prev) => ({ ...prev, nodes }));
  }, [diagram]);

  // Handle edges change
  const handleEdgesChange = useCallback((edges: Edge[]) => {
    diagram.setFlowData((prev) => ({ ...prev, edges }));
  }, [diagram]);

  // Handle save diagram
  const handleSaveDiagram = useCallback(() => {
    const src = diagram.mermaidSource?.trim();
    const hasNodes = (diagram.flowData.nodes || []).length > 0;
    if (!src || src === '' || !hasNodes) {
      toast.showToast('Cannot save: please provide Mermaid code and at least one node', 'info');
      return;
    }

    const id = Math.random().toString(36).slice(2);
    const now = Date.now();
    const defaultName = new Date(now).toLocaleString();
    const item = {
      id,
      name: defaultName,
      mermaid: diagram.mermaidSource,
      nodes: diagram.flowData.nodes || [],
      edges: diagram.flowData.edges || [],
      createdAt: now,
      updatedAt: now,
    };
    const next = [item, ...diagram.savedDiagrams];
    diagram.setSavedDiagrams(next);
    diagram.lastAppliedMermaidRef.current = diagram.mermaidSource;
    toast.showToast('Diagram saved to session', 'success');
    accordion.setAccordionOpen((prev) => ({ ...prev, saved: true }));
  }, [diagram, toast, accordion]);

  // Handle export to JSON
  const handleExportToJSON = useCallback(() => {
    const src = diagram.mermaidSource?.trim();
    const hasNodes = (diagram.flowData.nodes || []).length > 0;
    if (!src || src === '' || !hasNodes) {
      toast.showToast('Cannot export: please provide Mermaid code and at least one node', 'info');
      return;
    }

    const now = Date.now();
    const payload = {
      id: `export-${now}`,
      name: `diagram-${new Date(now).toISOString().slice(0, 19).replace(/:/g, '-')}`,
      mermaid: diagram.mermaidSource,
      nodes: diagram.flowData.nodes || [],
      edges: diagram.flowData.edges || [],
      createdAt: now,
      updatedAt: now,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${payload.name}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.showToast('Exported diagram as JSON', 'success');
  }, [diagram, toast]);

  // Render fullscreen view if active
  if (fullscreen.fullscreenPanel) {
    return (
      <FullscreenView
        fullscreenPanel={fullscreen.fullscreenPanel}
        diagram={diagram}
        theme={theme}
        toast={toast}
        showAiGenerator={dialog.showAiGenerator}
        toggleAiGenerator={dialog.toggleAiGenerator}
        toggleFullscreen={fullscreen.toggleFullscreen}
        aiSettings={aiSettings}
        setAiSettings={setAiSettings}
        aiPrompt={aiPrompt}
        setAiPrompt={setAiPrompt}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onRegisterMethods={registerFlowMethods}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <AppHeader
        theme={theme}
        panel={panel}
        onLoadDiagram={dialog.openLoadDialog}
        onSaveDiagram={handleSaveDiagram}
        onExportJSON={handleExportToJSON}
        onToggleMobileMenu={dialog.toggleMobileMenu}
        isMobileMenuOpen={dialog.isMobileMenuOpen}
      />

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Code Editor Panel */}
          {panel.visiblePanels.code && (
            <>
              <ResizablePanel
                defaultSize={panel.getDefaultPanelSize("code")}
                minSize={20}
                className="border-r bg-card flex flex-col min-h-0"
              >
                <CodePanel
                  diagram={diagram}
                  theme={theme.effectiveTheme}
                  toast={toast}
                  showAiGenerator={dialog.showAiGenerator}
                  toggleAiGenerator={dialog.toggleAiGenerator}
                  toggleFullscreen={() => fullscreen.toggleFullscreen("code")}
                  onClose={() => panel.togglePanelVisibility("code")}
                  aiSettings={aiSettings}
                  setAiSettings={setAiSettings}
                  aiPrompt={aiPrompt}
                  setAiPrompt={setAiPrompt}
                />
              </ResizablePanel>
              {(panel.visiblePanels.preview || panel.visiblePanels.canvas) && <ResizableHandle withHandle />}
            </>
          )}

          {/* Preview Panel */}
          {panel.visiblePanels.preview && (
            <>
              <ResizablePanel
                defaultSize={panel.getDefaultPanelSize("preview")}
                minSize={20}
                className="border-r bg-card flex flex-col min-h-0"
              >
                <PreviewPanel
                  mermaidSource={diagram.mermaidSource}
                  toggleFullscreen={() => fullscreen.toggleFullscreen("preview")}
                  onClose={() => panel.togglePanelVisibility("preview")}
                />
              </ResizablePanel>
              {panel.visiblePanels.canvas && <ResizableHandle withHandle />}
            </>
          )}

          {/* Canvas Panel */}
          {panel.visiblePanels.canvas && (
            <ResizablePanel
              defaultSize={panel.getDefaultPanelSize("canvas")}
              minSize={30}
              className="flex flex-col min-h-0"
            >
              <CanvasPanel
                nodes={diagram.flowData.nodes}
                edges={diagram.flowData.edges}
                isStreaming={diagram.isStreaming}
                theme={theme.effectiveTheme}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onRegisterMethods={registerFlowMethods}
                toggleFullscreen={() => fullscreen.toggleFullscreen("canvas")}
                onClose={() => panel.togglePanelVisibility("canvas")}
                accordion={accordion}
              />
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Load Dialog */}
      <LoadDialog
        isOpen={dialog.showLoadDialog}
        onClose={dialog.closeLoadDialog}
        savedDiagrams={diagram.savedDiagrams}
        setSavedDiagrams={diagram.setSavedDiagrams}
        onLoadDiagram={(diagramItem) => {
          diagram.setMermaidSource(diagramItem.mermaid);
          diagram.setFlowData({ nodes: diagramItem.nodes, edges: diagramItem.edges });
          toast.showToast('Diagram loaded successfully', 'success');
        }}
      />

      {/* Toasts */}
      <Toasts toasts={toast.toasts} onDismiss={toast.dismissToast} />

      {/* Confirmation dialogs */}
      <AlertDialog open={dialog.clearDialogOpen} onOpenChange={dialog.closeClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear the editor and canvas? This will remove all unsaved changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={dialog.closeClearDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              diagram.setMermaidSource("");
              diagram.setFlowData({ nodes: [], edges: [] });
              accordion.setActiveAccordion("editor");
              dialog.closeClearDialog();
            }}>
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
