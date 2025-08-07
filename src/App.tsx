import React, { useState, useEffect } from 'react';
import { FlowDiagram } from './components/FlowDiagram';
import { extractMermaidDiagrams, MermaidDiagram } from './utils/mermaidParser';
import { convertMermaidToReactFlow, ReactFlowData } from './utils/mermaidToReactFlow';
import { saveDiagram, getAllDiagrams, deleteDiagram, exportToFile, SavedDiagram, getDiagram, updateDiagram } from './utils/diagramStorage';
import { Node, Edge } from 'reactflow';
import './App.css';

function App() {
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [diagrams, setDiagrams] = useState<MermaidDiagram[]>([]);
  const [selectedDiagram, setSelectedDiagram] = useState<number>(0);
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

  // Add keyboard shortcut for saving
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

  const handleStartRename = (diagram: SavedDiagram) => {
    setEditingDiagramId(diagram.id);
    setEditingName(diagram.name);
  };

  const handleCancelRename = () => {
    setEditingDiagramId(null);
    setEditingName('');
  };

  const handleSaveRename = (diagramId: string) => {
    if (editingName.trim()) {
      updateDiagram(diagramId, { name: editingName.trim() });
      setSavedDiagrams(getAllDiagrams());
      setEditingDiagramId(null);
      setEditingName('');
    }
  };

  const handleRenameKeyPress = (e: React.KeyboardEvent, diagramId: string) => {
    if (e.key === 'Enter') {
      handleSaveRename(diagramId);
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  return (
    <div className="app">
      <div className="sidebar">
        <h1>Mermaid to React Flow</h1>
        
        <div className="input-section">
          <h2>Input Markdown</h2>
          <div className="file-upload">
            <input
              type="file"
              accept=".md,.markdown"
              onChange={handleFileUpload}
              id="file-input"
            />
            <label htmlFor="file-input">Choose file</label>
          </div>
          
          <textarea
            value={markdownContent}
            onChange={handleTextareaChange}
            placeholder="Or paste your markdown content here..."
            rows={10}
          />
        </div>

        {diagrams.length > 0 && (
          <div className="diagrams-list">
            <h2>Found Diagrams ({diagrams.length})</h2>
            <ul>
              {diagrams.map((diagram, index) => (
                <li
                  key={index}
                  className={selectedDiagram === index ? 'selected' : ''}
                  onClick={() => setSelectedDiagram(index)}
                  title={diagram.name}
                >
                  {diagram.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {diagrams.length > 0 && selectedDiagram < diagrams.length && (
          <div className="diagram-code">
            <h3>Mermaid Code:</h3>
            <pre>{diagrams[selectedDiagram].code}</pre>
          </div>
        )}

        <div className="diagram-actions">
          <h2>Diagram Actions</h2>
          {currentDiagramId && (
            <div className="current-diagram-info">
              <small>Editing saved diagram</small>
            </div>
          )}
          <button onClick={handleSaveDiagram} disabled={flowData.nodes.length === 0}>
            {currentDiagramId ? 'Update Saved Diagram' : 'Save Current Diagram'}
          </button>
          <button onClick={handleExportDiagram} disabled={flowData.nodes.length === 0}>
            Export to File
          </button>
          <button onClick={() => setShowSavedDiagrams(!showSavedDiagrams)}>
            {showSavedDiagrams ? 'Hide' : 'Show'} Saved Diagrams ({savedDiagrams.length})
          </button>
        </div>

        {showSavedDiagrams && (
          <div className="saved-diagrams">
            <h3>Saved Diagrams</h3>
            {savedDiagrams.length === 0 ? (
              <p>No saved diagrams yet</p>
            ) : (
              <ul>
                {savedDiagrams.map(diagram => (
                  <li key={diagram.id}>
                    <div className="saved-diagram-item">
                      <div className="diagram-info">
                        {editingDiagramId === diagram.id ? (
                          <div className="diagram-name-edit">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => handleRenameKeyPress(e, diagram.id)}
                              onBlur={() => handleSaveRename(diagram.id)}
                              autoFocus
                              className="diagram-name-input"
                            />
                          </div>
                        ) : (
                          <strong 
                            onClick={() => handleStartRename(diagram)}
                            className="diagram-name-editable"
                            title="Click to rename"
                          >
                            {diagram.name}
                          </strong>
                        )}
                        <small>{new Date(diagram.updatedAt).toLocaleDateString()}</small>
                      </div>
                      <div className="diagram-actions-mini">
                        <button onClick={() => handleLoadDiagram(diagram)}>Load</button>
                        <button onClick={() => exportToFile(diagram)}>Export</button>
                        {editingDiagramId === diagram.id ? (
                          <>
                            <button onClick={() => handleSaveRename(diagram.id)} className="save-btn-mini">Save</button>
                            <button onClick={handleCancelRename} className="cancel-btn-mini">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleStartRename(diagram)} className="rename-btn">Rename</button>
                            <button onClick={() => handleDeleteDiagram(diagram.id)} className="delete-btn">Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="main-content">
        {loading && <div className="loading">Converting diagram...</div>}
        {!loading && flowData.nodes.length > 0 && (
          <FlowDiagram 
            nodes={flowData.nodes} 
            edges={flowData.edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
          />
        )}
        {!loading && flowData.nodes.length === 0 && diagrams.length === 0 && (
          <div className="placeholder">
            Upload a markdown file or paste content with Mermaid diagrams to visualize them
          </div>
        )}
      </div>
    </div>
  );
}

export default App;