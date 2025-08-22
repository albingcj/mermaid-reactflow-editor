import { useState, useEffect, useCallback, useRef } from "react";
import { FlowDiagram } from "./components/FlowDiagram";
import {
  convertMermaidToReactFlow,
  ReactFlowData,
} from "./utils/mermaidToReactFlow";
// storage of diagrams removed — no local persistence
import { Node, Edge } from "reactflow";
import "./App.css";
import { MermaidRenderer } from "./components/MermaidRenderer";
import { Toasts, ToastItem } from "./components/Toasts";
import MermaidEditor from "./components/MermaidEditor";

function App() {
  const [mermaidSource, setMermaidSource] = useState("");
  const [flowData, setFlowData] = useState<ReactFlowData>({
    nodes: [],
    edges: [],
  });
  const [loading, setLoading] = useState(false);
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

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismissToast = useCallback((id: string) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  // FlowDiagram exposed methods
  const flowMethodsRef = useRef<{ openSearch?: () => void; exportImage?: () => Promise<void> } | null>(null);

  const registerFlowMethods = useCallback((methods: { openSearch?: () => void; exportImage?: () => Promise<void> } | {}) => {
    if (!methods || Object.keys(methods).length === 0) {
      flowMethodsRef.current = null;
    } else {
      flowMethodsRef.current = methods as any;
    }
  }, []);

  // Re-convert when mermaidSource changes
  useEffect(() => {
    if (mermaidSource && mermaidSource.trim() !== "") {
      setLoading(true);
      convertMermaidToReactFlow(mermaidSource)
        .then((data) => {
          setFlowData(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Conversion failed', err);
          setLoading(false);
        });
    // conversion completed; preview will render from mermaidSource
    }
  }, [mermaidSource]);

  // persistence removed: no saved diagrams to load on mount

  // Editor-driven: mermaidSource drives conversion and preview.

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (flowData.nodes.length > 0) {
          handleSaveDiagram();
        }
      }
      // Escape handling removed
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
    // persistence was removed per request — saving is disabled
    showToast('Save/export disabled: persistence removed', 'info');
  };

  // export handled via top-nav / FlowDiagram export image; remove local sidebar action

  // persistence handlers removed

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
    if (confirm("Are you sure you want to clear all content?")) {
      setMermaidSource("");
      setFlowData({ nodes: [], edges: [] });
      setActiveAccordion("editor");
    }
  };

  return (
    <div
      className="vh-100 d-flex"
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <Toasts toasts={toasts} onDismiss={dismissToast} />
      {/* Left Sidebar */}
      <div
        className={`bg-light border-end transition-all ${
          sidebarCollapsed ? "collapsed-sidebar" : "expanded-sidebar"
        }`}
        style={{
          width: sidebarCollapsed ? "0px" : "340px",
          transition: "width 0.3s ease",
          overflow: "hidden",
          minHeight: "100vh",
        }}
      >
        <div className="h-100 overflow-auto" style={{ width: "340px" }}>
          {/* Sidebar Header */}
          <div className="bg-white border-bottom px-3 py-2 position-sticky top-0 z-2">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h6 className="mb-0 fw-semibold text-dark fs-6">
                  <i className="bi bi-diagram-3 me-2 text-primary"></i>
                  Diagram Tools
                </h6>
              </div>
              <button
                className="btn btn-sm btn-outline-secondary p-1"
                onClick={() => setSidebarCollapsed(true)}
                style={{ width: "28px", height: "28px" }}
              >
                <i className="bi bi-x fs-6"></i>
              </button>
            </div>
          </div>

          <div className="p-0">
            {/* Editor Section (Top priority) */}
            <div className="border-bottom">
              <button
                className={`w-100 btn btn-link text-start px-3 py-2 fw-normal border-0 ${
                  activeAccordion === "editor" ? "text-primary bg-primary bg-opacity-10" : "text-dark"
                }`}
                onClick={() => toggleAccordion("editor")}
                style={{ borderRadius: 0 }}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-code me-2"></i>
                    <span className="fs-7">Editor</span>
                  </div>
                  <i className={`bi bi-chevron-${accordionOpen.editor ? "up" : "down"} fs-7`}></i>
                </div>
              </button>

              <div className={`collapse ${accordionOpen.editor ? "show" : ""}`}>
                <MermaidEditor value={mermaidSource} onChange={(v) => setMermaidSource(v)} />
              </div>
            </div>
            {/* Node Palette Section */}
            <div className="border-bottom">
              <button
                className={`w-100 btn btn-link text-start px-3 py-2 fw-normal border-0 ${
                  activeAccordion === "palette"
                    ? "text-primary bg-primary bg-opacity-10"
                    : "text-dark"
                }`}
                onClick={() => toggleAccordion("palette")}
                style={{ borderRadius: 0 }}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-box-arrow-in-down me-2"></i>
                    <span className="fs-7">Node Palette</span>
                  </div>
                  <i
                    className={`bi bi-chevron-${
                      accordionOpen.palette ? "up" : "down"
                    } fs-7`}
                  ></i>
                </div>
              </button>
              <div className={`collapse ${accordionOpen.palette ? "show" : ""}`}>
                <div className="px-3 py-2 bg-white">
                  <div className="d-flex flex-column gap-2">
                    <div
                      className="card card-body p-2 d-flex flex-row align-items-center gap-2 draggable-palette-item"
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('application/reactflow', 'node');
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      style={{ cursor: 'grab', userSelect: 'none' }}
                    >
                      <i className="bi bi-circle-fill text-primary" style={{ fontSize: '18px' }}></i>
                      <span className="fw-medium">Node</span>
                    </div>
                    <div
                      className="card card-body p-2 d-flex flex-row align-items-center gap-2 draggable-palette-item"
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('application/reactflow', 'subgraph');
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      style={{ cursor: 'grab', userSelect: 'none' }}
                    >
                      <i className="bi bi-collection-fill text-info" style={{ fontSize: '18px' }}></i>
                      <span className="fw-medium">Subgraph</span>
                    </div>
                  </div>
                  <div className="mt-2 text-muted small">
                    Drag to canvas to add
                  </div>
                </div>
              </div>
            </div>
            {/* Removed Input and Found Diagrams sections per user request */}

            {/* Actions removed per user request */}

            {/* Saved diagrams/persistence removed */}
          </div>

            {/* Removed Code Editor accordion — diagrams handled in the Diagrams section */}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        className={`flex-grow-1 position-relative transition-all`}
        style={{ transition: "all 0.3s ease" }}
        ref={containerRef}
      >
        {/* Top Toolbar */}
        <div className="position-absolute top-0 start-0 end-0 z-3 bg-white border-bottom">
          <div className="d-flex align-items-center justify-content-between px-3 py-2">
            <div className="d-flex align-items-center">
              <button
                className="btn btn-sm btn-outline-secondary me-2 p-1"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
                style={{ width: "28px", height: "28px" }}
              >
                <i
                  className={`bi bi-${
                    sidebarCollapsed
                      ? "layout-sidebar"
                      : "layout-sidebar-reverse"
                  }`}
                  style={{ fontSize: "12px" }}
                ></i>
              </button>
              <h5 className="mb-0 fw-semibold text-primary fs-6">
                <i className="bi bi-diagram-3 me-2"></i>
                Mermaid Studio
              </h5>
              {/* editing state removed */}
            </div>

            <div className="d-flex align-items-center gap-1">
              {/* Preview toggle: only shown in top nav. Enabled when there are nodes in the canvas. */}
              {showPreviewMain ? (
                <button
                  onClick={() => setShowPreviewMain(false)}
                  className="btn btn-sm btn-outline-secondary"
                  title="Hide Preview"
                  style={{ fontSize: "11px" }}
                >
                  <i className="bi bi-eye-slash me-1"></i>
                  Hide Preview
                </button>
              ) : (
                flowData.nodes.length > 0 && (
                  <button
                    onClick={() => setShowPreviewMain(true)}
                    className="btn btn-sm btn-outline-primary"
                    title="Show Preview"
                    style={{ fontSize: "11px" }}
                  >
                    <i className="bi bi-eye me-1"></i>
                    Preview
                  </button>
                )
              )}
              {flowData.nodes.length > 0 && (
                <>
                  <button
                    onClick={handleSaveDiagram}
                    className="btn btn-sm btn-primary"
                    title="Save diagram"
                    style={{ fontSize: "11px" }}
                  >
                    <i className="bi bi-save me-1"></i>
                    Save
                  </button>

                  {/* Search (invokes FlowDiagram search) */}
                  <button
                    onClick={() => {
                      if (flowMethodsRef.current?.openSearch) flowMethodsRef.current.openSearch();
                      else showToast('Search not available', 'info');
                    }}
                    className="btn btn-sm btn-outline-secondary"
                    title="Search nodes"
                    style={{ fontSize: "11px" }}
                  >
                    <i className="bi bi-search me-1"></i>
                    Search
                  </button>

                  {/* Download image (invokes FlowDiagram exportImage) */}
                  <button
                    onClick={async () => {
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
                    }}
                    className="btn btn-sm btn-outline-primary"
                    title="Download image"
                    style={{ fontSize: "11px" }}
                  >
                    <i className="bi bi-image me-1"></i>
                    Image
                  </button>
                </>
              )}
              <button
                onClick={clearAll}
                className="btn btn-sm btn-outline-danger p-1"
                title="Clear all"
                style={{ width: "28px", height: "28px" }}
              >
                <i className="bi bi-trash3" style={{ fontSize: "11px" }}></i>
              </button>
            </div>
          </div>
        </div>

        {/* Canvas */}
  <div className="w-100 h-100" style={{ paddingTop: "50px" }}>
          {loading ? (
            <div className="d-flex align-items-center justify-content-center h-100">
              <div className="text-center">
                <div
                  className="spinner-border text-primary mb-2"
                  role="status"
                  style={{ width: "2rem", height: "2rem" }}
                >
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted small">Converting diagram...</p>
              </div>
            </div>
          ) : (showPreviewMain || showFlowMain) ? (
            <div className="d-flex h-100 position-relative">
              {showPreviewMain && mermaidSource && (
                <div
                  className="preview-pane"
                  style={{ width: showFlowMain ? `${Math.round(splitRatio * 100)}%` : '100%' }}
                >
                  <div className="preview-pane-header">
                    <h6 className="text-muted small mb-0"><i className="bi bi-eye me-1"></i> Preview</h6>
                  </div>
                  <div className="preview-pane-body">
                    <MermaidRenderer code={mermaidSource} />
                  </div>
                </div>
              )}

              {showPreviewMain && showFlowMain && (
                <div
                  ref={resizerRef}
                  className={`vertical-resizer ${isResizing ? 'resizing' : ''}`}
                  onMouseDown={(e) => {
                    if (!containerRef.current) return;
                    setIsResizing(true);
                    const startX = e.clientX;
                    const startRatio = splitRatio;
                    const onMove = (ev: MouseEvent) => {
                      const dx = ev.clientX - startX;
                      const rect = containerRef.current!.getBoundingClientRect();
                      const newRatio = Math.min(0.85, Math.max(0.15, startRatio + dx / rect.width));
                      setSplitRatio(newRatio);
                    };
                    const onUp = () => {
                      setIsResizing(false);
                      window.removeEventListener('mousemove', onMove);
                      window.removeEventListener('mouseup', onUp);
                    };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                  }}
                  title="Drag to resize"
                />
              )}

              {showFlowMain && (
                <div className="canvas-pane">
                  {flowData.nodes.length > 0 ? (
                    <FlowDiagram
                      nodes={flowData.nodes}
                      edges={flowData.edges}
                      onNodesChange={handleNodesChange}
                      onEdgesChange={handleEdgesChange}
                      onRequestPreview={() => setShowPreviewMain((s) => !s)}
                      onRegisterMethods={registerFlowMethods}
                    />
                  ) : (
                    <div className="d-flex align-items-center justify-content-center h-100 text-center">
                      <p className="text-muted">No diagram to display.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : flowData.nodes.length > 0 ? (
            <FlowDiagram
              nodes={flowData.nodes}
              edges={flowData.edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onRegisterMethods={registerFlowMethods}
            />
          ) : (
            <div className="d-flex align-items-center justify-content-center h-100 text-center">
              <div>
                <i
                  className="bi bi-diagram-3 text-muted mb-3"
                  style={{ fontSize: "48px" }}
                ></i>
                <h4 className="text-muted mb-2 fw-normal">
                  Welcome to Mermaid Studio
                </h4>
                <p className="text-muted mb-3 small">
                  Upload a markdown file or paste Mermaid code to get started
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setSidebarCollapsed(false);
                    setActiveAccordion("editor");
                  }}
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Create Diagram
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
