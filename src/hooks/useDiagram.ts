import { useState, useCallback, useRef } from "react";
import { Node, Edge } from "reactflow";
import { convertMermaidToReactFlow, ReactFlowData } from "@/utils/mermaidToReactFlow";

export interface SavedDiagram {
  id: string;
  name: string;
  mermaid: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: number;
  updatedAt: number;
}

export const useDiagram = () => {
  const [mermaidSource, setMermaidSource] = useState("");
  const [flowData, setFlowData] = useState<ReactFlowData>({
    nodes: [],
    edges: [],
  });
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
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