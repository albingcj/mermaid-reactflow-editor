
import React, { useState, useEffect } from 'react';
import { FlowDiagram } from './components/FlowDiagram';
import { extractMermaidDiagrams, MermaidDiagram } from './utils/mermaidParser';
import { convertMermaidToReactFlow, ReactFlowData } from './utils/mermaidToReactFlow';
import { saveDiagram, getAllDiagrams, deleteDiagram, exportToFile, SavedDiagram, getDiagram, updateDiagram } from './utils/diagramStorage';
import { Node, Edge } from 'reactflow';
import './App.css';

function App() {
  const [markdownContent, setMarkdownContent] = useState('');
  const [diagrams, setDiagrams] = useState<MermaidDiagram[]>([]);
  const [selectedDiagram, setSelectedDiagram] = useState(0);
  const [flowData, setFlowData] = useState<ReactFlowData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(false);
  const [savedDiagrams, setSavedDiagrams] = useState<SavedDiagram[]>([]);
  const [currentDiagramId, setCurrentDiagramId] = useState<string | null>(null);
  const [showSavedDiagrams, setShowSavedDiagrams] = useState(false);
  const [editingDiagramId, setEditingDiagramId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    if (markdownContent) {
      const extractedDiagrams = extractMermaidDiagrams(markdownContent);
      setDiagrams(extractedDiagrams);
      if (extractedDiagrams.length > 0) {
        setSelectedDiagram(0);
      }
    }
  }, [markdownContent]);

  useEffect(() => {
    setSavedDiagrams(getAllDiagrams());
  }, []);


  // Reference all handlers and state in JSX to avoid unused warnings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (flowData.nodes.length > 0) {
          handleSaveDiagram();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line
  }, [flowData, currentDiagramId]);

  useEffect(() => {
    if (diagrams.length > 0 && selectedDiagram < diagrams.length) {
      setLoading(true);
      convertMermaidToReactFlow(diagrams[selectedDiagram].code)
        .then(data => {
          setFlowData(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error converting diagram:', error);
          setLoading(false);
        });
    }
  }, [diagrams, selectedDiagram]);

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

  const handleTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMarkdownContent(event.target.value);
  };

  const handleNodesChange = (nodes: Node[]) => {
    setFlowData(prev => ({ ...prev, nodes }));
  };

  const handleEdgesChange = (edges: Edge[]) => {
    setFlowData(prev => ({ ...prev, edges }));
  };

  // --- Handler functions ---
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
        }
      });
      setCurrentDiagramId(saved.id);
      setSavedDiagrams(getAllDiagrams());
      alert('Diagram saved successfully!');
    } else if (currentDiagramId && flowData.nodes.length > 0) {
      // Update existing saved diagram
      const diagram = getDiagram(currentDiagramId);
      if (diagram) {
        updateDiagram(currentDiagramId, {
          nodes: flowData.nodes,
          edges: flowData.edges,
        });
        setSavedDiagrams(getAllDiagrams());
        alert('Diagram updated successfully!');
      }
    }
  };

  const handleExportDiagram = () => {
    if (diagrams.length > 0 && selectedDiagram < diagrams.length) {
      const currentMermaidDiagram = diagrams[selectedDiagram];
      const diagramToExport: SavedDiagram = {
        id: 'export',
        name: currentMermaidDiagram.name,
        nodes: flowData.nodes,
        edges: flowData.edges,
        originalMermaidCode: currentMermaidDiagram.code,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      exportToFile(diagramToExport);
    }
  };

  const handleRenameKeyPress = (e: React.KeyboardEvent, diagramId: string) => {
    if (e.key === 'Enter') {
      handleSaveRename(diagramId);
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  const handleSaveRename = (diagramId: string) => {
    if (editingName.trim()) {
      updateDiagram(diagramId, { name: editingName.trim() });
      setSavedDiagrams(getAllDiagrams());
      setEditingDiagramId(null);
      setEditingName('');
    }
  };

  const handleStartRename = (diagram: SavedDiagram) => {
    setEditingDiagramId(diagram.id);
    setEditingName(diagram.name);
  };

  const handleCancelRename = () => {
    setEditingDiagramId(null);
    setEditingName('');
  };

  const handleLoadDiagram = (diagram: SavedDiagram) => {
    setFlowData({ nodes: diagram.nodes, edges: diagram.edges });
    setCurrentDiagramId(diagram.id);
    setShowSavedDiagrams(false);
    // Clear markdown content when loading saved diagram
    setMarkdownContent('');
    setDiagrams([]);
  };

  const handleDeleteDiagram = (id: string) => {
    if (confirm('Are you sure you want to delete this diagram?')) {
      deleteDiagram(id);
      setSavedDiagrams(getAllDiagrams());
      if (currentDiagramId === id) {
        setCurrentDiagramId(null);
      }
    }
  };

  // --- End handler functions ---

  return (
    <div className="container-fluid vh-100 d-flex flex-column p-0">
      <div className="row flex-grow-1 m-0 h-100">
        {/* Main diagram area */}
        <div className="col-12 col-md-9 p-0 h-100 d-flex align-items-stretch">
          <div className="w-100 h-100">
            <FlowDiagram
              nodes={flowData.nodes}
              edges={flowData.edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
            />
          </div>
        </div>
        {/* Sidebar */}
        <div className="col-12 col-md-3 bg-light border-start p-3 overflow-auto" style={{ minWidth: 300, maxHeight: '100vh' }}>
          <h4 className="mb-3">Mermaid to React Flow</h4>
          {/* File upload and textarea */}
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="card-title">Input Markdown</h6>
              <div className="mb-2">
                <input type="file" accept=".md,.markdown" onChange={handleFileUpload} className="form-control form-control-sm" id="file-input" />
              </div>
              <textarea
                value={markdownContent}
                onChange={handleTextareaChange}
                placeholder="Or paste your markdown content here..."
                rows={5}
                className="form-control mb-2"
              />
            </div>
          </div>
          {/* Found diagrams list */}
          {diagrams.length > 0 && (
            <div className="card mb-3">
              <div className="card-body">
                <h6 className="card-title">Found Diagrams <span className="badge bg-secondary">{diagrams.length}</span></h6>
                <ul className="list-group list-group-flush">
                  {diagrams.map((diagram, index) => (
                    <li
                      key={index}
                      className={`list-group-item list-group-item-action py-1 px-2 ${selectedDiagram === index ? 'active' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedDiagram(index)}
                      title={diagram.name}
                    >
                      {diagram.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {/* Mermaid code preview */}
          {diagrams.length > 0 && selectedDiagram < diagrams.length && (
            <div className="card mb-3">
              <div className="card-body">
                <h6 className="card-title">Mermaid Code</h6>
                <pre className="bg-light border rounded small p-2 mb-0" style={{maxHeight: 120, overflow: 'auto'}}>{diagrams[selectedDiagram].code}</pre>
              </div>
            </div>
          )}
          {/* Diagram actions */}
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="card-title">Diagram Actions</h6>
              {currentDiagramId && (
                <div className="mb-2"><small className="text-success">Editing saved diagram</small></div>
              )}
              <div className="d-grid gap-2 mb-2">
                <button onClick={handleSaveDiagram} disabled={flowData.nodes.length === 0} className="btn btn-primary btn-sm">
                  {currentDiagramId ? 'Update Saved Diagram' : 'Save Current Diagram'}
                </button>
                <button onClick={handleExportDiagram} disabled={flowData.nodes.length === 0} className="btn btn-outline-secondary btn-sm">
                  Export to File
                </button>
                <button onClick={() => setShowSavedDiagrams(!showSavedDiagrams)} className="btn btn-outline-info btn-sm">
                  {showSavedDiagrams ? 'Hide' : 'Show'} Saved Diagrams <span className="badge bg-secondary">{savedDiagrams.length}</span>
                </button>
              </div>
            </div>
          </div>
          {/* Saved diagrams list */}
          {showSavedDiagrams && (
            <div className="card mb-3">
              <div className="card-body">
                <h6 className="card-title">Saved Diagrams</h6>
                {savedDiagrams.length === 0 ? (
                  <p className="text-muted mb-0">No saved diagrams yet</p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {savedDiagrams.map(diagram => (
                      <li key={diagram.id} className="list-group-item py-2 px-2">
                        <div className="d-flex align-items-center justify-content-between">
                          <div>
                            {editingDiagramId === diagram.id ? (
                              <input
                                type="text"
                                value={editingName}
                                onChange={e => setEditingName(e.target.value)}
                                onKeyDown={e => handleRenameKeyPress(e, diagram.id)}
                                onBlur={() => handleSaveRename(diagram.id)}
                                autoFocus
                                className="form-control form-control-sm d-inline-block w-auto me-2"
                              />
                            ) : (
                              <strong
                                onClick={() => handleStartRename(diagram)}
                                className="diagram-name-editable"
                                title="Click to rename"
                                style={{ cursor: 'pointer' }}
                              >
                                {diagram.name}
                              </strong>
                            )}
                            <small className="text-muted ms-2">{new Date(diagram.updatedAt).toLocaleDateString()}</small>
                          </div>
                          <div className="btn-group btn-group-sm" role="group">
                            <button onClick={() => handleLoadDiagram(diagram)} className="btn btn-outline-primary btn-sm">Load</button>
                            <button onClick={() => exportToFile(diagram)} className="btn btn-outline-secondary btn-sm">Export</button>
                            {editingDiagramId === diagram.id ? (
                              <>
                                <button onClick={() => handleSaveRename(diagram.id)} className="btn btn-success btn-sm">Save</button>
                                <button onClick={handleCancelRename} className="btn btn-secondary btn-sm">Cancel</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => handleStartRename(diagram)} className="btn btn-outline-info btn-sm">Rename</button>
                                <button onClick={() => handleDeleteDiagram(diagram.id)} className="btn btn-outline-danger btn-sm">Delete</button>
                              </>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
