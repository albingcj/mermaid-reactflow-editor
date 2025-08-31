import { useState, useCallback } from "react";
import { FULLSCREEN_PANELS, FullscreenPanel } from "@/constants";

export const useFullscreen = () => {
  const [fullscreenPanel, setFullscreenPanel] = useState<FullscreenPanel | null>(null);

  const toggleFullscreen = useCallback((panel: FullscreenPanel) => {
    setFullscreenPanel(fullscreenPanel === panel ? null : panel);
  }, [fullscreenPanel]);

  return {
    fullscreenPanel,
    toggleFullscreen,
  };
};