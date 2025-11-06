import { useState, useCallback, useRef } from "react";
import { convertMermaidToReactFlow, ReactFlowData } from "@/features/diagram/converter";
import { DEFAULT_AI_SETTINGS } from "@/constants";
import type { SavedDiagram, UseDiagramReturn } from "@/types/hooks";
import { logger } from "@/lib/logger";

// Re-export types for backward compatibility
export type { SavedDiagram, UseDiagramReturn } from "@/types/hooks";

export const useDiagram = (): UseDiagramReturn => {
  const [mermaidSource, setMermaidSource] = useState<string>("");
  const [flowData, setFlowData] = useState<ReactFlowData>({
    nodes: [],
    edges: [],
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [savedDiagrams, setSavedDiagrams] = useState<SavedDiagram[]>([]);
  const lastAppliedMermaidRef = useRef<string>("");

  const convertMermaid = useCallback(async (source: string) => {
    if (!source.trim()) return;
    
    setLoading(true);
    try {
      const data = await convertMermaidToReactFlow(source);
      setFlowData(data);
      lastAppliedMermaidRef.current = source;
    } catch (err) {
      logger.error('Conversion failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMermaidSource = useCallback((source: string) => {
    setMermaidSource(source);
    // We'll trigger conversion separately to have better control
  }, []);

  return {
    mermaidSource,
    setMermaidSource: updateMermaidSource,
    flowData,
    setFlowData,
    loading,
    setLoading,
    isStreaming,
    setIsStreaming,
    savedDiagrams,
    setSavedDiagrams,
    lastAppliedMermaidRef,
    convertMermaid,
  };
};