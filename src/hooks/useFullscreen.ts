import { useState, useCallback } from "react";

export const useFullscreen = () => {
  const [fullscreenPanel, setFullscreenPanel] = useState<"code" | "preview" | "canvas" | null>(null);

  const toggleFullscreen = useCallback((panel: "code" | "preview" | "canvas") => {
    setFullscreenPanel(fullscreenPanel === panel ? null : panel);
  }, [fullscreenPanel]);

  return {
    fullscreenPanel,
    toggleFullscreen,
  };
};