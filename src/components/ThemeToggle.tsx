"use client";

import { useTheme } from "@/hooks/useTheme";

/** Tombol toggle siang/malam — murni monokrom, hanya ikon matahari/bulan ASCII-sketsa. */
export function ThemeToggle() {
  const { theme, toggle, ready } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "terang" ? "Aktifkan mode gelap" : "Aktifkan mode terang"}
      title={theme === "terang" ? "Aktifkan mode gelap" : "Aktifkan mode terang"}
      className="sketch-btn px-4 py-2 text-sm font-semibold tracking-wide"
    >
      {ready ? (theme === "terang" ? "☾ malam" : "☀ siang") : "…"}
    </button>
  );
}
