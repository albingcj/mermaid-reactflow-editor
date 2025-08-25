// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import mermaid from 'mermaid';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Button } from './ui/button';
import { Info } from 'lucide-react';
// AlertTriangle import removed; using inline error block now

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const uniqueId = useRef(`mermaid-svg-${Math.random().toString(36).substr(2, 9)}`).current;

  // Constants for consistent zoom limits
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 500; // 50000%

  // Wheel and pinch zoom handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let lastTouchDistance: number | null = null;

    const handleWheel = (e: WheelEvent) => {
      // Pinch gesture on touchpad: ctrlKey is true
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY;
        setZoom(prev => {
          let next = prev * (delta > 0 ? 1.1 : 0.9);
          next = Math.max(MIN_ZOOM, Math.min(next, MAX_ZOOM)); // Fixed: Use MAX_ZOOM constant
          if (next <= 1) setPan({ x: 0, y: 0 });
          return next;
        });
      } else if (e.deltaY !== 0) {
        // Normal scroll to zoom (like React Flow)
        e.preventDefault();
        setZoom(prev => {
          let next = prev * (e.deltaY < 0 ? 1.1 : 0.9);
          next = Math.max(MIN_ZOOM, Math.min(next, MAX_ZOOM)); // Fixed: Use MAX_ZOOM constant
          if (next <= 1) setPan({ x: 0, y: 0 });
          return next;
        });
      }
    };

    // Touch pinch zoom (mobile)
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastTouchDistance !== null) {
          const delta = dist - lastTouchDistance;
          setZoom(prev => {
            let next = prev * (delta > 0 ? 1.02 : 0.98);
            next = Math.max(MIN_ZOOM, Math.min(next, MAX_ZOOM)); // Fixed: Use MAX_ZOOM constant
            if (next <= 1) setPan({ x: 0, y: 0 });
            return next;
          });
        }
        lastTouchDistance = dist;
      }
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) lastTouchDistance = null;
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Safari/iOS gesture events (optional, fallback)
    const handleGesture = (e: any) => {
      e.preventDefault();
      setZoom(prev => {
        let next = prev * e.scale;
        next = Math.max(MIN_ZOOM, Math.min(next, MAX_ZOOM)); // Fixed: Use MAX_ZOOM constant
        if (next <= 1) setPan({ x: 0, y: 0 });
        return next;
      });
    };
    container.addEventListener('gesturechange', handleGesture, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('gesturechange', handleGesture);
    };
  }, [MIN_ZOOM, MAX_ZOOM]); // Added dependencies

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            setZoom(prev => {
              let next = prev * 1.2;
              if (next > MAX_ZOOM) next = MAX_ZOOM;
              return next;
            });
            break;
          case '-':
            e.preventDefault();
            setZoom(prev => {
              let next = prev / 1.2;
              if (next < MIN_ZOOM) next = MIN_ZOOM;
              if (next <= 1) setPan({ x: 0, y: 0 });
              return next;
            });
            break;
          case '0':
            e.preventDefault();
            setZoom(1);
            setPan({ x: 0, y: 0 });
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [MIN_ZOOM, MAX_ZOOM]);

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
      // clear any previous error and show empty placeholder
      setErrorMessage(null);
      ref.current.innerHTML = '<span style="color: #888;">No Mermaid code to render.</span>';
      return;
    }

    const removeInjectedMermaidDivs = () => {
      try {
        const injected = document.querySelectorAll('[id^="dmermaid-svg-"]');
        injected.forEach((el) => {
          // avoid removing any nodes that are inside our renderer container
          if (!ref.current || !ref.current.contains(el)) {
            el.remove();
          }
        });
      } catch (e) {
        // defensive: ignore DOM errors
        // eslint-disable-next-line no-console
        console.warn('removeInjectedMermaidDivs failed', e);
      }
    };

    const renderDiagram = async () => {
      // reset any prior error
      setErrorMessage(null);
      try {
        // cleanup any previous injected nodes before rendering
        removeInjectedMermaidDivs();
        const { svg } = await mermaid.render(uniqueId, code);
        if (ref.current) {
          ref.current.innerHTML = svg;

          // Post-render adjustments so the SVG centers inside our flex container.
          // Mermaid sometimes injects fixed width/height or wrapper divs that push the
          // content to the top-left. Normalize common attributes/styles here.
          try {
            const svgEl = ref.current.querySelector('svg');
            if (svgEl) {
              svgEl.style.maxWidth = '100%';
              svgEl.style.height = 'auto';
              svgEl.style.display = 'block';
              svgEl.style.margin = 'auto';
              svgEl.removeAttribute('width');
              svgEl.removeAttribute('height');
            }

            // Also ensure any top-level wrapper doesn't force alignment
            const wrapper = ref.current.firstElementChild as HTMLElement | null;
            if (wrapper && wrapper !== svgEl) {
              wrapper.style.display = 'block';
              wrapper.style.margin = 'auto';
              wrapper.style.maxWidth = '100%';
              wrapper.style.height = 'auto';
            }
          } catch (e) {
            // ignore DOM errors
          }
        }
        // Successful render -> clear any previous error message
        setErrorMessage(null);
        // cleanup any stray injected nodes created outside this container
        removeInjectedMermaidDivs();
      } catch (err) {
        console.error('MermaidRenderer: Error rendering diagram', err);
        // clear content and capture error message
        if (ref.current) {
          ref.current.innerHTML = '';
          removeInjectedMermaidDivs();
        }
        setErrorMessage(String(err));
      }
    };

    renderDiagram();
  }, [code, isInitialized, uniqueId]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // allow panning at any zoom level (user expects to be able to grab/move)
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    e.preventDefault();
  }, [pan.x, pan.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart.x, dragStart.y]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleZoomIn = () => {
    setZoom(prev => {
      let next = prev * 1.2;
      if (next > MAX_ZOOM) next = MAX_ZOOM;
      return next;
    });
  };
  
  const handleZoomOut = () => {
    setZoom(prev => {
      let next = prev / 1.2;
      if (next < MIN_ZOOM) next = MIN_ZOOM;
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
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
    cursor: isDragging ? 'grabbing' : 'grab',
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
          pointerEvents: zoom > 1 ? 'none' : 'auto',
        }}
      >
        {/* make the inner container a flexbox so the injected SVG can be centered */}
        <div
          ref={ref}
          style={{
            pointerEvents: 'auto',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto',
          }}
        />
      </div>

      {/* Error overlay: absolute over the preview so ref remains mounted and mermaid can update it */}
      {errorMessage && (
        <div
          className="bg-destructive/10 text-destructive rounded-md p-4 m-4 overflow-auto text-sm whitespace-pre-wrap"
          style={{
            position: 'absolute',
            inset: '1rem',
            zIndex: 50,
            pointerEvents: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {errorMessage}
        </div>
      )}
      
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
          disabled={zoom >= MAX_ZOOM - 1e-6}
        >
          {/* Zoom In SVG */}
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="7" cy="7" r="6" stroke="#888" strokeWidth="2" fill="none" />
            <line x1="11.5" y1="11.5" x2="15" y2="15" stroke="#888" strokeWidth="2" strokeLinecap="round" />
            <line x1="7" y1="4" x2="7" y2="10" stroke="#888" strokeWidth="2" strokeLinecap="round" />
            <line x1="4" y1="7" x2="10" y2="7" stroke="#888" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <button 
          onClick={handleZoomOut} 
          className="btn btn-sm btn-outline-secondary p-1" 
          style={{ width: '32px', height: '32px' }}
          title="Zoom Out"
          disabled={zoom <= MIN_ZOOM + 1e-6}
        >
          {/* Zoom Out SVG */}
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="7" cy="7" r="6" stroke="#888" strokeWidth="2" fill="none" />
            <line x1="11.5" y1="11.5" x2="15" y2="15" stroke="#888" strokeWidth="2" strokeLinecap="round" />
            <line x1="4" y1="7" x2="10" y2="7" stroke="#888" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <button 
          onClick={handleZoomReset} 
          className="btn btn-sm btn-outline-secondary p-1" 
          style={{ width: '32px', height: '32px' }}
          title="Reset Zoom"
        >
          {/* Aspect Ratio SVG */}
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="4" width="12" height="8" rx="2" stroke="#888" strokeWidth="2" fill="none" />
            <rect x="5" y="7" width="6" height="2" rx="1" stroke="#bbb" strokeWidth="1" fill="#eee" />
          </svg>
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

      {/* Help tooltip */}
      <div style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 1000 }}>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Info className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent sideOffset={6} align="center">
            <div style={{ fontSize: 12, lineHeight: 1.4 }}>
              <div><strong>Scroll:</strong> Zoom in/out</div>
              <div><strong>Drag:</strong> Pan when zoomed</div>
              <div><strong>Ctrl +/-:</strong> Zoom shortcuts</div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
