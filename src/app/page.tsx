"use client";

import { useState } from "react";
import { ConfigPanel } from "@/components/ConfigPanel";
import { Footer } from "@/components/Footer";
import { SendPanel } from "@/components/SendPanel";
import { StatusStrip } from "@/components/StatusStrip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useBotConfig } from "@/hooks/useBotConfig";

/** Halaman utama Relay: header + status + konfigurasi bot + kirim pesan + footer. */
export default function Home() {
  const config = useBotConfig();
  const { savedToken, savedChannelId, hasSavedConfig, status, lastCheck, slots, activeSlotId } = config;
  // Isi pesan diangkat ke page agar baris status bisa menampilkan jumlah karakter.
  const [message, setMessage] = useState("");

  const activeSlot = slots.find((s) => s.id === activeSlotId);
  const activeLabel = activeSlot?.label.trim() || `Slot ${activeSlotId}`;
  const activeTail = activeSlot?.channelId.trim() ?? "";
  const slotText = activeTail ? `${activeLabel} — …${activeTail.slice(-6)}` : `${activeLabel} (kosong)`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      {/* Kepala halaman */}
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className="sketch flex h-12 w-12 shrink-0 items-center justify-center"
            aria-hidden="true"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </span>
          <div>
            <h1 className="font-hand text-6xl leading-none">Relay</h1>
            <p className="mt-2 max-w-md text-sm leading-6 opacity-80">
              Web tools untuk mengirim pesan ke channel Discord lewat Bot Discord
              resmi — bukan self-bot, bukan token akun pribadi.
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <StatusStrip status={status} slotText={slotText} charCount={message.length} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <ConfigPanel config={config} />

        <SendPanel
          token={savedToken}
          channelId={savedChannelId}
          isActive={hasSavedConfig && status === "aktif"}
          channelName={lastCheck?.ok ? lastCheck.channelName : undefined}
          message={message}
          onMessageChange={setMessage}
        />
      </div>

      <Footer />
    </main>
  );
}
