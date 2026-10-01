"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "terang" | "gelap";

/** Toggle siang/malam monokrom — disimpan di localStorage, class "dark" di <html>. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("terang");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("relay-theme");
      if (saved === "gelap" || saved === "terang") {
        setTheme(saved);
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setTheme("gelap");
      }
    } catch {
      /* abaikan — tetap terang */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    if (theme === "gelap") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem("relay-theme", theme);
    } catch {
      /* abaikan */
    }
  }, [theme, ready]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "terang" ? "gelap" : "terang"));
  }, []);

  return { theme, toggle, ready };
}
