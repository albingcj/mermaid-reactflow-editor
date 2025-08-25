import Editor from '@monaco-editor/react';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { Button } from './ui/button';
import { Info } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  theme?: 'light' | 'dark';
}

export default function MermaidEditor({ value, onChange, theme = 'light' }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <i className="bi bi-file-code" />
          <span>Mermaid Source</span>
        </label>

        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" className="h-7 w-7 p-0">
              <Info className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>
            Edit mermaid code only — this editor accepts only Mermaid syntax (no markdown fences).
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex-1 px-3 pb-3">
        <div className="editor-container h-full rounded-md overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="markdown"
            language="markdown"
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            value={value}
            onChange={(val) => onChange(val ?? '')}
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
