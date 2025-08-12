import React from 'react';
import mermaid from 'mermaid';



export interface MermaidRendererProps {
  code: string;
  className?: string;
  style?: React.CSSProperties;
}


export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ code, className, style }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);
  // Use a stable unique id for the life of the component
  const uniqueId = React.useRef(`mermaid-svg-${Math.random().toString(36).substr(2, 9)}`).current;

  // Initialize mermaid once
  React.useEffect(() => {
    if (!isInitialized) {
      mermaid.initialize({ 
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
      });
      setIsInitialized(true);
      // eslint-disable-next-line no-console
      console.debug('MermaidRenderer: initialized mermaid');
    }
  }, [isInitialized]);

  React.useEffect(() => {
    if (!isInitialized || !ref.current) {
      // eslint-disable-next-line no-console
      console.warn('MermaidRenderer: not initialized or ref not set', { isInitialized, hasRef: !!ref.current });
      return;
    }
    
    ref.current.innerHTML = '';
    // eslint-disable-next-line no-console
    console.debug('MermaidRenderer: rendering', { code, uniqueId });
    
    if (!code || code.trim() === '') {
      ref.current.innerHTML = '<span style="color: #888;">No Mermaid code to render.</span>';
      // eslint-disable-next-line no-console
      console.warn('MermaidRenderer: No code provided');
      return;
    }

    const renderDiagram = async () => {
      try {
        // eslint-disable-next-line no-console
        console.debug('MermaidRenderer: calling mermaid.render', { uniqueId, code });
        const { svg } = await mermaid.render(uniqueId, code);
        if (ref.current) {
          ref.current.innerHTML = svg;
          // eslint-disable-next-line no-console
          console.debug('MermaidRenderer: SVG rendered successfully', { svgLength: svg.length });
        } else {
          // eslint-disable-next-line no-console
          console.warn('MermaidRenderer: ref.current became null during render');
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('MermaidRenderer: Error rendering diagram', err);
        if (ref.current) {
          ref.current.innerHTML = `<pre style='color:red; font-size: 12px; padding: 8px;'>Mermaid Error: ${String(err)}</pre>`;
        }
      }
    };

    renderDiagram();
  }, [code, isInitialized, uniqueId]);

  return <div ref={ref} className={className} style={style} />;
};

