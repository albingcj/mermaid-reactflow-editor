import { useState, useCallback } from "react";

export const useDialog = () => {
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [showAiGenerator, setShowAiGenerator] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const openLoadDialog = useCallback(() => {
    setShowLoadDialog(true);
  }, []);

  const closeLoadDialog = useCallback(() => {
    setShowLoadDialog(false);
  }, []);

  const openClearDialog = useCallback(() => {
    setClearDialogOpen(true);
  }, []);

  const closeClearDialog = useCallback(() => {
    setClearDialogOpen(false);
  }, []);

  const openProperties = useCallback(() => {
    setIsPropertiesOpen(true);
  }, []);

  const closeProperties = useCallback(() => {
    setIsPropertiesOpen(false);
  }, []);

  const toggleAiGenerator = useCallback(() => {
    setShowAiGenerator(prev => !prev);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  return {
    showLoadDialog,
    clearDialogOpen,
    isPropertiesOpen,
    showAiGenerator,
    isMobileMenuOpen,
    openLoadDialog,
    closeLoadDialog,
    openClearDialog,
    closeClearDialog,
    openProperties,
    closeProperties,
    toggleAiGenerator,
    toggleMobileMenu,
  };
};