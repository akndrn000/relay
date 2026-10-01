"use client";

import { useCallback, useEffect, useState } from "react";
import { checkBotStatus } from "@/lib/discord";
import type { BotStatus, ChannelSlot, CheckStatusResult } from "@/lib/types";
import {
  ACTIVE_SLOT_KEY,
  CHANNEL_SLOTS_KEY,
  defaultChannelSlots,
  defaultLabel,
  loadActiveSlotId,
  loadChannelSlots,
  saveActiveSlotId,
  saveChannelSlots,
} from "@/lib/storage";

const TOKEN_KEY = "relay_bot_token";
/** Kunci lama (input Channel ID tunggal) — hanya dibaca sekali untuk migrasi ke slot 1. */
const LEGACY_CHANNEL_KEY = "relay_channel_id";

function readStorage(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/**
 * Kelola konfigurasi bot: draft token + 10 slot channel tersimpan +
 * kredensial terverifikasi + status koneksi.
 *
 * Pola penyimpanan:
 * - Bot Token: SATU token, ditulis ke localStorage HANYA setelah tes
 *   koneksi berhasil (seperti sebelumnya).
 * - Channel ID: 10 slot; tiap slot disimpan ke localStorage langsung
 *   via tombol "Simpan" per slot (tidak menunggu tes berhasil).
 * - Channel aktif = channelId slot yang sedang dipilih; itulah yang
 *   dipakai testConnection & pengiriman pesan.
 */
export function useBotConfig() {
  // Draft token — apa yang sedang diketik user (belum tentu tersimpan).
  const [token, setToken] = useState("");

  // Token terverifikasi — dipakai untuk mengirim.
  const [savedToken, setSavedToken] = useState("");

  // Slot tersimpan + pilihan aktif.
  const [slots, setSlots] = useState<ChannelSlot[]>(() => defaultChannelSlots());
  const [activeSlotId, setActiveSlotId] = useState(1);

  const [status, setStatus] = useState<BotStatus>("belum-dites");
  const [lastCheck, setLastCheck] = useState<CheckStatusResult | null>(null);
  const [testing, setTesting] = useState(false);

  // Channel aktif (tersimpan) — satu-satunya channel untuk tes & kirim.
  const activeChannelId = slots.find((s) => s.id === activeSlotId)?.channelId ?? "";
  const activeSlot = slots.find((s) => s.id === activeSlotId);

  // Inti pengetesan: dipakai manual via testConnection maupun otomatis
  // (saat mount / ganti slot aktif) bila kredensial lengkap.
  const runCheck = useCallback(async (cleanToken: string, cleanChannelId: string) => {
    if (!cleanToken || !cleanChannelId) {
      const hasil: CheckStatusResult = {
        ok: false,
        status: "gagal",
        error: "Isi dulu Bot Token dan Channel ID (pilih slot) sebelum mengetes koneksi.",
      };
      setStatus("gagal");
      setLastCheck(hasil);
      return hasil;
    }

    setTesting(true);
    setStatus("menguji");
    setLastCheck(null);
    try {
      const hasil = await checkBotStatus(cleanToken, cleanChannelId);
      setLastCheck(hasil);
      if (hasil.ok) {
        // Sukses → baru simpan token ke localStorage
        // (channel slot sudah tersimpan via tombol Simpan per slot).
        try {
          localStorage.setItem(TOKEN_KEY, cleanToken);
        } catch {
          /* penyimpanan gagal, koneksi tetap dianggap aktif sesi ini */
        }
        setSavedToken(cleanToken);
        setStatus("aktif");
      } else {
        setStatus("gagal");
      }
      return hasil;
    } finally {
      setTesting(false);
    }
  }, []);

  // Muat tersimpan saat pertama dibuka; bila lengkap, uji otomatis di latar.
  useEffect(() => {
    let loadedSlots = loadChannelSlots();
    // Migrasi sekali dari kunci lama → slot 1 (bila semua slot masih kosong).
    try {
      const legacy = (localStorage.getItem(LEGACY_CHANNEL_KEY) ?? "").trim();
      if (legacy && loadedSlots.every((s) => !s.channelId)) {
        loadedSlots = loadedSlots.map((s) =>
          s.id === 1 ? { ...s, channelId: legacy } : s,
        );
        saveChannelSlots(loadedSlots);
      }
      localStorage.removeItem(LEGACY_CHANNEL_KEY);
    } catch {
      /* abaikan */
    }
    const loadedActiveId = loadActiveSlotId();
    const t = readStorage(TOKEN_KEY).trim();
    setSlots(loadedSlots);
    setActiveSlotId(loadedActiveId);
    if (t) {
      setToken(t);
      setSavedToken(t);
    }
    const activeChannel =
      loadedSlots.find((s) => s.id === loadedActiveId)?.channelId.trim() ?? "";
    if (t && activeChannel) {
      void runCheck(t, activeChannel);
    }
  }, [runCheck]);

  const testConnection = useCallback(async () => {
    return runCheck(token.trim(), activeChannelId.trim());
  }, [token, activeChannelId, runCheck]);

  /** Simpan SATU slot ke localStorage tanpa memengaruhi slot lain. */
  const saveSlot = useCallback(
    (id: number, label: string, channelId: string) => {
      const cleanLabel = label.trim() === "" ? defaultLabel(id) : label.trim();
      const cleanChannel = channelId.trim();
      setSlots((prev) => {
        const next = prev.map((s) =>
          s.id === id ? { ...s, label: cleanLabel, channelId: cleanChannel } : s,
        );
        saveChannelSlots(next);
        return next;
      });
      // Bila slot aktif berubah, hasil tes lama tidak lagi valid.
      if (id === activeSlotId) {
        const tk = token.trim() || savedToken;
        if (tk && cleanChannel) {
          void runCheck(tk, cleanChannel);
        } else {
          setStatus("belum-dites");
          setLastCheck(null);
        }
      }
    },
    [activeSlotId, token, savedToken, runCheck],
  );

  /** Pilih slot aktif; hasil tes lama direset / diuji ulang di latar. */
  const selectSlot = useCallback(
    (id: number) => {
      setActiveSlotId(id);
      saveActiveSlotId(id);
      const ch = slots.find((s) => s.id === id)?.channelId.trim() ?? "";
      const tk = token.trim() || savedToken;
      if (tk && ch) {
        void runCheck(tk, ch);
      } else {
        setStatus("belum-dites");
        setLastCheck(null);
      }
    },
    [slots, token, savedToken, runCheck],
  );

  const clearSaved = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(CHANNEL_SLOTS_KEY);
      localStorage.removeItem(ACTIVE_SLOT_KEY);
      localStorage.removeItem(LEGACY_CHANNEL_KEY);
    } catch {
      /* abaikan */
    }
    setSavedToken("");
    setToken("");
    setSlots(defaultChannelSlots());
    setActiveSlotId(1);
    setStatus("belum-dites");
    setLastCheck(null);
  }, []);

  return {
    token,
    setToken,
    savedToken,
    /** True bila draft token masih sama dengan yang tersimpan. */
    tokenMatchesSaved: token.trim() === savedToken,
    /** Alias kompatibilitas (dulu membandingkan token+channel sekaligus). */
    draftMatchesSaved: token.trim() === savedToken,
    slots,
    activeSlotId,
    activeSlot,
    /** Channel ID tersimpan dari slot aktif — dipakai tes & kirim. */
    activeChannelId,
    /** Alias: channel tersimpan (dari slot aktif). */
    savedChannelId: activeChannelId,
    /** Alias: draft channel = channel slot aktif. */
    channelId: activeChannelId,
    saveSlot,
    selectSlot,
    hasSavedConfig: savedToken !== "" && activeChannelId.trim() !== "",
    status,
    lastCheck,
    testing,
    testConnection,
    clearSaved,
  };
}

export type BotConfig = ReturnType<typeof useBotConfig>;
