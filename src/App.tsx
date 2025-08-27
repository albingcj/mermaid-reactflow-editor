import { useState, useEffect, useCallback, useRef } from "react";
import { FlowDiagram } from "./components/FlowDiagram";
import {
  convertMermaidToReactFlow,
  ReactFlowData,
} from "./utils/mermaidToReactFlow";
import { Node, Edge } from "reactflow";
import "./App.css";
import { MermaidRenderer } from "./components/MermaidRenderer";
import { Toasts, ToastItem } from "./components/Toasts";
import MermaidEditor from "./components/MermaidEditor";
import GeminiMermaidGenerator from "./components/GeminiMermaidGenerator";
// Import UI components with relative paths
import { Button } from "./components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "./components/ui/popover";
import { Select, SelectTrigger, SelectContent, SelectItem } from "./components/ui/select";
import { Input } from "./components/ui/input";
import { Card } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./components/ui/sheet";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./components/ui/resizable";
import { cn } from "./lib/utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "./components/ui/alert-dialog";
// Import Lucide icons
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
  GitBranch,
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

function App() {
  const [mermaidSource, setMermaidSource] = useState("");
  const [flowData, setFlowData] = useState<ReactFlowData>({
    nodes: [],
    edges: [],
  });
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  // Saved diagrams (session storage)
  type SavedDiagram = {
    id: string;
    name: string;
    mermaid: string;
    nodes: Node[];
    edges: Edge[];
    createdAt: number;
    updatedAt: number;
  };
  const [savedDiagrams, setSavedDiagrams] = useState<SavedDiagram[]>([]);
  type FlowMode = 'loaded' | 'editor';
  const [flowMode, setFlowMode] = useState<FlowMode>('editor');
  const lastAppliedMermaidRef = useRef<string>("");
  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  // persistence removed: no saved diagrams state
  const [activeAccordion, setActiveAccordion] = useState("editor");

  // UI State
  type AccordionSection = 'editor' | 'palette' | 'saved';
  const [accordionOpen, setAccordionOpen] = useState<Record<AccordionSection, boolean>>({
    editor: true,
    palette: false,
    saved: false,
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showPreviewMain, setShowPreviewMain] = useState(false); // main-area mermaid preview
  const [showFlowMain] = useState(true); // main-area reactflow (kept as default visible)
  const [splitRatio, setSplitRatio] = useState(0.5); // preview/canvas split
  const resizerRef = useRef<HTMLDivElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // New UI states for modern design
  const [selectedTool, setSelectedTool] = useState("select");
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<any | null>(null);
  const [fullscreenPanel, setFullscreenPanel] = useState<"code" | "preview" | "canvas" | null>(null);
  const [visiblePanels, setVisiblePanels] = useState({
    code: true,
    preview: true,
    canvas: true,
  });
  const [showAiGenerator, setShowAiGenerator] = useState(false);
  const [aiSettings, setAiSettings] = useState({
    apiKey: "",
  model: "gemini-2.0-flash",
    isEditingSettings: false,
    provider: "openai",
  });
  const [aiPrompt, setAiPrompt] = useState("");
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
  const [importedDiagram, setImportedDiagram] = useState<SavedDiagram | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Confirmation dialogs state
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  // Inline confirm state for saved-diagram deletion (shows confirm/cancel inline)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismissToast = useCallback((id: string) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  // FlowDiagram exposed methods
  const flowMethodsRef = useRef<{ openSearch?: () => void; exportImage?: () => Promise<void>; selectSubgraphContents?: (id?: string) => void } | null>(null);

  const registerFlowMethods = useCallback((methods: { openSearch?: () => void; exportImage?: () => Promise<void>; selectSubgraphContents?: (id?: string) => void } | {}) => {
    if (!methods || Object.keys(methods).length === 0) {
      flowMethodsRef.current = null;
    } else {
      flowMethodsRef.current = methods as any;
    }
  }, []);

  // Theme: 'system' | 'light' | 'dark'
  const [themePref, setThemePref] = useState<'system' | 'light' | 'dark'>('system');

  // Load theme preference from localStorage and apply
  useEffect(() => {
    try {
      const t = localStorage.getItem('mrfe.theme') as 'system' | 'light' | 'dark' | null;
      if (t === 'light' || t === 'dark' || t === 'system') setThemePref(t);
    } catch (e) {
      // ignore
    }
  }, []);

  // Apply theme to documentElement
  useEffect(() => {
    const root = document.documentElement;

    const applyThemeClass = (isDark: boolean) => {
      root.classList.remove('light', 'dark');
      if (isDark) root.classList.add('dark');
      else root.classList.add('light');
    };

    if (themePref === 'light') {
      applyThemeClass(false);
      try { localStorage.setItem('mrfe.theme', themePref); } catch (e) {}
      return () => root.classList.remove('light', 'dark');
    }

    if (themePref === 'dark') {
      applyThemeClass(true);
      try { localStorage.setItem('mrfe.theme', themePref); } catch (e) {}
      return () => root.classList.remove('light', 'dark');
    }

    // system: follow the OS preference and keep it in sync
    const m = window.matchMedia('(prefers-color-scheme: dark)');
    applyThemeClass(m.matches);
    const listener = (e: MediaQueryListEvent) => applyThemeClass(e.matches);
    if (m.addEventListener) m.addEventListener('change', listener);
    else m.addListener(listener as any);

    try { localStorage.setItem('mrfe.theme', themePref); } catch (e) {}

    return () => {
      if (m.removeEventListener) m.removeEventListener('change', listener);
      else m.removeListener(listener as any);
      root.classList.remove('light', 'dark');
    };
  }, [themePref]);

  // Compute effective theme for components (monaco editor expects 'vs-dark' or 'light')
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => {
    if (themePref === 'light') return 'light';
    if (themePref === 'dark') return 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (themePref === 'light') setEffectiveTheme('light');
    else if (themePref === 'dark') setEffectiveTheme('dark');
    else {
      const m = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => setEffectiveTheme(e.matches ? 'dark' : 'light');
      setEffectiveTheme(m.matches ? 'dark' : 'light');
      if (m.addEventListener) m.addEventListener('change', listener);
      else m.addListener(listener as any);
      return () => {
        if (m.removeEventListener) m.removeEventListener('change', listener);
        else m.removeListener(listener as any);
      };
    }
  }, [themePref]);

  // Re-convert when mermaidSource changes
  useEffect(() => {
    // Only convert when user edits the editor content
    if (flowMode !== 'editor') return;
    const src = mermaidSource?.trim();
    if (!src) return;
    if (lastAppliedMermaidRef.current === mermaidSource) return;

    setLoading(true);
    convertMermaidToReactFlow(mermaidSource)
      .then((data) => {
        setFlowData(data);
        lastAppliedMermaidRef.current = mermaidSource;
        setLoading(false);
      })
      .catch((err) => {
        console.error('Conversion failed', err);
        setLoading(false);
      });
    // conversion completed; preview will render from mermaidSource
  }, [mermaidSource, flowMode]);

  // Load saved diagrams from sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('mrfe.savedDiagrams');
      if (raw) {
        const parsed = JSON.parse(raw) as SavedDiagram[];
        setSavedDiagrams(parsed);
      }
    } catch (e) {
      console.warn('Failed to load saved diagrams from sessionStorage', e);
    }
  }, []);

  const persistSavedDiagrams = (items: SavedDiagram[]) => {
    try {
      sessionStorage.setItem('mrfe.savedDiagrams', JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to persist saved diagrams to sessionStorage', e);
      showToast('Failed to save to session storage', 'error');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (flowData.nodes.length > 0) {
          handleSaveDiagram();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flowData]);

  // Event handlers
  const handleNodesChange = (nodes: Node[]) => {
    setFlowData((prev) => ({ ...prev, nodes }));
  };

  const handleEdgesChange = (edges: Edge[]) => {
    setFlowData((prev) => ({ ...prev, edges }));
  };

  const handleSaveDiagram = () => {
    const src = mermaidSource?.trim();
    const hasNodes = (flowData.nodes || []).length > 0;
    if (!src || src === '' || !hasNodes) {
      showToast('Cannot save: please provide Mermaid code and at least one node', 'info');
      return;
    }

    const id = Math.random().toString(36).slice(2);
    const now = Date.now();
    const defaultName = new Date(now).toLocaleString();
    const item: SavedDiagram = {
      id,
      name: defaultName,
      mermaid: mermaidSource,
      nodes: flowData.nodes || [],
      edges: flowData.edges || [],
      createdAt: now,
      updatedAt: now,
    };
    const next = [item, ...savedDiagrams];
    setSavedDiagrams(next);
    persistSavedDiagrams(next);
    // Record last applied mermaid so future no-op edits don't reconvert immediately
    lastAppliedMermaidRef.current = mermaidSource;
    showToast('Diagram saved to session', 'success');
    // show saved list
    setAccordionOpen((prev) => ({ ...prev, saved: true }));
    setSidebarCollapsed(false);
  };

  const loadSavedDiagram = (id: string) => {
    const item = savedDiagrams.find((d) => d.id === id);
    if (!item) {
      showToast('Saved diagram not found', 'error');
      return;
    }
    // Switch to loaded mode and set last applied to prevent reconversion
    setFlowMode('loaded');
    lastAppliedMermaidRef.current = item.mermaid;
    setFlowData({ nodes: item.nodes || [], edges: item.edges || [] });
    setMermaidSource(item.mermaid);
    setActiveAccordion('editor');
    setSidebarCollapsed(true);
    showToast(`Loaded "${item.name}"`, 'success');
    setShowLoadDialog(false);
  };

  const deleteSavedDiagram = (id: string) => {
  // show inline confirm buttons next to the clicked item
  setConfirmDeleteId(id);
  };

  const confirmDeleteSavedDiagram = () => {
  const idToDelete = deleteDialogId || confirmDeleteId;
  if (!idToDelete) return;
  if (idToDelete === 'imported' && importedDiagram) {
    // clear imported diagram only
    setImportedDiagram(null);
    showToast('Removed imported diagram', 'info');
  } else {
    const next = savedDiagrams.filter((d) => d.id !== idToDelete);
    setSavedDiagrams(next);
    persistSavedDiagrams(next);
    showToast('Deleted saved diagram', 'info');
  }
  setDeleteDialogId(null);
  setConfirmDeleteId(null);
  };

  const toggleAccordion = (section: AccordionSection) => {
    setAccordionOpen((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
    setActiveAccordion(section);
  };

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToasts((ts) => [
      ...ts,
      { id: Math.random().toString(36).slice(2), message, type, duration: 2400 },
    ]);
  };

  const clearAll = () => {
    // open confirmation dialog for clearing all content
    setClearDialogOpen(true);
  };

  const confirmClearAll = () => {
    setMermaidSource("");
    setFlowData({ nodes: [], edges: [] });
    setActiveAccordion("editor");
    setClearDialogOpen(false);
  };

  const handleGenerate = useCallback(() => {
    if (!aiSettings.apiKey) {
      setAiSettings((prev) => ({ ...prev, isEditingSettings: true }));
      return;
    }
    if (!aiPrompt.trim()) return;

    setIsStreaming(true);
    // Simulate API call
    setTimeout(() => {
      setIsStreaming(false);
      setAiPrompt("");
    }, 2000);
  }, [aiSettings.apiKey, aiPrompt]);

  const toggleFullscreen = (panel: "code" | "preview" | "canvas") => {
    setFullscreenPanel(fullscreenPanel === panel ? null : panel);
  };

  const togglePanelVisibility = (panel: "code" | "preview" | "canvas") => {
    setVisiblePanels((prev) => ({
      ...prev,
      [panel]: !prev[panel],
    }));
  };

  const visiblePanelCount = Object.values(visiblePanels).filter(Boolean).length;

  // Helper to compute default panel size so totals sum to 100%.
  // When there are 3 panels Math.floor(100/3) -> 33 each (sum 99) which
  // triggers the resizable layout warning. Give the canvas panel the
  // remaining 1% when there are 3 panels so sizes become 33,33,34.
  const getDefaultPanelSize = (panel: "code" | "preview" | "canvas") => {
    const base = Math.floor(100 / visiblePanelCount);
    if (visiblePanelCount === 3) {
      // prefer canvas to be slightly larger to avoid a 99% total
      return panel === "canvas" ? base + 1 : base;
    }
    return base;
  };

  const handleNodeClick = useCallback(
    (nodeId: string, isMultiSelect = false) => {
      if (isMultiSelect) {
        setSelectedNodes((prev) => (prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]))
      } else {
        setSelectedNodes([nodeId])
        const node = flowData.nodes.find((n) => n.id === nodeId)
        if (node) {
          setEditingNode(node)
          setIsPropertiesOpen(true)
        }
      }
    },
    [flowData.nodes],
  );

  const updateNode = useCallback(
    (nodeId: string, updates: Partial<any>) => {
      setFlowData((prev) => ({
        ...prev,
        nodes: prev.nodes.map((node) => (node.id === nodeId ? { ...node, ...updates } : node))
      }));
      if (editingNode?.id === nodeId) {
        setEditingNode((prev: any) => (prev ? { ...prev, ...updates } : null))
      }
    },
    [editingNode],
  );

  const handleAlignment = useCallback(
    (type: string) => {
      if (selectedNodes.length < 2) return;

      const selectedNodeObjects = flowData.nodes.filter((node) => selectedNodes.includes(node.id));

      switch (type) {
        case "align-left":
          const minX = Math.min(...selectedNodeObjects.map((n: any) => n.position.x));
          selectedNodeObjects.forEach((node) => updateNode(node.id, { position: { ...node.position, x: minX } }));
          break;
        case "align-center":
          const avgX = selectedNodeObjects.reduce((sum, n: any) => sum + n.position.x, 0) / selectedNodeObjects.length;
          selectedNodeObjects.forEach((node) => updateNode(node.id, { position: { ...node.position, x: avgX } }));
          break;
        case "align-right":
          const maxX = Math.max(...selectedNodeObjects.map((n: any) => n.position.x));
          selectedNodeObjects.forEach((node) => updateNode(node.id, { position: { ...node.position, x: maxX } }));
          break;
        case "align-top":
          const minY = Math.min(...selectedNodeObjects.map((n: any) => n.position.y));
          selectedNodeObjects.forEach((node) => updateNode(node.id, { position: { ...node.position, y: minY } }));
          break;
        case "align-bottom":
          const maxY = Math.max(...selectedNodeObjects.map((n: any) => n.position.y));
          selectedNodeObjects.forEach((node) => updateNode(node.id, { position: { ...node.position, y: maxY } }));
          break;
        case "distribute-horizontal":
          const sortedByX = [...selectedNodeObjects].sort((a: any, b: any) => a.position.x - b.position.x);
          const totalWidth = sortedByX[sortedByX.length - 1].position.x - sortedByX[0].position.x;
          const spacing = totalWidth / (sortedByX.length - 1);
          sortedByX.forEach((node, index) => {
            if (index > 0 && index < sortedByX.length - 1) {
              updateNode(node.id, { position: { ...node.position, x: sortedByX[0].position.x + spacing * index } });
            }
          });
          break;
        case "distribute-vertical":
          const sortedByY = [...selectedNodeObjects].sort((a: any, b: any) => a.position.y - b.position.y);
          const totalHeight = sortedByY[sortedByY.length - 1].position.y - sortedByY[0].position.y;
          const vSpacing = totalHeight / (sortedByY.length - 1);
          sortedByY.forEach((node, index) => {
            if (index > 0 && index < sortedByY.length - 1) {
              updateNode(node.id, { position: { ...node.position, y: sortedByY[0].position.y + vSpacing * index } });
            }
          });
          break;
      }
    },
    [selectedNodes, flowData.nodes, updateNode],
  );

  const handleDuplicate = useCallback(() => {
    const newNodes = selectedNodes
      .map((nodeId) => {
        const node = flowData.nodes.find((n) => n.id === nodeId);
        if (!node) return null;
        return {
          ...node,
          id: `${node.id}-copy-${Date.now()}`,
          position: { x: node.position.x + 20, y: node.position.y + 20 },
        };
      })
      .filter(Boolean) as Node[];

    setFlowData((prev) => ({
      ...prev,
      nodes: [...prev.nodes, ...newNodes]
    }));
  }, [selectedNodes, flowData.nodes]);

  const handleDelete = useCallback(() => {
    setFlowData((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((node) => !selectedNodes.includes(node.id))
    }));
    setSelectedNodes([]);
    setIsPropertiesOpen(false);
    setEditingNode(null);
  }, [selectedNodes]);

  const loadDiagram = () => {
  // open load dialog and preselect first item
  setSavedDiagrams(savedDiagrams);
  setSelectedPreviewId(savedDiagrams.length > 0 ? savedDiagrams[0].id : null);
  setShowLoadDialog(true);
  };

  const saveDiagram = () => {
    handleSaveDiagram();
  };

  const exportToPNG = async () => {
    if (flowMethodsRef.current?.exportImage) {
      try {
        await flowMethodsRef.current.exportImage();
        showToast('Image exported', 'success');
      } catch (e) {
        showToast('Failed to export image', 'error');
      }
    } else {
      showToast('Export not available', 'info');
    }
  };

  const exportToJSON = () => {
    // export current mermaid + nodes/edges as single JSON file
    const now = Date.now();
    const payload: SavedDiagram = {
      id: `export-${now}`,
      name: `diagram-${new Date(now).toISOString()}`,
      mermaid: mermaidSource,
      nodes: flowData.nodes || [],
      edges: flowData.edges || [],
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
    showToast('Exported diagram JSON', 'success');
  };

  const handleUploadFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const txt = String(e.target?.result || '');
        const parsed = JSON.parse(txt);
        // Accept either a single diagram object or an array
        if (Array.isArray(parsed)) {
          // Merge into savedDiagrams (prepend)
          const items = parsed.filter((p) => p && p.mermaid && Array.isArray(p.nodes));
          if (items.length === 0) throw new Error('No valid diagrams found in file');
          const casted = items as SavedDiagram[];
          const next = [...casted, ...savedDiagrams];
          setSavedDiagrams(next);
          persistSavedDiagrams(next);
          showToast('Imported diagrams into saved list', 'success');
        } else if (parsed && parsed.mermaid !== undefined && Array.isArray(parsed.nodes)) {
          const imported: SavedDiagram = {
            id: 'imported',
            name: parsed.name || 'Imported diagram',
            mermaid: parsed.mermaid,
            nodes: parsed.nodes,
            edges: parsed.edges || [],
            createdAt: parsed.createdAt || Date.now(),
            updatedAt: parsed.updatedAt || Date.now(),
          };
          setImportedDiagram(imported);
          setSelectedPreviewId('imported');
          showToast('Imported diagram ready to preview', 'success');
        } else {
          throw new Error('Invalid diagram JSON');
        }
      } catch (err: any) {
        showToast(`Import failed: ${err?.message || String(err)}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    handleUploadFile(f ?? null);
    // reset input so same file can be re-uploaded if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const loadImportedDiagram = () => {
    if (!importedDiagram) {
      showToast('No imported diagram to load', 'info');
      return;
    }
    // apply to main view
    setFlowMode('loaded');
    lastAppliedMermaidRef.current = importedDiagram.mermaid;
    setFlowData({ nodes: importedDiagram.nodes || [], edges: importedDiagram.edges || [] });
    setMermaidSource(importedDiagram.mermaid);
    setActiveAccordion('editor');
    setSidebarCollapsed(true);
    showToast(`Loaded "${importedDiagram.name}"`, 'success');
    setShowLoadDialog(false);
    // clear imported after load
    setImportedDiagram(null);
  };

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

  if (fullscreenPanel) {
    return (
      <div className="h-screen bg-background flex flex-col min-h-0 overflow-hidden">
        {/* Fullscreen Header */}
        <header className="border-b bg-card px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-foreground">
              {fullscreenPanel === "code" && "Code Editor"}
              {fullscreenPanel === "preview" && "Mermaid Preview"}
              {fullscreenPanel === "canvas" && "React Flow Canvas"}
            </h1>
            <Badge variant="secondary" className="text-xs">
              Fullscreen
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFullscreenPanel(null)}
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
                  onClick={() => setShowAiGenerator(!showAiGenerator)}
                  className="gap-2 mb-3 hover:bg-primary/10 transition-all duration-200"
                >
                  <Sparkles className="h-4 w-4" />
                  AI Generate
                  {showAiGenerator ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>

                {showAiGenerator && (
                  <div className="p-3 border-b bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 animate-in slide-in-from-top-2 duration-300 flex-shrink-0">
                    <GeminiMermaidGenerator
                      onStart={() => setIsStreaming(true)}
                      onStop={() => setIsStreaming(false)}
                      apiKey={aiSettings.apiKey}
                      model={aiSettings.model}
                      userInput={aiPrompt}
                      onApiKeyChange={(v: string) => setAiSettings(s => ({ ...s, apiKey: v }))}
                      onModelChange={(v: string) => setAiSettings(s => ({ ...s, model: v }))}
                      onUserInputChange={(v: string) => setAiPrompt(v)}
                      onClose={() => {
                        setAiSettings(s => ({ ...s, apiKey: "", model: "" }));
                        setAiPrompt("");
                      }}
                      onChunk={(partial: string) => {
                        // update editor progressively so preview/conversion can run as content streams
                        setFlowMode('editor');
                        setMermaidSource(partial);
                      }}
                      onComplete={(result: string) => {
                        // When streaming completes, ensure final content is applied
                        setMermaidSource(result);
                        setFlowMode('editor');
                        showToast('Mermaid generation complete — applied to editor', 'success');
                      }}
                    />
                  </div>
                )}
              </div>

              <Card className="flex-1 min-h-0 p-6 bg-muted/30 hover:bg-muted/40 transition-colors flex flex-col overflow-hidden">
                <div className="font-mono text-sm text-muted-foreground mb-4">Mermaid Code Editor - Fullscreen</div>
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <MermaidEditor
                    value={mermaidSource}
                    theme={effectiveTheme}
                    onChange={(v) => {
                      setFlowMode('editor');
                      setMermaidSource(v);
                    }}
                  />
                </div>
              </Card>
            </div>
          )}

          {fullscreenPanel === "preview" && (
            <div className="h-full p-6">
              <Card className="h-full p-6 flex items-center justify-center bg-muted/30 hover:bg-muted/40 transition-colors">
                {mermaidSource ? (
                  <MermaidRenderer code={mermaidSource} className="w-full h-full min-h-0" />
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
              {/* Canvas Toolbar */}
              <div className="border-b bg-card px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 mr-4">
                    {tools.map((tool) => (
                      <Button
                        key={tool.id}
                        variant={selectedTool === tool.id ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setSelectedTool(tool.id)}
                        className="h-8 w-8 p-0 hover:scale-105 transition-transform"
                        title={tool.label}
                      >
                        <tool.icon className="h-4 w-4" />
                      </Button>
                    ))}
                  </div>
                  <Separator orientation="vertical" className="h-6" />
                  <div className="flex items-center gap-1 mr-4">
                    {alignmentTools.map((tool) => (
                      <Button
                        key={tool.id}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:scale-105 transition-transform disabled:hover:scale-100"
                        title={tool.label}
                        disabled={selectedNodes.length === 0}
                      >
                        <tool.icon className="h-4 w-4" />
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1" />
                </div>
              </div>

              {/* Fullscreen Canvas */}
              <div className="flex-1 relative overflow-hidden">
                <div
                  className={cn(
                    "w-full h-full bg-background relative transition-all duration-300",
                    isGridVisible &&
                      "bg-[radial-gradient(circle,_theme(colors.border)_1px,_transparent_1px)] bg-[length:20px_20px]",
                  )}
                  style={{ transform: `scale(${zoomLevel / 100})` }}
                >
                  {/* Render the actual FlowDiagram in fullscreen */}
                  <FlowDiagram
                    nodes={flowData.nodes}
                    edges={flowData.edges}
                    interactive={!isStreaming}
                    onNodesChange={handleNodesChange}
                    onEdgesChange={handleEdgesChange}
                    onSelectionChange={(selectedNodesObjs, selectedEdgesObjs) => {
                      // store selected node ids in App state
                      setSelectedNodes(selectedNodesObjs.map(n => n.id));
                    }}
                    onRequestPreview={() => setShowPreviewMain((s) => !s)}
                    onRegisterMethods={registerFlowMethods}
                    theme={effectiveTheme}
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
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <GitBranch className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="font-semibold text-lg">Mermaid Editor</h1>
          </div>

          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
            <Button
              variant={visiblePanels.code ? "default" : "ghost"}
              size="sm"
              onClick={() => togglePanelVisibility("code")}
              className="h-8 gap-2 hover:scale-105 transition-all duration-200"
            >
              <Code2 className="h-4 w-4" />
              <span className="hidden sm:inline">Code</span>
            </Button>
            <Button
              variant={visiblePanels.preview ? "default" : "ghost"}
              size="sm"
              onClick={() => togglePanelVisibility("preview")}
              className="h-8 gap-2 hover:scale-105 transition-all duration-200"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
            <Button
              variant={visiblePanels.canvas ? "default" : "ghost"}
              size="sm"
              onClick={() => togglePanelVisibility("canvas")}
              className="h-8 gap-2 hover:scale-105 transition-all duration-200"
            >
              <GitBranch className="h-4 w-4" />
              <span className="hidden sm:inline">Canvas</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadDiagram}
              className="gap-2 hover:bg-muted/80 transition-colors bg-transparent"
            >
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Load</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={saveDiagram}
              className="gap-2 hover:bg-muted/80 transition-colors bg-transparent"
            >
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">Save</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportToJSON}
              className="gap-2 hover:bg-muted/80 transition-colors bg-transparent"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>

          {/* Theme selector */}
          <Select value={themePref} onValueChange={(v) => setThemePref(v as any)}>
            <SelectTrigger size="sm" className="h-8">
              {/* Icon-only trigger (screen-reader label present via aria) */}
              <div className="flex items-center">
                {themePref === 'light' && <Sun className="h-4 w-4" aria-hidden />}
                {themePref === 'dark' && <Moon className="h-4 w-4" aria-hidden />}
                {themePref === 'system' && <Monitor className="h-4 w-4" aria-hidden />}
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
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 right-4 bg-card border rounded-lg shadow-lg z-50 animate-in slide-in-from-top-2 duration-200 min-w-48">
            <div className="p-3 space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  loadDiagram();
                  setIsMobileMenuOpen(false);
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
                  saveDiagram();
                  setIsMobileMenuOpen(false);
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
                  exportToPNG();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full justify-start gap-2 hover:bg-accent transition-colors"
              >
                <Download className="h-4 w-4" />
                Export PNG
              </Button>
            </div>
          </div>
        )}
      </header>

      

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Code Editor Panel */}
          {visiblePanels.code && (
            <>
              <ResizablePanel
                defaultSize={getDefaultPanelSize("code")}
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
                      onClick={() => setShowAiGenerator(!showAiGenerator)}
                      className={cn(
                        "h-6 w-6 p-0 hover:scale-105 transition-all duration-200",
                        showAiGenerator && "bg-primary/20 text-primary",
                      )}
                      title="AI Generate"
                    >
                      <Sparkles className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:scale-105 transition-transform"
                      onClick={() => toggleFullscreen("code")}
                      title="Fullscreen"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:scale-105 transition-transform"
                      onClick={() => togglePanelVisibility("code")}
                      title="Close Panel"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {showAiGenerator && (
                  <div className="p-3 border-b bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 animate-in slide-in-from-top-2 duration-300 flex-shrink-0">
                    <GeminiMermaidGenerator
                      onStart={() => setIsStreaming(true)}
                      onStop={() => setIsStreaming(false)}
                      apiKey={aiSettings.apiKey}
                      model={aiSettings.model}
                      userInput={aiPrompt}
                      onApiKeyChange={(v: string) => setAiSettings(s => ({ ...s, apiKey: v }))}
                      onModelChange={(v: string) => setAiSettings(s => ({ ...s, model: v }))}
                      onUserInputChange={(v: string) => setAiPrompt(v)}
                      onClose={() => {
                        setAiSettings(s => ({ ...s, apiKey: "", model: "" }));
                        setAiPrompt("");
                      }}
                      onChunk={(partial: string) => {
                        // update editor progressively so preview/conversion can run as content streams
                        setFlowMode('editor');
                        setMermaidSource(partial);
                      }}
                      onComplete={(result: string) => {
                        // When streaming completes, ensure final content is applied
                        setMermaidSource(result);
                        setFlowMode('editor');
                        showToast('Mermaid generation complete — applied to editor', 'success');
                      }}
                    />
                  </div>
                )}

                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  <MermaidEditor
                    value={mermaidSource}
                    theme={effectiveTheme}
                    onChange={(v) => {
                      setFlowMode('editor');
                      setMermaidSource(v);
                    }}
                  />
                </div>
              </ResizablePanel>
              {(visiblePanels.preview || visiblePanels.canvas) && <ResizableHandle withHandle />}
            </>
          )}

          {/* Preview Panel */}
          {visiblePanels.preview && (
            <>
              <ResizablePanel
                defaultSize={getDefaultPanelSize("preview")}
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
                      onClick={() => toggleFullscreen("preview")}
                      title="Fullscreen"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:scale-105 transition-transform"
                      onClick={() => togglePanelVisibility("preview")}
                      title="Close Panel"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 p-4 flex flex-col min-h-0">
                  <Card className="flex-1 min-h-0 p-4 flex items-center justify-center bg-muted/30 hover:bg-muted/40 transition-colors">
                    {mermaidSource ? (
                      <MermaidRenderer code={mermaidSource} className="w-full h-full min-h-0" />
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
              {visiblePanels.canvas && <ResizableHandle withHandle />}
            </>
          )}

          {/* Canvas Panel */}
          {visiblePanels.canvas && (
            <ResizablePanel defaultSize={getDefaultPanelSize("canvas")} minSize={30} className="flex flex-col min-h-0">
              {/* Canvas Header (uniform with other panels) */}
              <div className="p-2 border-b flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  <span className="font-medium text-sm">React Flow Canvas</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:scale-105 transition-transform"
                    onClick={() => toggleFullscreen("canvas")}
                    title="Fullscreen"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:scale-105 transition-transform"
                    onClick={() => togglePanelVisibility("canvas")}
                    title="Close Panel"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Canvas */}
              <div className="flex-1 relative overflow-hidden">
                <div className="w-full h-full">
                  {flowData.nodes.length > 0 ? (
                    <FlowDiagram
                      nodes={flowData.nodes}
                      edges={flowData.edges}
                      interactive={!isStreaming}
                      onNodesChange={handleNodesChange}
                      onEdgesChange={handleEdgesChange}
                      onSelectionChange={(selectedNodesObjs, selectedEdgesObjs) => {
                        setSelectedNodes(selectedNodesObjs.map(n => n.id));
                      }}
                      onRequestPreview={() => setShowPreviewMain((s) => !s)}
                      onRegisterMethods={registerFlowMethods}
                      theme={effectiveTheme}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-center">
                      <div>
                        <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <h4 className="text-lg font-normal text-muted-foreground mb-2">
                          No diagram to display
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Create a diagram in the editor or load a saved one
                        </p>
                        <Button
                          onClick={() => {
                            setSidebarCollapsed(false);
                            setActiveAccordion("editor");
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

        {/* Load Dialog */}
        {showLoadDialog && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onMouseDown={(e) => {
              // close when clicking on the backdrop (but not when clicking inside the modal)
              if (e.currentTarget === e.target) setShowLoadDialog(false);
            }}
          >
                <div className="bg-card rounded-lg shadow-inner dark:ring-1 dark:ring-primary/40 max-w-4xl w-full max-h-[80vh] min-h-[480px] overflow-hidden flex flex-col">
                  {/* Modal Header - common fixed header for both columns */}
                  <div className="flex items-center justify-between p-4 border-b bg-muted/5">
                    <div className="flex items-center gap-3">
                      <FolderOpen className="h-5 w-5" />
                      <h3 className="font-semibold text-lg">Saved Diagrams</h3>
                    </div>
                        <div className="flex items-center gap-2">
                          <input ref={fileInputRef} type="file" accept="application/json" onChange={onFileInputChange} className="hidden" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Upload JSON
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowLoadDialog(false)}
                            className="whitespace-nowrap"
                          >
                            Close
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              if (selectedPreviewId === 'imported') loadImportedDiagram();
                              else if (selectedPreviewId) loadSavedDiagram(selectedPreviewId);
                            }}
                            disabled={!selectedPreviewId}
                            className="whitespace-nowrap"
                          >
                            Load
                          </Button>
                        </div>
                  </div>

                  {/* Modal Body: left list and right preview. Only body scrolls. */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* Left: list */}
                    <div className="w-1/2 border-r p-4 overflow-y-auto custom-scrollbar">
                        {/* Include importedDiagram at the top of the list when present */}
                        {(importedDiagram ? [importedDiagram, ...savedDiagrams] : savedDiagrams).length === 0 ? (
                          <div className="text-center p-4 text-muted-foreground">
                            <p>No saved diagrams found</p>
                          </div>
                        ) : (
                          (importedDiagram ? [importedDiagram, ...savedDiagrams] : savedDiagrams).map((diagram) => (
                            <div
                              key={diagram.id}
                              className={cn(
                                "p-3 border rounded-lg cursor-pointer transition-colors mb-2 flex items-center justify-between",
                                selectedPreviewId === diagram.id ? "bg-accent/30 border-primary" : "hover:bg-accent"
                              )}
                              onClick={() => setSelectedPreviewId(diagram.id)}
                            >
                              <div>
                                <h4 className="font-medium text-sm">{diagram.name}</h4>
                                <p className="text-xs text-muted-foreground">{new Date(diagram.createdAt || Date.now()).toLocaleDateString()}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {confirmDeleteId === diagram.id ? (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        confirmDeleteSavedDiagram();
                                        if (selectedPreviewId === diagram.id) setSelectedPreviewId(null);
                                      }}
                                    >
                                      Delete
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDeleteId(null);
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="p-0"
                                      title="Delete saved diagram"
                                      onClick={(e) => { e.stopPropagation(); deleteSavedDiagram(diagram.id); }}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  </>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                    </div>

                    {/* Right: preview */}
                    <div className="w-1/2 p-4 flex flex-col overflow-y-auto custom-scrollbar">
                      <div className="flex-1 border rounded p-3 bg-muted/10 overflow-auto">
                        {selectedPreviewId ? (
                          (() => {
                            let item = null as SavedDiagram | null;
                            if (selectedPreviewId === 'imported' && importedDiagram) item = importedDiagram;
                            if (!item) item = savedDiagrams.find((d) => d.id === selectedPreviewId) ?? null;
                            return item ? (
                              <MermaidRenderer code={item.mermaid} className="w-full h-full min-h-[300px]" />
                            ) : (
                              <div className="text-center text-muted-foreground">Preview not found</div>
                            );
                          })()
                        ) : (
                          <div className="text-center text-muted-foreground">Select a saved diagram to preview</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
          </div>
        )}

        {/* Properties Panel */}
        <Sheet open={isPropertiesOpen} onOpenChange={setIsPropertiesOpen}>
          <SheetContent className="w-80">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {selectedNodes.length === 1 ? "Node Properties" : `${selectedNodes.length} Nodes Selected`}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-6 px-1">
              {selectedNodes.length === 1 && editingNode && (
                <>
                  {/* Single Node Properties */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-foreground">
                        <Type className="h-4 w-4" />
                        Content
                      </h4>
                      <div className="space-y-4 pl-1">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-2 block">Node Label</label>
                          <Input
                            value={editingNode.label || ''}
                            onChange={(e) => updateNode(editingNode.id, { label: e.target.value })}
                            className="hover:border-primary/50 focus:border-primary transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-foreground">
                        <Palette className="h-4 w-4" />
                        Appearance
                      </h4>
                      <div className="space-y-4 pl-1">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-2 block">
                            Background Color
                          </label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={editingNode.data?.color || "#3b82f6"}
                              onChange={(e) => updateNode(editingNode.id, { 
                                data: { ...editingNode.data, color: e.target.value } 
                              })}
                              className="w-12 h-8 p-1 rounded cursor-pointer"
                            />
                            <Input
                              value={editingNode.data?.color || "#3b82f6"}
                              onChange={(e) => updateNode(editingNode.id, { 
                                data: { ...editingNode.data, color: e.target.value } 
                              })}
                              placeholder="#3b82f6"
                              className="flex-1 hover:border-primary/50 focus:border-primary transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-foreground">
                        <Layers className="h-4 w-4" />
                        Actions
                      </h4>
                      <div className="space-y-3 pl-1">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 hover:bg-accent transition-colors bg-transparent"
                            onClick={() => {
                              /* Bring to front */
                            }}
                          >
                            <MoveUp className="h-4 w-4 mr-1" />
                            Front
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 hover:bg-accent transition-colors bg-transparent"
                            onClick={() => {
                              /* Send to back */
                            }}
                          >
                            <MoveDown className="h-4 w-4 mr-1" />
                            Back
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full hover:bg-accent transition-colors bg-transparent"
                          onClick={handleDuplicate}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Clone Node
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full hover:bg-destructive hover:text-destructive-foreground transition-colors bg-transparent"
                          onClick={handleDelete}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Node
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {selectedNodes.length > 1 && (
                <>
                  {/* Multiple Nodes Selected */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-foreground">
                        <AlignCenter className="h-4 w-4" />
                        Alignment
                      </h4>
                      <div className="grid grid-cols-3 gap-2 pl-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-accent transition-colors bg-transparent"
                          onClick={() => handleAlignment("align-left")}
                        >
                          <AlignLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-accent transition-colors bg-transparent"
                          onClick={() => handleAlignment("align-center")}
                        >
                          <AlignCenter className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-accent transition-colors bg-transparent"
                          onClick={() => handleAlignment("align-right")}
                        >
                          <AlignRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-foreground">
                        <AlignVerticalJustifyCenter className="h-4 w-4" />
                        Vertical Alignment
                      </h4>
                      <div className="grid grid-cols-3 gap-2 pl-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-accent transition-colors bg-transparent"
                          onClick={() => handleAlignment("align-top")}
                        >
                          <AlignVerticalJustifyStart className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-accent transition-colors bg-transparent"
                          onClick={() => handleAlignment("align-middle")}
                        >
                          <AlignVerticalJustifyCenter className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-accent transition-colors bg-transparent"
                          onClick={() => handleAlignment("align-bottom")}
                        >
                          <AlignVerticalJustifyEnd className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                        Distribution
                      </h4>
                      <div className="space-y-2 pl-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full hover:bg-accent transition-colors bg-transparent"
                          onClick={() => handleAlignment("distribute-horizontal")}
                        >
                          <MoreHorizontal className="h-4 w-4 mr-2" />
                          Distribute Horizontally
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full hover:bg-accent transition-colors bg-transparent"
                          onClick={() => handleAlignment("distribute-vertical")}
                        >
                          <MoreHorizontal className="h-4 w-4 mr-2" />
                          Distribute Vertically
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-foreground">
                        <Copy className="h-4 w-4" />
                        Actions
                      </h4>
                      <div className="space-y-2 pl-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full hover:bg-accent transition-colors bg-transparent"
                          onClick={handleDuplicate}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate Selection
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full hover:bg-destructive hover:text-destructive-foreground transition-colors bg-transparent"
                          onClick={handleDelete}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Selection
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Toasts */}
  {/* Confirmation dialogs (clear-all still uses modal) */}

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all content</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to clear the editor and canvas? This will remove all unsaved changes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClearDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearAll}>Clear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
