// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Node } from 'reactflow';

interface SearchControlProps {
  nodes: Node[];
  onFocusNode: (nodeId: string) => void;
  onClose: () => void;
  isVisible: boolean;
}

interface SearchResult {
  id: string;
  label: string;
  type: 'node' | 'subgraph';
  position: { x: number; y: number };
}

export const SearchControl: React.FC<SearchControlProps> = ({
  nodes,
  onFocusNode,
  onClose,
  isVisible
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when component becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  // Search through nodes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setSelectedIndex(-1);
      return;
    }

    const searchResults: SearchResult[] = [];
    const term = searchTerm.toLowerCase();

    nodes.forEach(node => {
      const label = node.data?.label || node.id;
      const nodeType = node.type === 'group' ? 'subgraph' : 'node';
      
      if (label.toLowerCase().includes(term) || node.id.toLowerCase().includes(term)) {
        searchResults.push({
          id: node.id,
          label,
          type: nodeType,
          position: node.position
        });
      }
    });

    setResults(searchResults);
    setSelectedIndex(searchResults.length > 0 ? 0 : -1);
  }, [searchTerm, nodes]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev <= 0 ? results.length - 1 : prev - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelectResult(results[selectedIndex]);
      }
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    onFocusNode(result.id);
    setSearchTerm('');
    setResults([]);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      border: '1px solid #ddd',
      minWidth: '300px',
      maxWidth: '400px'
    }}>
      <div className="d-flex align-items-center p-2 border-bottom">
        {/* Search Icon SVG */}
        <span className="text-muted me-2" style={{ display: 'inline-flex', alignItems: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="7" cy="7" r="6" stroke="#888" strokeWidth="2" fill="none" />
            <line x1="11.5" y1="11.5" x2="15" y2="15" stroke="#888" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search nodes and subgraphs..."
          className="form-control form-control-sm border-0"
          style={{ outline: 'none', boxShadow: 'none' }}
        />
        <button
          onClick={onClose}
          className="btn btn-sm p-1 ms-2"
          style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Close"
        >
          {/* X Icon SVG */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="4" y1="4" x2="12" y2="12" stroke="#888" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="4" x2="4" y2="12" stroke="#888" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      
      {results.length > 0 && (
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {results.map((result, index) => (
            <div
              key={result.id}
              onClick={() => handleSelectResult(result)}
              className={`d-flex align-items-center p-2 cursor-pointer ${
                index === selectedIndex ? 'bg-primary text-white' : 'hover:bg-light'
              }`}
              style={{ 
                cursor: 'pointer',
                backgroundColor: index === selectedIndex ? '#0d6efd' : 'transparent'
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div
                className={`rounded d-flex align-items-center justify-content-center me-2 ${
                  index === selectedIndex ? 'bg-white text-primary' : 'bg-light text-muted'
                }`}
                style={{ width: '24px', height: '24px' }}
              >
                {/* Subgraph/Node Icon SVG or Unicode */}
                {result.type === 'subgraph' ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="4" width="12" height="8" rx="2" stroke="#888" strokeWidth="2" fill="#eee" />
                    <rect x="5" y="7" width="6" height="2" rx="1" stroke="#bbb" strokeWidth="1" fill="#fff" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="8" cy="8" r="6" stroke="#888" strokeWidth="2" fill="#eee" />
                  </svg>
                )}
              </div>
              <div className="flex-grow-1">
                <div className="fw-medium" style={{ fontSize: '13px' }}>
                  {result.label}
                </div>
                <small className={`${index === selectedIndex ? 'text-white-50' : 'text-muted'}`}>
                  {result.type} • {result.id}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {searchTerm && results.length === 0 && (
        <div className="p-3 text-center text-muted">
          {/* Search Icon SVG */}
          <span className="mb-2" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="7" cy="7" r="6" stroke="#bbb" strokeWidth="2" fill="none" />
              <line x1="11.5" y1="11.5" x2="15" y2="15" stroke="#bbb" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <div>No results found</div>
          <small>Try searching by node name or ID</small>
        </div>
      )}
      
      <div className="p-2 border-top bg-light" style={{ fontSize: '11px', color: '#666' }}>
        <div className="d-flex justify-content-between">
          <span>↑↓ Navigate • Enter Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
};
