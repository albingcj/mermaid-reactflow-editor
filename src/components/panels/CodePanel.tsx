import { Button, Card } from "@/components/ui";
import MermaidEditor from "@/features/editor/MermaidEditor";
import GeminiMermaidGenerator from "@/features/ai/GeminiMermaidGenerator";
import { Code2, Sparkles, X, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UseDiagramReturn, UseToastReturn, EffectiveTheme } from "@/types";
import { AISettings } from "@/components/AppUI";

export interface CodePanelProps {
  diagram: UseDiagramReturn;
  theme: EffectiveTheme;
  toast: UseToastReturn;
  showAiGenerator: boolean;
  toggleAiGenerator: () => void;
  toggleFullscreen: () => void;
  onClose: () => void;
  aiSettings: AISettings;
  setAiSettings: React.Dispatch<React.SetStateAction<AISettings>>;
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
  isFullscreen?: boolean;
}

export function CodePanel({
  diagram,
  theme,
  toast,
  showAiGenerator,
  toggleAiGenerator,
  toggleFullscreen,
  onClose,
  aiSettings,
  setAiSettings,
  aiPrompt,
  setAiPrompt,
  isFullscreen = false,
}: CodePanelProps) {
  return (
    <>
      <div className="p-2 border-b flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4" />
          <span className="font-medium text-sm">Code Editor</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAiGenerator}
            className={cn(
              "h-6 w-6 p-0 hover:scale-105 transition-all duration-200",
              showAiGenerator && "bg-primary/20 text-primary",
            )}
            title="AI Generate"
          >
            <Sparkles className="h-3 w-3" />
          </Button>
          {!isFullscreen && (
            <>
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
            </>
          )}
        </div>
      </div>

      {showAiGenerator && (
        <div className="p-3 border-b bg-gradient-to-r dark:from-primary/5 dark:to-primary/10 border-primary/20 animate-in slide-in-from-top-2 duration-300 flex-shrink-0">
          <GeminiMermaidGenerator
            onStart={() => diagram.setIsStreaming(true)}
            onStop={() => diagram.setIsStreaming(false)}
            apiKey={aiSettings.apiKey}
            model={aiSettings.model}
            userInput={aiPrompt}
            onApiKeyChange={(v: string) => setAiSettings((s) => ({ ...s, apiKey: v }))}
            onModelChange={(v: string) => setAiSettings((s) => ({ ...s, model: v }))}
            onUserInputChange={(v: string) => setAiPrompt(v)}
            onClose={() => {}}
            onChunk={(partial: string) => {
              diagram.setMermaidSource(partial);
            }}
            onComplete={(result: string) => {
              diagram.setMermaidSource(result);
              toast.showToast('Mermaid generation complete — applied to editor', 'success');
            }}
          />
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <MermaidEditor
          value={diagram.mermaidSource}
          theme={theme}
          onChange={(v: string) => {
            diagram.setMermaidSource(v);
          }}
        />
      </div>
    </>
  );
}
