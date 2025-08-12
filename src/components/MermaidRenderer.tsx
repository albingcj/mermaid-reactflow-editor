import React, { useState, useRef, useEffect, useCallback } from 'react';
import mermaid from 'mermaid';

export interface MermaidRendererProps {
  code: string;
  className?: string;
  style?: React.CSSProperties;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ code, className, style }) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const uniqueId = useRef(`mermaid-svg-${Math.random().toString(36).substr(2, 9)}`).current;

  useEffect(() => {
    if (!isInitialized) {
      mermaid.initialize({ 
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
      });
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    if (!isInitialized || !ref.current) {
      return;
    }
    
    ref.current.innerHTML = '';
    
    if (!code || code.trim() === '') {
      ref.current.innerHTML = '<span style="color: #888;">No Mermaid code to render.</span>';
      return;
    }

    const renderDiagram = async () => {
      try {
        const { svg } = await mermaid.render(uniqueId, code);
        if (ref.current) {
          ref.current.innerHTML = svg;
        }
      } catch (err) {
        console.error('MermaidRenderer: Error rendering diagram', err);
        if (ref.current) {
          ref.current.innerHTML = `<pre style='color:red; font-size: 12px; padding: 8px;'>Mermaid Error: ${String(err)}</pre>`;
        }
      }
    };

    renderDiagram();
  }, [code, isInitialized, uniqueId]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return; // Only allow panning when zoomed in
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    e.preventDefault();
  }, [zoom, pan.x, pan.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart.x, dragStart.y, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 500)); // Max zoom of 500x (50000%)
  };
  
  const handleZoomOut = () => {
    const newZoom = zoom / 1.2;
    setZoom(newZoom);
    if (newZoom <= 1) {
      setPan({ x: 0, y: 0 }); // Reset pan when zoomed out
    }
  };
  
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div 
      ref={containerRef}
      className={className} 
      style={{ 
        ...style, 
        position: 'relative', 
        overflow: 'hidden', 
        width: '100%', 
        height: '100%',
        cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div 
        style={{ 
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, 
          transformOrigin: 'center center', 
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: zoom > 1 ? 'none' : 'auto', // Prevent SVG interactions when panning
        }}
      >
        <div ref={ref} style={{ pointerEvents: 'auto' }} />
      </div>
      
      {/* Fixed position zoom controls */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        zIndex: 1000,
        display: 'flex',
        gap: '5px',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '8px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <button 
          onClick={handleZoomIn} 
          className="btn btn-sm btn-outline-secondary p-1" 
          style={{ width: '32px', height: '32px' }}
          title="Zoom In"
        >
          <i className="bi bi-zoom-in"></i>
        </button>
        <button 
          onClick={handleZoomOut} 
          className="btn btn-sm btn-outline-secondary p-1" 
          style={{ width: '32px', height: '32px' }}
          title="Zoom Out"
        >
          <i className="bi bi-zoom-out"></i>
        </button>
        <button 
          onClick={handleZoomReset} 
          className="btn btn-sm btn-outline-secondary p-1" 
          style={{ width: '32px', height: '32px' }}
          title="Reset Zoom"
        >
          <i className="bi bi-aspect-ratio"></i>
        </button>
      </div>
      
      {/* Zoom level indicator */}
      {zoom !== 1 && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
};

