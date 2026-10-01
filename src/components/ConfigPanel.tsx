"use client";

import { useEffect, useState } from "react";
import type { BotConfig } from "@/hooks/useBotConfig";
import type { BotStatus, ChannelSlot } from "@/lib/types";

export const STATUS_LABEL: Record<BotStatus, string> = {
  "belum-dites": "○ Belum Dites",
  menguji: "… Menguji",
  aktif: "● Aktif",
  gagal: "✕ Gagal",
};

function isValidChannelId(v: string): boolean {
  return /^\d{5,}$/.test(v);
}

interface SlotDraft {
  label: string;
  channelId: string;
}

function toDrafts(slots: ChannelSlot[]): Record<number, SlotDraft> {
  const out: Record<number, SlotDraft> = {};
  for (const s of slots) out[s.id] = { label: s.label, channelId: s.channelId };
  return out;
}

/** Cuplikan channel untuk opsi dropdown: " — …345678", atau "" bila slot kosong. */
function channelTail(channelId: string): string {
  const t = channelId.trim();
  return t ? ` — …${t.slice(-6)}` : "";
}

/** Label satu opsi dropdown: "Slot 2 — …345678", plus " (Aktif)" untuk slot aktif. */
function slotOptionLabel(slot: ChannelSlot, isActive: boolean): string {
  const name = slot.label.trim() || `Slot ${slot.id}`;
  return `${name}${channelTail(slot.channelId)}${isActive ? " (Aktif)" : ""}`;
}

/** Panel konfigurasi: Bot Token + dropdown 10 slot Channel ID + tes koneksi. */
export function ConfigPanel({ config }: { config: BotConfig }) {
  const [showToken, setShowToken] = useState(false);
  const {
    token,
    setToken,
    slots,
    activeSlotId,
    activeChannelId,
    saveSlot,
    selectSlot,
    hasSavedConfig,
    draftMatchesSaved,
    status,
    lastCheck,
    testing,
    testConnection,
    clearSaved,
  } = config;

  // Draft per slot (diketik user, belum tentu tersimpan).
  const [drafts, setDrafts] = useState<Record<number, SlotDraft>>(() => toDrafts(slots));
  useEffect(() => {
    setDrafts(toDrafts(slots));
  }, [slots]);

  const activeSlot = slots.find((s) => s.id === activeSlotId) ?? slots[0];
  const draft = drafts[activeSlotId] ?? {
    label: activeSlot.label,
    channelId: activeSlot.channelId,
  };
  const dirty =
    draft.label.trim() !== activeSlot.label ||
    draft.channelId.trim() !== activeSlot.channelId;
  const channelInvalid =
    draft.channelId.trim() !== "" && !isValidChannelId(draft.channelId.trim());

  const canTest = !testing && token.trim() !== "" && activeChannelId.trim() !== "";
  const activeDraftLabel = draft.label.trim() || `Slot ${activeSlotId}`;

  return (
    <section className="sketch-panel p-6" aria-labelledby="judul-konfigurasi">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="judul-konfigurasi" className="font-hand text-3xl">
          Konfigurasi Bot
        </h2>
        <span className="sketch sketch-badge" role="status">
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {/* Bot Token — tetap satu, bukan multi-slot */}
        <div>
          <label htmlFor="relay-token" className="mb-1 block text-sm font-semibold">
            Bot Token
          </label>
          <div className="flex gap-2">
            <input
              id="relay-token"
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Tempel Bot Token dari Discord Developer Portal"
              autoComplete="off"
              spellCheck={false}
              className="sketch-input w-full px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowToken((s) => !s)}
              aria-label={showToken ? "Sembunyikan token" : "Tampilkan token"}
              className="sketch-btn shrink-0 px-4 py-2 text-xs font-semibold"
            >
              {showToken ? "Sembunyikan" : "Lihat"}
            </button>
          </div>
        </div>

        {/* Slot Channel ID — satu dropdown + form edit slot terpilih */}
        <div>
          <h3 className="text-sm font-semibold">Channel ID tujuan — 10 slot</h3>
          <p className="mt-1 text-xs opacity-60">
            Pesan hanya bisa dikirim ke channel dari slot yang sedang aktif. Klik kanan channel di Discord →
            Copy Channel ID. Tiap slot disimpan sendiri-sendiri.
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label htmlFor="relay-slot-pilih" className="text-sm font-semibold">
              Slot aktif
            </label>
            <select
              id="relay-slot-pilih"
              value={String(activeSlotId)}
              onChange={(e) => selectSlot(Number(e.target.value))}
              className="sketch-input w-full cursor-pointer px-3 py-2 text-sm sm:w-auto sm:min-w-64 [&>option]:bg-[var(--panel)] [&>option]:text-[var(--foreground)]"
            >
              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slotOptionLabel(slot, slot.id === activeSlotId)}
                </option>
              ))}
            </select>
            <span className="sketch whitespace-nowrap px-2 py-1 text-[11px] font-bold" role="status">
              Aktif
            </span>
          </div>

          {/* Form edit: hanya slot yang sedang dipilih */}
          <div className="sketch-panel-alt mt-2 flex flex-col gap-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold">#{activeSlot.id}</span>
              {!dirty && activeSlot.channelId && (
                <span className="text-[11px] opacity-60">✓ tersimpan</span>
              )}
              {dirty && <span className="text-[11px] opacity-60">belum disimpan</span>}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="w-full sm:max-w-44">
                <label
                  htmlFor="relay-slot-label"
                  className="mb-1 block text-xs font-semibold opacity-70"
                >
                  Label
                </label>
                <input
                  id="relay-slot-label"
                  type="text"
                  value={draft.label}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [activeSlotId]: { ...draft, label: e.target.value },
                    }))
                  }
                  placeholder={`Slot ${activeSlotId}`}
                  maxLength={40}
                  className="sketch-input w-full px-3 py-2 text-sm"
                />
              </div>
              <div className="w-full">
                <label
                  htmlFor="relay-slot-channel"
                  className="mb-1 block text-xs font-semibold opacity-70"
                >
                  Channel ID
                </label>
                <input
                  id="relay-slot-channel"
                  type="text"
                  value={draft.channelId}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [activeSlotId]: { ...draft, channelId: e.target.value.trimStart() },
                    }))
                  }
                  placeholder="mis. 123456789012345678"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  className="sketch-input w-full px-3 py-2 text-sm"
                />
              </div>
            </div>
            {channelInvalid && (
              <p className="text-xs font-semibold" role="alert">
                Channel ID hanya berisi angka (minimal 5 digit).
              </p>
            )}
            {!activeSlot.channelId && !dirty && (
              <p className="text-xs opacity-60">
                Slot ini masih kosong — isi Channel ID lalu tekan “Simpan”.
              </p>
            )}
            <div>
              <button
                type="button"
                onClick={() => saveSlot(activeSlotId, draft.label, draft.channelId)}
                disabled={!dirty || channelInvalid}
                className="sketch-btn px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>

        {/* Aksi */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void testConnection()}
            disabled={!canTest}
            className="sketch-btn px-6 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {testing ? "Menguji…" : "Cek Status"}
          </button>
          {hasSavedConfig && (
            <button
              type="button"
              onClick={clearSaved}
              className="sketch-btn px-4 py-2 text-xs opacity-80"
            >
              Hapus tersimpan
            </button>
          )}
        </div>
        <p className="text-xs opacity-60">
          Tes memakai slot aktif: <span className="font-semibold">{activeDraftLabel}</span>
          {activeChannelId.trim() && <> ({activeChannelId.trim()})</>}.
        </p>

        {/* Hasil tes */}
        {lastCheck?.ok && (
          <div className="sketch-panel-alt p-4 text-sm leading-6">
            <p className="font-bold">Koneksi berhasil.</p>
            <p>
              Bot: <span className="font-semibold">{lastCheck.botUsername ?? "—"}</span>
              {lastCheck.channelName && (
                <>
                  {" → "}channel: <span className="font-semibold">#{lastCheck.channelName}</span>
                </>
              )}
              {lastCheck.guildName && <span className="opacity-70"> ({lastCheck.guildName})</span>}
            </p>
            {!draftMatchesSaved && (
              <p className="mt-1 text-xs opacity-70">
                Isi token berubah — tekan “Cek Status” lagi agar token tersimpan yang baru ikut aktif.
              </p>
            )}
          </div>
        )}
        {lastCheck && !lastCheck.ok && (
          <div className="sketch p-4 text-sm leading-6" role="alert">
            <p className="font-bold">Koneksi gagal.</p>
            <p>{lastCheck.error ?? "Terjadi kesalahan yang tidak diketahui."}</p>
          </div>
        )}

        <p className="text-xs opacity-60">
          Bot Token disimpan di browser ini setelah tes berhasil; tiap slot Channel ID disimpan
          langsung lewat tombol “Simpan” — tidak pernah dikirim ke mana pun selain API
          aplikasi ini yang meneruskannya ke Discord.
        </p>
      </div>
    </section>
  );
}
