import { useState, useCallback, useRef } from "react";
import { Node, Edge } from "reactflow";
import { convertMermaidToReactFlow, ReactFlowData } from "@/features/diagram/converter";
import { DEFAULT_AI_SETTINGS } from "@/constants";

export interface SavedDiagram {
  id: string;
  name: string;
  mermaid: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: number;
  updatedAt: number;
}

export interface UseDiagramReturn {
  mermaidSource: string;
  setMermaidSource: (source: string) => void;
  flowData: ReactFlowData;
  setFlowData: (data: ReactFlowData) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  savedDiagrams: SavedDiagram[];
  setSavedDiagrams: (diagrams: SavedDiagram[]) => void;
  lastAppliedMermaidRef: React.MutableRefObject<string>;
  convertMermaid: (source: string) => Promise<void>;
}

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
      console.error('Conversion failed', err);
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