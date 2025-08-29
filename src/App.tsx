import { useEffect, useState } from "react";
import { useDiagram } from "@/hooks/useDiagram";
import { useTheme } from "@/hooks/useTheme";
import { usePanelVisibility } from "@/hooks/usePanelVisibility";
import { useAccordion } from "@/hooks/useAccordion";
import { useToast } from "@/hooks/useToast";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useDialog } from "@/hooks/useDialog";
import { useNodeSelection } from "@/hooks/useNodeSelection";
import { AppUI } from "@/components/AppUI";

function App() {
  // Custom hooks for state management
  const diagram = useDiagram();
  const theme = useTheme();
  const panel = usePanelVisibility();
  const accordion = useAccordion();
  const toast = useToast();
  const fullscreen = useFullscreen();
  const dialog = useDialog();
  const nodeSelection = useNodeSelection();
  
  // AI settings state
  const [aiSettings, setAiSettings] = useState({
    apiKey: "",
    model: "gemini-2.0-flash",
    isEditingSettings: false,
    provider: "google",
  });
  
  const [aiPrompt, setAiPrompt] = useState("");

  // Convert mermaid when source changes
  useEffect(() => {
    if (diagram.mermaidSource.trim() && diagram.mermaidSource !== diagram.lastAppliedMermaidRef.current) {
      diagram.convertMermaid(diagram.mermaidSource);
    }
  }, [diagram.mermaidSource, diagram.convertMermaid, diagram.lastAppliedMermaidRef]);

  // Load saved diagrams from sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("mrfe.savedDiagrams");
      if (raw) {
        const parsed = JSON.parse(raw) as any[];
        diagram.setSavedDiagrams(parsed);
      }
    } catch (e) {
      console.warn("Failed to load saved diagrams from sessionStorage", e);
    }
  }, []);

  return (
    <AppUI
      diagram={diagram}
      theme={theme}
      panel={panel}
      accordion={accordion}
      toast={toast}
      fullscreen={fullscreen}
      dialog={dialog}
      nodeSelection={nodeSelection}
      aiSettings={aiSettings}
      setAiSettings={setAiSettings}
      aiPrompt={aiPrompt}
      setAiPrompt={setAiPrompt}
    />
  );
}

export default App;