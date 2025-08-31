import { useState, useCallback, useEffect } from "react";

type ThemePreference = "system" | "light" | "dark";

export const useTheme = () => {
  const [themePref, setThemePref] = useState<ThemePreference>("system");
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">(() => {
    if (themePref === "light") return "light";
    if (themePref === "dark") return "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  // Load theme preference from localStorage
  useEffect(() => {
    try {
      const t = localStorage.getItem("mrfe.theme") as ThemePreference | null;
      if (t === "light" || t === "dark" || t === "system") setThemePref(t);
    } catch (e) {
      // ignore
    }
  }, []);

  // Apply theme to documentElement
  useEffect(() => {
    const root = document.documentElement;

    const applyThemeClass = (isDark: boolean) => {
      root.classList.remove("light", "dark");
      if (isDark) root.classList.add("dark");
      else root.classList.add("light");
    };

    if (themePref === "light") {
      applyThemeClass(false);
      try {
        localStorage.setItem("mrfe.theme", themePref);
      } catch (e) {}
      return () => root.classList.remove("light", "dark");
    }

    if (themePref === "dark") {
      applyThemeClass(true);
      try {
        localStorage.setItem("mrfe.theme", themePref);
      } catch (e) {}
      return () => root.classList.remove("light", "dark");
    }

    // system: follow the OS preference and keep it in sync
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    applyThemeClass(m.matches);
    const listener = (e: MediaQueryListEvent) => applyThemeClass(e.matches);
    if (m.addEventListener) m.addEventListener("change", listener);
    else m.addListener(listener as any);

    try {
      localStorage.setItem("mrfe.theme", themePref);
    } catch (e) {}

    return () => {
      if (m.removeEventListener) m.removeEventListener("change", listener);
      else m.removeListener(listener as any);
      root.classList.remove("light", "dark");
    };
  }, [themePref]);

  // Compute effective theme for components
  useEffect(() => {
    if (themePref === "light") setEffectiveTheme("light");
    else if (themePref === "dark") setEffectiveTheme("dark");
    else {
      const m = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = (e: MediaQueryListEvent) => setEffectiveTheme(e.matches ? "dark" : "light");
      setEffectiveTheme(m.matches ? "dark" : "light");
      if (m.addEventListener) m.addEventListener("change", listener);
      else m.addListener(listener as any);
      return () => {
        if (m.removeEventListener) m.removeEventListener("change", listener);
        else m.removeListener(listener as any);
      };
    }
  }, [themePref]);

  return {
    themePref,
    setThemePref,
    effectiveTheme,
  };
};