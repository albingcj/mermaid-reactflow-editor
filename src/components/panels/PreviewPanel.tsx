import { Button, Card, Popover, PopoverTrigger, PopoverContent } from "@/components/ui";
import { MermaidRenderer } from "@/features/diagram/MermaidRenderer";
import { Eye, X, Maximize2, FileText, Info } from "lucide-react";

export interface PreviewPanelProps {
  mermaidSource: string;
  toggleFullscreen: () => void;
  onClose: () => void;
  isFullscreen?: boolean;
}

export function PreviewPanel({
  mermaidSource,
  toggleFullscreen,
  onClose,
  isFullscreen = false,
}: PreviewPanelProps) {
  return (
    <>
      <div className="p-2 border-b flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          <span className="font-medium text-sm">Mermaid Preview</span>
        </div>
        {!isFullscreen && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:scale-105 transition-transform"
              onClick={toggleFullscreen}
              title="Fullscreen"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:scale-105 transition-transform"
              onClick={onClose}
              title="Close Panel"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 flex flex-col min-h-0">
        <Card className="flex-1 min-h-0 p-4 flex items-center justify-center bg-muted/30 hover:bg-muted/40 transition-colors">
          {mermaidSource ? (
            <MermaidRenderer code={mermaidSource} className="w-full h-full min-h-0" />
          ) : (
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <div className="flex items-center justify-center gap-2">
                <p className="sr-only">Mermaid Preview</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Info className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent sideOffset={6} align="center">
                    Live preview will render here once Mermaid code is present.
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
