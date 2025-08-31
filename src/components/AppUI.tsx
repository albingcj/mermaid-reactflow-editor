import { useCallback, useRef } from "react";
import { FlowDiagram } from "@/features/canvas/FlowDiagram";
import MermaidEditor from "@/features/editor/MermaidEditor";
import { MermaidRenderer } from "@/features/diagram/MermaidRenderer";
import GeminiMermaidGenerator from "@/features/ai/GeminiMermaidGenerator";
import { LoadDialog } from "@/components/LoadDialog";
import { 
  Button, 
  Popover, 
  PopoverTrigger, 
  PopoverContent,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  Card,
  Badge,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
import Logo from "@/components/Logo";
import {
  Code2,
  Eye,
  EyeOff,
  Layers,
  Save,
  Download,
  Settings,
  Sparkles,
  X,
  Maximize2,
  Minimize2,
  FileText,
  MousePointer,
  Square,
  Circle,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  Trash2,
  Lock,
  Grid,
  ChevronUp,
  ChevronDown,
  Palette,
  Menu,
  Hand,
  Sun,
  Moon,
  Monitor,
  ArrowRight,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  MoveUp,
  Info,
  MoveDown,
  FolderOpen,
  ChevronRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
  MoreHorizontal,
  Search,
  Image,
  PlusCircle,
  LayoutGrid,
  Pencil,
  BoxSelect
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppUIProps {
  diagram: any;
  theme: any;
  panel: any;
  accordion: any;
  toast: any;
  fullscreen: any;
  dialog: any;
  nodeSelection: any;
  aiSettings: {
    apiKey: string;
    model: string;
    isEditingSettings: boolean;
    provider: string;
  };
  setAiSettings: (settings: any) => void;
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
  nodeSelection,
  aiSettings,
  setAiSettings,
  aiPrompt,
  setAiPrompt
}: AppUIProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const flowMethodsRef = useRef<{ 
    openSearch?: () => void; 
    exportImage?: () => Promise<void>; 
    selectSubgraphContents?: (id?: string) => void 
  } | null>(null);

  // UI tools definitions
  const tools = [
    { id: "select", icon: MousePointer, label: "Select" },
    { id: "pan", icon: Hand, label: "Pan" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "arrow", icon: ArrowRight, label: "Arrow" },
    { id: "text", icon: Type, label: "Text" },
  ];

  const alignmentTools = [
    { id: "align-left", icon: AlignLeft, label: "Align Left" },
    { id: "align-center", icon: AlignCenter, label: "Align Center" },
    { id: "align-right", icon: AlignRight, label: "Align Right" },
  ];

  const verticalAlignmentTools = [
    { id: "align-top", icon: AlignHorizontalJustifyCenter, label: "Align Top" },
    { id: "align-middle", icon: AlignVerticalJustifyCenter, label: "Align Middle" },
    { id: "align-bottom", icon: AlignHorizontalJustifyCenter, label: "Align Bottom" },
  ];

  const distributionTools = [
    { id: "distribute-horizontal", icon: AlignHorizontalSpaceAround, label: "Distribute Horizontally" },
    { id: "distribute-vertical", icon: AlignVerticalSpaceAround, label: "Distribute Vertically" },
  ];

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
  const handleNodesChange = useCallback((nodes: any[]) => {
    diagram.setFlowData((prev: any) => ({ ...prev, nodes }));
  }, [diagram]);

  // Handle edges change
  const handleEdgesChange = useCallback((edges: any[]) => {
    diagram.setFlowData((prev: any) => ({ ...prev, edges }));
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
    // Record last applied mermaid so future no-op edits don't reconvert immediately
    diagram.lastAppliedMermaidRef.current = diagram.mermaidSource;
    toast.showToast('Diagram saved to session', 'success');
    // show saved list
    accordion.setAccordionOpen((prev: any) => ({ ...prev, saved: true }));
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

  if (fullscreen.fullscreenPanel) {
    return (
      <div className="h-screen bg-background flex flex-col min-h-0 overflow-hidden">
        {/* Fullscreen Header */}
        <header className="border-b bg-card px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-foreground">
              {fullscreen.fullscreenPanel === "code" && "Code Editor"}
              {fullscreen.fullscreenPanel === "preview" && "Mermaid Preview"}
              {fullscreen.fullscreenPanel === "canvas" && "React Flow Canvas"}
            </h1>
            <Badge variant="secondary" className="text-xs">
              Fullscreen
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fullscreen.toggleFullscreen(fullscreen.fullscreenPanel!)}
            className="gap-2 hover:bg-muted/80 transition-colors"
          >
            <Minimize2 className="h-4 w-4" />
            <span className="hidden sm:inline">Exit Fullscreen</span>
          </Button>
        </header>

        <div className="flex-1 min-h-0 overflow-hidden">
          {fullscreen.fullscreenPanel === "code" && (
            <div className="h-full p-3 sm:p-6 flex flex-col min-h-0 overflow-hidden">
              <div className="mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={dialog.toggleAiGenerator}
                  className="gap-2 mb-3 hover:bg-primary/10 transition-all duration-200"
                >
                  <Sparkles className="h-4 w-4" />
                  AI Generate
                  {dialog.showAiGenerator ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>

                {dialog.showAiGenerator && (
                  <div className="p-3 border-b bg-gradient-to-r dark:from-primary/5 dark:to-primary/10 border-primary/20 animate-in slide-in-from-top-2 duration-300 flex-shrink-0">
                    <GeminiMermaidGenerator
                      onStart={() => diagram.setIsStreaming(true)}
                      onStop={() => diagram.setIsStreaming(false)}
                      apiKey={aiSettings.apiKey}
                      model={aiSettings.model}
                      userInput={aiPrompt}
                      onApiKeyChange={(v: string) => setAiSettings((s: any) => ({ ...s, apiKey: v }))}
                      onModelChange={(v: string) => setAiSettings((s: any) => ({ ...s, model: v }))}
                      onUserInputChange={(v: string) => setAiPrompt(v)}
                      onClose={() => {}}
                      onChunk={(partial: string) => {
                        // update editor progressively so preview/conversion can run as content streams
                        diagram.setMermaidSource(partial);
                      }}
                      onComplete={(result: string) => {
                        // When streaming completes, ensure final content is applied
                        diagram.setMermaidSource(result);
                        toast.showToast('Mermaid generation complete — applied to editor', 'success');
                      }}
                    />
                  </div>
                )}
              </div>

              <Card className="flex-1 min-h-0 p-6 bg-muted/30 hover:bg-muted/40 transition-colors flex flex-col overflow-hidden">
                <div className="font-mono text-sm text-muted-foreground mb-4">Mermaid Code Editor - Fullscreen</div>
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <MermaidEditor
                    value={diagram.mermaidSource}
                    theme={theme.effectiveTheme}
                    onChange={(v: string) => {
                      diagram.setMermaidSource(v);
                    }}
                  />
                </div>
              </Card>
            </div>
          )}

          {fullscreen.fullscreenPanel === "preview" && (
            <div className="h-full p-6">
              <Card className="h-full p-6 flex items-center justify-center bg-muted/30 hover:bg-muted/40 transition-colors">
                {diagram.mermaidSource ? (
                  <MermaidRenderer code={diagram.mermaidSource} className="w-full h-full min-h-0" />
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

          {fullscreen.fullscreenPanel === "canvas" && (
            <div className="h-full flex flex-col">
              {/* Fullscreen Canvas */}
              <div className="flex-1 relative overflow-hidden">
                <div
                  className={cn(
                    "w-full h-full bg-background relative transition-all duration-300",
                    true &&
                      "bg-[radial-gradient(circle,_theme(colors.border)_1px,_transparent_1px)] bg-[length:20px_20px]",
                  )}
                  style={{ transform: `scale(${100 / 100})` }}
                >
                  {/* Render the actual FlowDiagram in fullscreen */}
                  <FlowDiagram
                    nodes={diagram.flowData.nodes}
                    edges={diagram.flowData.edges}
                    interactive={!diagram.isStreaming}
                    onNodesChange={handleNodesChange}
                    onEdgesChange={handleEdgesChange}
                    onSelectionChange={() => {}}
                    onRequestPreview={() => {}}
                    onRegisterMethods={registerFlowMethods}
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

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center overflow-hidden">
              <Logo className="h-6 w-6 text-primary-foreground" aria-hidden />
            </div>
            <h1 className="font-semibold text-lg">Mermaid Editor</h1>
          </div>

          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
            <Button
              variant={panel.visiblePanels.code ? "default" : "ghost"}
              size="sm"
              onClick={() => panel.togglePanelVisibility("code")}
              className="h-8 gap-2 hover:scale-105 transition-all duration-200"
            >
              <Code2 className="h-4 w-4" />
              <span className="hidden sm:inline">Code</span>
            </Button>
            <Button
              variant={panel.visiblePanels.preview ? "default" : "ghost"}
              size="sm"
              onClick={() => panel.togglePanelVisibility("preview")}
              className="h-8 gap-2 hover:scale-105 transition-all duration-200"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
            <Button
              variant={panel.visiblePanels.canvas ? "default" : "ghost"}
              size="sm"
              onClick={() => panel.togglePanelVisibility("canvas")}
              className="h-8 gap-2 hover:scale-105 transition-all duration-200"
            >
              <Logo className="h-6 w-6 text-primary-foreground" aria-hidden />
              <span className="hidden sm:inline">Canvas</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={dialog.openLoadDialog}
              className="gap-2 hover:bg-muted/80 transition-colors bg-transparent"
            >
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Load</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDiagram}
              className="gap-2 hover:bg-muted/80 transition-colors bg-transparent"
            >
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">Save</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportToJSON}
              className="gap-2 hover:bg-muted/80 transition-colors bg-transparent"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>

          {/* Theme selector */}
          <Select value={theme.themePref} onValueChange={(v: string) => theme.setThemePref(v as any)}>
            <SelectTrigger size="sm" className="h-8">
              {/* Icon-only trigger (screen-reader label present via aria) */}
              <div className="flex items-center">
                {theme.themePref === 'light' && <Sun className="h-4 w-4" aria-hidden />}
                {theme.themePref === 'dark' && <Moon className="h-4 w-4" aria-hidden />}
                {theme.themePref === 'system' && <Monitor className="h-4 w-4" aria-hidden />}
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" aria-hidden />
                  <span className="text-sm">System</span>
                </div>
              </SelectItem>
              <SelectItem value="light">
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4" aria-hidden />
                  <span className="text-sm">Light</span>
                </div>
              </SelectItem>
              <SelectItem value="dark">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4" aria-hidden />
                  <span className="text-sm">Dark</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={dialog.toggleMobileMenu}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {dialog.isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 right-4 bg-card border rounded-lg shadow-lg z-50 animate-in slide-in-from-top-2 duration-200 min-w-48">
            <div className="p-3 space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  dialog.openLoadDialog();
                  dialog.toggleMobileMenu();
                }}
                className="w-full justify-start gap-2 hover:bg-accent transition-colors"
              >
                <FolderOpen className="h-4 w-4" />
                Load Diagram
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleSaveDiagram();
                  dialog.toggleMobileMenu();
                }}
                className="w-full justify-start gap-2 hover:bg-accent transition-colors"
              >
                <Save className="h-4 w-4" />
                Save Diagram
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleExportToJSON();
                  dialog.toggleMobileMenu();
                }}
                className="w-full justify-start gap-2 hover:bg-accent transition-colors"
              >
                <Download className="h-4 w-4" />
                Export JSON
              </Button>
            </div>
          </div>
        )}
      </header>

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
                <div className="p-2 border-b flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4" />
                    <span className="font-medium text-sm">Code Editor</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={dialog.toggleAiGenerator}
                      className={cn(
                        "h-6 w-6 p-0 hover:scale-105 transition-all duration-200",
                        dialog.showAiGenerator && "bg-primary/20 text-primary",
                      )}
                      title="AI Generate"
                    >
                      <Sparkles className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:scale-105 transition-transform"
                      onClick={() => fullscreen.toggleFullscreen("code")}
                      title="Fullscreen"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:scale-105 transition-transform"
                      onClick={() => panel.togglePanelVisibility("code")}
                      title="Close Panel"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {dialog.showAiGenerator && (
                  <div className="p-3 border-b bg-gradient-to-r dark:from-primary/5 dark:to-primary/10 border-primary/20 animate-in slide-in-from-top-2 duration-300 flex-shrink-0">
                    <GeminiMermaidGenerator
                      onStart={() => diagram.setIsStreaming(true)}
                      onStop={() => diagram.setIsStreaming(false)}
                      apiKey={aiSettings.apiKey}
                      model={aiSettings.model}
                      userInput={aiPrompt}
                      onApiKeyChange={(v: string) => setAiSettings((s: any) => ({ ...s, apiKey: v }))}
                      onModelChange={(v: string) => setAiSettings((s: any) => ({ ...s, model: v }))}
                      onUserInputChange={(v: string) => setAiPrompt(v)}
                      onClose={() => {}}
                      onChunk={(partial: string) => {
                        // update editor progressively so preview/conversion can run as content streams
                        diagram.setMermaidSource(partial);
                      }}
                      onComplete={(result: string) => {
                        // When streaming completes, ensure final content is applied
                        diagram.setMermaidSource(result);
                        toast.showToast('Mermaid generation complete — applied to editor', 'success');
                      }}
                    />
                  </div>
                )}

                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  <MermaidEditor
                    value={diagram.mermaidSource}
                    theme={theme.effectiveTheme}
                    onChange={(v: string) => {
                      diagram.setMermaidSource(v);
                    }}
                  />
                </div>
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
                <div className="p-2 border-b flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <span className="font-medium text-sm">Mermaid Preview</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:scale-105 transition-transform"
                      onClick={() => fullscreen.toggleFullscreen("preview")}
                      title="Fullscreen"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:scale-105 transition-transform"
                      onClick={() => panel.togglePanelVisibility("preview")}
                      title="Close Panel"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 p-4 flex flex-col min-h-0">
                  <Card className="flex-1 min-h-0 p-4 flex items-center justify-center bg-muted/30 hover:bg-muted/40 transition-colors">
                    {diagram.mermaidSource ? (
                      <MermaidRenderer code={diagram.mermaidSource} className="w-full h-full min-h-0" />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <div className="flex items-center justify-center gap-2">
                          <p className="sr-only">Mermaid Preview</p>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Info className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent sideOffset={6} align="center">
                              Live preview will render here once Mermaid code is present.
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              </ResizablePanel>
              {panel.visiblePanels.canvas && <ResizableHandle withHandle />}
            </>
          )}

          {/* Canvas Panel */}
          {panel.visiblePanels.canvas && (
            <ResizablePanel defaultSize={panel.getDefaultPanelSize("canvas")} minSize={30} className="flex flex-col min-h-0">
              {/* Canvas Header (uniform with other panels) */}
              <div className="p-2 border-b flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <Logo className="h-4 w-4 text-foreground" aria-hidden />
                  <span className="font-medium text-sm">React Flow Canvas</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:scale-105 transition-transform"
                    onClick={() => fullscreen.toggleFullscreen("canvas")}
                    title="Fullscreen"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:scale-105 transition-transform"
                    onClick={() => panel.togglePanelVisibility("canvas")}
                    title="Close Panel"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Canvas */}
              <div className="flex-1 relative overflow-hidden">
                <div className="w-full h-full">
                  {diagram.flowData.nodes.length > 0 ? (
                    <FlowDiagram
                      nodes={diagram.flowData.nodes}
                      edges={diagram.flowData.edges}
                      interactive={!diagram.isStreaming}
                      onNodesChange={handleNodesChange}
                      onEdgesChange={handleEdgesChange}
                      onSelectionChange={() => {}}
                      onRequestPreview={() => {}}
                      onRegisterMethods={registerFlowMethods}
                      theme={theme.effectiveTheme}
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
                            accordion.setAccordionOpen((prev: any) => ({ ...prev, editor: true }));
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

      {/* Confirmation dialogs (clear-all still uses modal) */}
      <AlertDialog open={dialog.clearDialogOpen} onOpenChange={dialog.closeClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all content</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to clear the editor and canvas? This will remove all unsaved changes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={dialog.closeClearDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              diagram.setMermaidSource("");
              diagram.setFlowData({ nodes: [], edges: [] });
              accordion.setActiveAccordion("editor");
              dialog.closeClearDialog();
            }}>Clear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}