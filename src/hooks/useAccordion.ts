import { useState, useCallback } from "react";

type AccordionSection = "editor" | "palette" | "saved";

export const useAccordion = () => {
  const [accordionOpen, setAccordionOpen] = useState<Record<AccordionSection, boolean>>({
    editor: true,
    palette: false,
    saved: false,
  });
  const [activeAccordion, setActiveAccordion] = useState<AccordionSection>("editor");

  const toggleAccordion = useCallback((section: AccordionSection) => {
    setAccordionOpen((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
    setActiveAccordion(section);
  }, []);

  return {
    accordionOpen,
    setAccordionOpen,
    activeAccordion,
    setActiveAccordion,
    toggleAccordion,
  };
};