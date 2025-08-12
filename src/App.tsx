import React, { useState, useEffect } from "react";
import { FlowDiagram } from "./components/FlowDiagram";
import { extractMermaidDiagrams, MermaidDiagram } from "./utils/mermaidParser";
import {
  convertMermaidToReactFlow,
  ReactFlowData,
} from "./utils/mermaidToReactFlow";
import {
  saveDiagram,
  getAllDiagrams,
  deleteDiagram,
  exportToFile,
  SavedDiagram,
  getDiagram,
  updateDiagram,
} from "./utils/diagramStorage";
import { Node, Edge } from "reactflow";
import "./App.css";
import { MermaidRenderer } from "./components/MermaidRenderer";

function App() {
  const [markdownContent, setMarkdownContent] = useState("");
  const [diagrams, setDiagrams] = useState<MermaidDiagram[]>([]);
  const [selectedDiagram, setSelectedDiagram] = useState(0);
  const [flowData, setFlowData] = useState<ReactFlowData>({
    nodes: [],
    edges: [],
  });
  const [loading, setLoading] = useState(false);
  const [savedDiagrams, setSavedDiagrams] = useState<SavedDiagram[]>([]);
  const [currentDiagramId, setCurrentDiagramId] = useState<string | null>(null);
  const [editingDiagramId, setEditingDiagramId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [activeAccordion, setActiveAccordion] = useState("input");

  // UI State
  const [accordionOpen, setAccordionOpen] = useState({
    input: true,
    palette: false,
    diagrams: false,
    actions: false,
    saved: false,
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Extract diagrams when markdown content changes
  useEffect(() => {
    if (markdownContent) {
      const extractedDiagrams = extractMermaidDiagrams(markdownContent);
      setDiagrams(extractedDiagrams);
      if (extractedDiagrams.length > 0) {
        setSelectedDiagram(0);
        setActiveAccordion("diagrams");
      }
    }
  }, [markdownContent]);

  // Load saved diagrams on mount
  useEffect(() => {
    setSavedDiagrams(getAllDiagrams());
  }, []);

  // Convert selected diagram to React Flow format
  useEffect(() => {
    if (diagrams.length > 0 && selectedDiagram < diagrams.length) {
      setLoading(true);
      convertMermaidToReactFlow(diagrams[selectedDiagram].code)
        .then((data) => {
          setFlowData(data);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error converting diagram:", error);
          setLoading(false);
        });
    }
  }, [diagrams, selectedDiagram]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (flowData.nodes.length > 0) {
          handleSaveDiagram();
        }
      }
      if (e.key === "Escape") {
        setEditingDiagramId(null);
        setEditingName("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flowData, currentDiagramId]);

  // Event handlers
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setMarkdownContent(content);
      };
      reader.readAsText(file);
    }
  };

  const handleTextareaChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setMarkdownContent(event.target.value);
  };

  const handleNodesChange = (nodes: Node[]) => {
    setFlowData((prev) => ({ ...prev, nodes }));
  };

  const handleEdgesChange = (edges: Edge[]) => {
    setFlowData((prev) => ({ ...prev, edges }));
  };

  const handleSaveDiagram = () => {
    if (diagrams.length > 0 && selectedDiagram < diagrams.length) {
      const currentMermaidDiagram = diagrams[selectedDiagram];
      const saved = saveDiagram({
        name: currentMermaidDiagram.name,
        nodes: flowData.nodes,
        edges: flowData.edges,
        originalMermaidCode: currentMermaidDiagram.code,
        metadata: {
          description: `Converted from Mermaid ${currentMermaidDiagram.type} diagram`,
        },
      });
      setCurrentDiagramId(saved.id);
      setSavedDiagrams(getAllDiagrams());
      showToast("Diagram saved successfully!", "success");
    } else if (currentDiagramId && flowData.nodes.length > 0) {
      const diagram = getDiagram(currentDiagramId);
      if (diagram) {
        updateDiagram(currentDiagramId, {
          nodes: flowData.nodes,
          edges: flowData.edges,
        });
        setSavedDiagrams(getAllDiagrams());
        showToast("Diagram updated successfully!", "success");
      }
    }
  };

  const handleExportDiagram = () => {
    if (diagrams.length > 0 && selectedDiagram < diagrams.length) {
      const currentMermaidDiagram = diagrams[selectedDiagram];
      const diagramToExport: SavedDiagram = {
        id: "export",
        name: currentMermaidDiagram.name,
        nodes: flowData.nodes,
        edges: flowData.edges,
        originalMermaidCode: currentMermaidDiagram.code,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      exportToFile(diagramToExport);
      showToast("Diagram exported successfully!", "success");
    }
  };

  const handleLoadDiagram = (diagram: SavedDiagram) => {
    setFlowData({ nodes: diagram.nodes, edges: diagram.edges });
    setCurrentDiagramId(diagram.id);
    setMarkdownContent("");
    setDiagrams([]);
    setActiveAccordion("actions");
    showToast("Diagram loaded successfully!", "success");
  };

  const handleDeleteDiagram = (id: string) => {
    if (confirm("Are you sure you want to delete this diagram?")) {
      deleteDiagram(id);
      setSavedDiagrams(getAllDiagrams());
      if (currentDiagramId === id) {
        setCurrentDiagramId(null);
      }
      showToast("Diagram deleted successfully!", "success");
    }
  };

  const handleStartRename = (diagram: SavedDiagram) => {
    setEditingDiagramId(diagram.id);
    setEditingName(diagram.name);
  };

  const handleSaveRename = (diagramId: string) => {
    if (editingName.trim()) {
      updateDiagram(diagramId, { name: editingName.trim() });
      setSavedDiagrams(getAllDiagrams());
      setEditingDiagramId(null);
      setEditingName("");
      showToast("Diagram renamed successfully!", "success");
    }
  };

  const handleCancelRename = () => {
    setEditingDiagramId(null);
    setEditingName("");
  };

  const handleRenameKeyPress = (e: React.KeyboardEvent, diagramId: string) => {
    if (e.key === "Enter") {
      handleSaveRename(diagramId);
    } else if (e.key === "Escape") {
      handleCancelRename();
    }
  };

  const toggleAccordion = (section: string) => {
    setAccordionOpen(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
    setActiveAccordion(section);
  };

  const showToast = (message: string, type: "success" | "error" | "info") => {
    // You can implement a proper toast notification here
    // For now, using alert as placeholder
    alert(message);
  };

  const clearAll = () => {
    if (confirm("Are you sure you want to clear all content?")) {
      setMarkdownContent("");
      setDiagrams([]);
      setFlowData({ nodes: [], edges: [] });
      setCurrentDiagramId(null);
      setActiveAccordion("input");
    }
  };

  return (
    <div
      className="vh-100 d-flex"
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
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
            {/* Input Section */}
            <div className="border-bottom">
              <button
                className={`w-100 btn btn-link text-start px-3 py-2 fw-normal border-0 ${
                  activeAccordion === "input"
                    ? "text-primary bg-primary bg-opacity-10"
                    : "text-dark"
                }`}
                onClick={() => toggleAccordion("input")}
                style={{ borderRadius: 0 }}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-file-earmark-plus me-2"></i>
                    <span className="fs-7">Input Source</span>
                  </div>
                  <i
                    className={`bi bi-chevron-${
                      accordionOpen.input ? "up" : "down"
                    } fs-7`}
                  ></i>
                </div>
              </button>

              <div
                className={`collapse ${
                  accordionOpen.input ? "show" : ""
                }`}
              >
                <div className="px-3 py-2 bg-white">
                  <div className="mb-3">
                    <label className="form-label small text-muted mb-1 fw-medium">
                      <i className="bi bi-cloud-upload me-1"></i>
                      Upload File
                    </label>
                    <input
                      type="file"
                      accept=".md,.markdown"
                      onChange={handleFileUpload}
                      className="form-control form-control-sm"
                    />
                  </div>

                  <div className="mb-2">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="form-label small text-muted mb-0 fw-medium">
                        <i className="bi bi-code-slash me-1"></i>
                        Paste Code
                      </label>
                      {markdownContent && (
                        <button
                          className="btn btn-sm p-0 text-danger"
                          onClick={() => setMarkdownContent("")}
                          title="Clear content"
                          style={{ fontSize: "12px" }}
                        >
                          <i className="bi bi-x-circle"></i>
                        </button>
                      )}
                    </div>
                    <textarea
                      value={markdownContent}
                      onChange={handleTextareaChange}
                      placeholder={`\`\`\`mermaid\ngraph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Action 1]\n    B -->|No| D[Action 2]\n    C --> E[End]\n    D --> E\n\`\`\`\n\nPaste your Mermaid diagram code here...`}
                      rows={6}
                      className="form-control form-control-sm font-monospace"
                      style={{ resize: "vertical", fontSize: "11px" }}
                    />
                    {markdownContent && (
                      <div className="mt-1">
                        <small
                          className="text-muted"
                          style={{ fontSize: "10px" }}
                        >
                          <i className="bi bi-info-circle me-1"></i>
                          {markdownContent.length} chars
                        </small>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Found Diagrams Section */}
            {diagrams.length > 0 && (
              <div className="border-bottom">
                <button
                  className={`w-100 btn btn-link text-start px-3 py-2 fw-normal border-0 ${
                    activeAccordion === "diagrams"
                      ? "text-primary bg-primary bg-opacity-10"
                      : "text-dark"
                  }`}
                  onClick={() => toggleAccordion("diagrams")}
                  style={{ borderRadius: 0 }}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-diagram-2 me-2"></i>
                      <span className="fs-7">Diagrams</span>
                      <span
                        className="badge bg-primary rounded-pill ms-2 px-2 py-1"
                        style={{ fontSize: "9px" }}
                      >
                        {diagrams.length}
                      </span>
                    </div>
                    <i
                      className={`bi bi-chevron-${
                        accordionOpen.diagrams ? "up" : "down"
                      } fs-7`}
                    ></i>
                  </div>
                </button>

                <div
                  className={`collapse ${
                    accordionOpen.diagrams ? "show" : ""
                  }`}
                >
                  <div className="px-3 py-2 bg-white">
                    <div className="d-grid gap-2">
                      {diagrams.map((diagram, index) => (
                        <div key={index}>
                          <div
                            className={`card card-body p-2 cursor-pointer border ${
                              selectedDiagram === index
                                ? "border-primary bg-primary bg-opacity-10"
                                : "border-light"
                            }`}
                            style={{
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                            onClick={() => setSelectedDiagram(index)}
                          >
                            <div className="d-flex align-items-center">
                              <div
                                className={`rounded d-flex align-items-center justify-content-center me-2 ${
                                  selectedDiagram === index
                                    ? "bg-primary text-white"
                                    : "bg-light text-muted"
                                }`}
                                style={{ width: "24px", height: "24px" }}
                              >
                                <i
                                  className={`bi bi-${
                                    diagram.type === "flowchart"
                                      ? "diagram-3"
                                      : "graph-up"
                                  }`}
                                  style={{ fontSize: "11px" }}
                                ></i>
                              </div>
                              <div className="flex-grow-1 min-width-0">
                                <div
                                  className="fw-medium text-truncate"
                                  style={{ fontSize: "12px" }}
                                >
                                  {diagram.name}
                                </div>
                                <small
                                  className="text-muted"
                                  style={{ fontSize: "10px" }}
                                >
                                  {diagram.type}
                                </small>
                              </div>
                              {selectedDiagram === index && (
                                <i
                                  className="bi bi-check-circle-fill text-primary"
                                  style={{ fontSize: "12px" }}
                                ></i>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick Preview Toggle */}
                    {diagrams.length > 0 &&
                      selectedDiagram < diagrams.length && (
                        <div className="mt-2">
                          <div className="btn-group w-100" role="group">
                            <button
                              className={`btn btn-sm ${
                                showCodePreview
                                  ? "btn-primary"
                                  : "btn-outline-secondary"
                              }`}
                              onClick={() =>
                                setShowCodePreview(!showCodePreview)
                              }
                              style={{ fontSize: "11px" }}
                            >
                              <i className="bi bi-code-slash me-1"></i>
                              Code
                            </button>
                            <button
                              className={`btn btn-sm ${
                                showLivePreview
                                  ? "btn-primary"
                                  : "btn-outline-secondary"
                              }`}
                              onClick={() =>
                                setShowLivePreview(!showLivePreview)
                              }
                              style={{ fontSize: "11px" }}
                            >
                              <i className="bi bi-eye me-1"></i>
                              Preview
                            </button>
                          </div>

                          {/* Code Preview */}
                          {showCodePreview && (
                            <div className="mt-2">
                              <div className="position-relative">
                                <pre
                                  className="bg-dark text-light rounded p-2 mb-0 overflow-auto"
                                  style={{
                                    maxHeight: "120px",
                                    fontSize: "9px",
                                  }}
                                >
                                  <code>{diagrams[selectedDiagram].code}</code>
                                </pre>
                                <button
                                  className="btn btn-sm btn-outline-light position-absolute top-0 end-0 m-1 p-1"
                                  onClick={() =>
                                    navigator.clipboard.writeText(
                                      diagrams[selectedDiagram].code
                                    )
                                  }
                                  title="Copy code"
                                  style={{
                                    fontSize: "9px",
                                    width: "24px",
                                    height: "24px",
                                  }}
                                >
                                  <i className="bi bi-clipboard"></i>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions Section */}
            <div className="border-bottom">
              <button
                className={`w-100 btn btn-link text-start px-3 py-2 fw-normal border-0 ${
                  activeAccordion === "actions"
                    ? "text-primary bg-primary bg-opacity-10"
                    : "text-dark"
                }`}
                onClick={() => toggleAccordion("actions")}
                style={{ borderRadius: 0 }}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-lightning me-2"></i>
                    <span className="fs-7">Actions</span>
                  </div>
                  <i
                    className={`bi bi-chevron-${
                      accordionOpen.actions ? "up" : "down"
                    } fs-7`}
                  ></i>
                </div>
              </button>

              <div
                className={`collapse ${
                  accordionOpen.actions ? "show" : ""
                }`}
              >
                <div className="px-3 py-2 bg-white">
                  <div className="d-grid gap-2">
                    <button
                      onClick={handleSaveDiagram}
                      disabled={flowData.nodes.length === 0}
                      className={`btn btn-sm ${
                        currentDiagramId ? "btn-warning" : "btn-success"
                      } d-flex align-items-center`}
                    >
                      <i
                        className={`bi bi-${
                          currentDiagramId ? "arrow-repeat" : "floppy"
                        } me-2`}
                      ></i>
                      <div className="text-start flex-grow-1">
                        <div className="fw-medium" style={{ fontSize: "12px" }}>
                          {currentDiagramId ? "Update" : "Save"}
                        </div>
                        <small
                          style={{ fontSize: "9px" }}
                          className="opacity-75"
                        >
                          Ctrl+S
                        </small>
                      </div>
                    </button>

                    <button
                      onClick={handleExportDiagram}
                      disabled={flowData.nodes.length === 0}
                      className="btn btn-sm btn-outline-primary d-flex align-items-center"
                    >
                      <i className="bi bi-download me-2"></i>
                      <div className="text-start flex-grow-1">
                        <div className="fw-medium" style={{ fontSize: "12px" }}>
                          Export
                        </div>
                        <small style={{ fontSize: "9px" }}>JSON file</small>
                      </div>
                    </button>

                    <button
                      onClick={clearAll}
                      className="btn btn-sm btn-outline-danger d-flex align-items-center"
                    >
                      <i className="bi bi-trash3 me-2"></i>
                      <div className="text-start flex-grow-1">
                        <div className="fw-medium" style={{ fontSize: "12px" }}>
                          Clear
                        </div>
                        <small style={{ fontSize: "9px" }}>Reset all</small>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Saved Diagrams Section */}
            <div>
              <button
                className={`w-100 btn btn-link text-start px-3 py-2 fw-normal border-0 ${
                  activeAccordion === "saved"
                    ? "text-primary bg-primary bg-opacity-10"
                    : "text-dark"
                }`}
                onClick={() => toggleAccordion("saved")}
                style={{ borderRadius: 0 }}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-collection me-2"></i>
                    <span className="fs-7">Saved</span>
                    <span
                      className="badge bg-secondary rounded-pill ms-2 px-2 py-1"
                      style={{ fontSize: "9px" }}
                    >
                      {savedDiagrams.length}
                    </span>
                  </div>
                  <i
                    className={`bi bi-chevron-${
                      accordionOpen.saved ? "up" : "down"
                    } fs-7`}
                  ></i>
                </div>
              </button>

              <div
                className={`collapse ${
                  accordionOpen.saved ? "show" : ""
                }`}
              >
                <div
                  className="px-3 py-2 bg-white"
                  style={{ maxHeight: "300px", overflowY: "auto" }}
                >
                  {savedDiagrams.length === 0 ? (
                    <div className="text-center py-3">
                      <i
                        className="bi bi-inbox text-muted mb-2"
                        style={{ fontSize: "24px" }}
                      ></i>
                      <p className="text-muted mb-0 small">No saved diagrams</p>
                      <small
                        className="text-muted"
                        style={{ fontSize: "10px" }}
                      >
                        Save your first diagram
                      </small>
                    </div>
                  ) : (
                    <div className="d-grid gap-2">
                      {savedDiagrams.map((diagram) => (
                        <div key={diagram.id}>
                          <div className="card card-body p-2 border">
                            <div className="d-flex align-items-start mb-2">
                              <div
                                className="bg-primary bg-opacity-10 rounded d-flex align-items-center justify-content-center me-2"
                                style={{ width: "24px", height: "24px" }}
                              >
                                <i
                                  className="bi bi-file-earmark-text text-primary"
                                  style={{ fontSize: "11px" }}
                                ></i>
                              </div>
                              <div className="flex-grow-1 min-width-0">
                                {editingDiagramId === diagram.id ? (
                                  <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) =>
                                      setEditingName(e.target.value)
                                    }
                                    onKeyDown={(e) =>
                                      handleRenameKeyPress(e, diagram.id)
                                    }
                                    onBlur={() => handleSaveRename(diagram.id)}
                                    autoFocus
                                    className="form-control form-control-sm fw-medium"
                                    style={{ fontSize: "11px" }}
                                  />
                                ) : (
                                  <div
                                    className="fw-medium text-truncate cursor-pointer"
                                    onClick={() => handleStartRename(diagram)}
                                    title={diagram.name}
                                    style={{
                                      cursor: "pointer",
                                      fontSize: "11px",
                                    }}
                                  >
                                    {diagram.name}
                                  </div>
                                )}
                                <small
                                  className="text-muted"
                                  style={{ fontSize: "9px" }}
                                >
                                  <i className="bi bi-calendar3 me-1"></i>
                                  {new Date(
                                    diagram.updatedAt
                                  ).toLocaleDateString()}
                                </small>
                              </div>
                            </div>

                            <div className="btn-group w-100" role="group">
                              <button
                                onClick={() => handleLoadDiagram(diagram)}
                                className="btn btn-sm btn-primary"
                                title="Load diagram"
                                style={{ fontSize: "10px" }}
                              >
                                <i className="bi bi-play-fill me-1"></i>
                                Load
                              </button>
                              <button
                                onClick={() => exportToFile(diagram)}
                                className="btn btn-sm btn-outline-secondary"
                                title="Export"
                                style={{ fontSize: "10px" }}
                              >
                                <i className="bi bi-download"></i>
                              </button>
                              {editingDiagramId === diagram.id ? (
                                <>
                                  <button
                                    onClick={() => handleSaveRename(diagram.id)}
                                    className="btn btn-sm btn-success"
                                    title="Save"
                                    style={{ fontSize: "10px" }}
                                  >
                                    <i className="bi bi-check"></i>
                                  </button>
                                  <button
                                    onClick={handleCancelRename}
                                    className="btn btn-sm btn-secondary"
                                    title="Cancel"
                                    style={{ fontSize: "10px" }}
                                  >
                                    <i className="bi bi-x"></i>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleStartRename(diagram)}
                                    className="btn btn-sm btn-outline-info"
                                    title="Rename"
                                    style={{ fontSize: "10px" }}
                                  >
                                    <i className="bi bi-pencil"></i>
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteDiagram(diagram.id)
                                    }
                                    className="btn btn-sm btn-outline-danger"
                                    title="Delete"
                                    style={{ fontSize: "10px" }}
                                  >
                                    <i className="bi bi-trash3"></i>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        className={`flex-grow-1 position-relative transition-all`}
        style={{ transition: "all 0.3s ease" }}
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
              {currentDiagramId && (
                <span
                  className="badge bg-success ms-2 px-2 py-1"
                  style={{ fontSize: "9px" }}
                >
                  <i className="bi bi-pencil-square me-1"></i>
                  Editing
                </span>
              )}
            </div>

            <div className="d-flex align-items-center gap-1">
              {showLivePreview && (
                <button
                  onClick={() => setShowLivePreview(false)}
                  className="btn btn-sm btn-outline-secondary"
                  title="Hide Preview"
                  style={{ fontSize: "11px" }}
                >
                  <i className="bi bi-eye-slash me-1"></i>
                  Hide Preview
                </button>
              )}
              {flowData.nodes.length > 0 && (
                <>
                  <button
                    onClick={handleSaveDiagram}
                    className={`btn btn-sm ${
                      currentDiagramId ? "btn-warning" : "btn-success"
                    }`}
                    title="Save diagram (Ctrl+S)"
                    style={{ fontSize: "11px" }}
                  >
                    <i
                      className={`bi bi-${
                        currentDiagramId ? "arrow-repeat" : "floppy"
                      } me-1`}
                    ></i>
                    {currentDiagramId ? "Update" : "Save"}
                  </button>
                  <button
                    onClick={handleExportDiagram}
                    className="btn btn-sm btn-outline-primary"
                    title="Export diagram"
                    style={{ fontSize: "11px" }}
                  >
                    <i className="bi bi-download me-1"></i>
                    Export
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
          ) : showLivePreview &&
            diagrams.length > 0 &&
            selectedDiagram < diagrams.length ? (
            <div className="d-flex h-100">
              <div className="w-50 border-end p-2 overflow-auto">
                <h6 className="text-muted small mb-2">
                  <i className="bi bi-eye me-1"></i>
                  Live Preview
                </h6>
                <div className="d-flex justify-content-center align-items-center h-100">
                  <MermaidRenderer code={diagrams[selectedDiagram].code} />
                </div>
              </div>
              <div className="w-50 position-relative">
                {flowData.nodes.length > 0 ? (
                  <FlowDiagram
                    nodes={flowData.nodes}
                    edges={flowData.edges}
                    onNodesChange={handleNodesChange}
                    onEdgesChange={handleEdgesChange}
                  />
                ) : (
                  <div className="d-flex align-items-center justify-content-center h-100 text-center">
                    <p className="text-muted">No diagram to display.</p>
                  </div>
                )}
              </div>
            </div>
          ) : flowData.nodes.length > 0 ? (
            <FlowDiagram
              nodes={flowData.nodes}
              edges={flowData.edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
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
                    setActiveAccordion("input");
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
