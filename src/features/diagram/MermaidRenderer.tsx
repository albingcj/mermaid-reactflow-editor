// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import mermaid from 'mermaid';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
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
  const baseScaleRef = useRef(1);
  const [fitTick, setFitTick] = useState(0);
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

    // Scope cleanup to the specific temp div Mermaid may create for this id ("d" + uniqueId)
    const removeInjectedMermaidDivs = () => {
      try {
        const tempId = `d${uniqueId}`;
        const injected = document.getElementById(tempId);
        if (injected && (!ref.current || !ref.current.contains(injected))) {
          injected.remove();
        }
      } catch (e) {
        // defensive: ignore DOM errors
        // eslint-disable-next-line no-console
        console.warn('removeInjectedMermaidDivs failed', e);
      }
    };

    const fitToContainer = () => {
      if (!containerRef.current || !ref.current) return;
      const svgEl = ref.current.querySelector('svg') as SVGSVGElement | null;
      if (!svgEl) return;

      // Read natural size from viewBox when available
      let svgW = 0;
      let svgH = 0;
      const vb = svgEl.viewBox && typeof svgEl.viewBox.baseVal !== 'undefined' ? svgEl.viewBox.baseVal : null;
      if (vb && vb.width && vb.height) {
        svgW = vb.width;
        svgH = vb.height;
      } else {
        try {
          const bbox = svgEl.getBBox();
          svgW = bbox.width;
          svgH = bbox.height;
        } catch {
          const rect = svgEl.getBoundingClientRect();
          svgW = rect.width || 1;
          svgH = rect.height || 1;
        }
      }

      const cw = containerRef.current.clientWidth || 1;
      const ch = containerRef.current.clientHeight || 1;
      // Guard values; if invalid sizes, keep scale 1
      if (!isFinite(svgW) || !isFinite(svgH) || svgW <= 0 || svgH <= 0) {
        baseScaleRef.current = 1;
        return;
      }
  const scale = Math.max(0.05, Math.min(cw / svgW, ch / svgH));
  baseScaleRef.current = scale;
  // trigger a re-render so outer transform picks up the new base scale
  setFitTick((t) => t + 1);

  // Do not force huge intrinsic layout sizes; rely on outer transform and max constraints
      svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svgEl.style.display = 'block';
  ;(svgEl as any).style.margin = 'auto';
  svgEl.style.width = 'auto';
  svgEl.style.height = 'auto';
  svgEl.style.maxWidth = '100%';
  svgEl.style.maxHeight = '100%';
    };

  let cancelled = false;
  const renderDiagram = async () => {
      // reset any prior error
      setErrorMessage(null);
      try {
        // cleanup any previous injected nodes before rendering
        removeInjectedMermaidDivs();
  // Render into our own container to avoid Mermaid creating global temp nodes
  const { svg } = await mermaid.render(uniqueId, code, undefined, ref.current || undefined);
    if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          // Fit after render and layout
          requestAnimationFrame(() => fitToContainer());
        }
        // Successful render -> clear any previous error message
        setErrorMessage(null);
        // cleanup any stray injected nodes created outside this container
        removeInjectedMermaidDivs();
      } catch (err) {
        // console.error('MermaidRenderer: Error rendering diagram', err);
        // clear content and capture error message
    if (!cancelled && ref.current) {
          ref.current.innerHTML = '';
          removeInjectedMermaidDivs();
        }
        setErrorMessage(String(err));
      }
    };

    renderDiagram();
    // Recompute fit on container resize
  const ro = new ResizeObserver(() => {
      fitToContainer();
    });
    if (containerRef.current) ro.observe(containerRef.current);
  // Also observe the SVG element itself for late size changes
  const svgEl = ref.current?.querySelector('svg') as SVGSVGElement | null;
  if (svgEl) ro.observe(svgEl);
    return () => {
      cancelled = true;
      try { ro.disconnect(); } catch {}
    };
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
          transform: (() => {
            const scale = Math.max(0.05, (baseScaleRef.current || 1) * zoom);
            return `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`;
          })(),
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
      maxWidth: '100%',
      maxHeight: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
      overflow: 'hidden',
  contain: 'layout paint size style',
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
        zIndex: 50,
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
          zIndex: 50,
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
