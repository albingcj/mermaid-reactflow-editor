import { useState, useCallback } from "react";

export const useToast = () => {
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" | "info"; duration?: number }[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error" | "info", duration: number = 2400) => {
    setToasts((ts) => [
      ...ts,
      { id: Math.random().toString(36).slice(2), message, type, duration },
    ]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  return {
    toasts,
    showToast,
    dismissToast,
  };
};