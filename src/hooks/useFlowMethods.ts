import { useState, useCallback, useRef } from "react";
import { Node, Edge } from "reactflow";

interface FlowMethods {
  openSearch?: () => void;
  exportImage?: () => Promise<void>;
  selectSubgraphContents?: (id?: string) => void;
}

export const useFlowMethods = () => {
  const flowMethodsRef = useRef<FlowMethods | null>(null);

  const registerFlowMethods = useCallback((methods: FlowMethods | {}) => {
    if (!methods || Object.keys(methods).length === 0) {
      flowMethodsRef.current = null;
    } else {
      flowMethodsRef.current = methods as FlowMethods;
    }
  }, []);

  return {
    flowMethodsRef,
    registerFlowMethods,
  };
};