"use client";

import type { BotStatus } from "@/lib/types";
import { STATUS_LABEL } from "./ConfigPanel";

interface StatusStripProps {
  status: BotStatus;
  /** Ringkasan slot aktif, mis. "Slot 2 — …345678" atau "Slot 1 (kosong)". */
  slotText: string;
  /** Jumlah karakter pesan yang sedang diketik; disembunyikan bila 0. */
  charCount: number;
}

/** Baris status tipis: status bot · slot aktif · panjang pesan. */
export function StatusStrip({ status, slotText, charCount }: StatusStripProps) {
  return (
    <p className="sketch break-words px-3 py-1 text-xs leading-5" role="status" aria-live="polite">
      <span className="font-bold" aria-hidden="true">
        ❯
      </span>{" "}
      <span className="font-semibold">{STATUS_LABEL[status]}</span>
      <span className="opacity-60"> · </span>
      <span>{slotText}</span>
      {charCount > 0 && (
        <>
          <span className="opacity-60"> · </span>
          <span>{charCount} karakter</span>
        </>
      )}
    </p>
  );
}
