import Editor from '@monaco-editor/react';
import { useEffect, useRef } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  theme?: 'light' | 'dark';
}

export default function MermaidEditor({ value, onChange, theme = 'light' }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<any | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (editorRef.current) {
        try { editorRef.current.layout(); } catch {}
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="px-3 py-2 flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <i className="bi bi-file-code" />
          <span>Mermaid Source</span>
        </label>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 p-0">
              <Info className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent sideOffset={6} align="center">
            Edit mermaid code only — this editor accepts only Mermaid syntax (no markdown fences).
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex-1 min-h-0 px-3 pb-3 overflow-hidden">
        <div ref={containerRef} className="editor-container h-full min-h-0 rounded-md overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="markdown"
            language="markdown"
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            value={value}
            onChange={(val) => onChange(val ?? '')}
            onMount={(editor) => {
              editorRef.current = editor;
              // Defer initial layout to after mount to ensure correct size
              requestAnimationFrame(() => {
                try { editor.layout(); } catch {}
              });
            }}
            options={{
              minimap: { enabled: false },
              wordWrap: 'on',
              fontSize: 13,
              lineNumbers: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              tabSize: 2,
            }}
          />
        </div>
      </div>
    </div>
  );
}
