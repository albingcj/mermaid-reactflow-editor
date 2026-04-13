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
  const [conversionError, setConversionError] = useState<string | null>(null);
  const lastAppliedMermaidRef = useRef<string>("");

  const convertMermaid = useCallback(async (source: string) => {
    if (!source.trim()) return;
    
    setLoading(true);
    setConversionError(null);
    try {
      const data = await convertMermaidToReactFlow(source);
      setFlowData(data);
      lastAppliedMermaidRef.current = source;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      logger.error('Conversion failed', err);
      setConversionError(`Failed to convert diagram: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearConversionError = useCallback(() => {
    setConversionError(null);
  }, []);

  const updateMermaidSource = useCallback((source: string) => {
    setMermaidSource(source);
    // Clear error when user starts editing
    if (conversionError) {
      setConversionError(null);
    }
  }, [conversionError]);

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
    conversionError,
    clearConversionError,
  };
};