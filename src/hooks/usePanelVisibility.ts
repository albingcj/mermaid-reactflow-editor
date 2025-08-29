import { useState, useCallback, useEffect } from "react";

type PanelType = "code" | "preview" | "canvas";

export const usePanelVisibility = () => {
  const [visiblePanels, setVisiblePanels] = useState({
    code: true,
    preview: true,
    canvas: true,
  });

  const togglePanelVisibility = useCallback((panel: PanelType) => {
    setVisiblePanels((prev) => ({
      ...prev,
      [panel]: !prev[panel],
    }));
  }, []);

  const visiblePanelCount = Object.values(visiblePanels).filter(Boolean).length;

  const getDefaultPanelSize = useCallback(
    (panel: PanelType) => {
      const base = Math.floor(100 / visiblePanelCount);
      if (visiblePanelCount === 3) {
        // prefer canvas to be slightly larger to avoid a 99% total
        return panel === "canvas" ? base + 1 : base;
      }
      return base;
    },
    [visiblePanelCount]
  );

  return {
    visiblePanels,
    togglePanelVisibility,
    visiblePanelCount,
    getDefaultPanelSize,
  };
};