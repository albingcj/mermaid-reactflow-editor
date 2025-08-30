import { useState, useCallback, useEffect } from "react";
import { PANEL_TYPES, PanelType } from "@/constants";

export const usePanelVisibility = () => {
  const [visiblePanels, setVisiblePanels] = useState({
    [PANEL_TYPES.CODE]: true,
    [PANEL_TYPES.PREVIEW]: true,
    [PANEL_TYPES.CANVAS]: true,
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
        return panel === PANEL_TYPES.CANVAS ? base + 1 : base;
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