import { CHANNEL_SLOT_COUNT, type ChannelSlot } from "./types";

/**
 * Penyimpanan slot channel di localStorage.
 * - "relay_channel_slots": array 10 ChannelSlot.
 * - "relay_active_channel_slot": id (1-10) slot yang dipakai untuk tes & kirim.
 */

export const CHANNEL_SLOTS_KEY = "relay_channel_slots";
export const ACTIVE_SLOT_KEY = "relay_active_channel_slot";

export function defaultLabel(id: number): string {
  return `Slot ${id}`;
}

/** 10 slot kosong dengan label default "Slot 1".."Slot 10". */
export function defaultChannelSlots(): ChannelSlot[] {
  return Array.from({ length: CHANNEL_SLOT_COUNT }, (_, i) => ({
    id: i + 1,
    label: defaultLabel(i + 1),
    channelId: "",
  }));
}

function sanitizeSlot(raw: unknown, fallbackId: number): ChannelSlot {
  const id =
    typeof raw === "object" && raw !== null && "id" in raw && typeof (raw as { id: unknown }).id === "number"
      ? Math.trunc((raw as { id: number }).id)
      : fallbackId;
  const safeId = Number.isInteger(id) && id >= 1 && id <= CHANNEL_SLOT_COUNT ? id : fallbackId;
  const rec = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const label = typeof rec.label === "string" && rec.label.trim() !== "" ? rec.label.trim() : defaultLabel(safeId);
  const channelId = typeof rec.channelId === "string" ? rec.channelId.trim() : "";
  return { id: safeId, label, channelId };
}

/** Baca 10 slot; rusak/hilang → default. Selalu kembalikan tepat 10 slot id 1..10. */
export function loadChannelSlots(): ChannelSlot[] {
  try {
    const raw = localStorage.getItem(CHANNEL_SLOTS_KEY);
    if (!raw) return defaultChannelSlots();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultChannelSlots();
    const byId = new Map<number, unknown>();
    for (const entry of parsed) {
      const s = sanitizeSlot(entry, -1);
      if (s.id >= 1 && byId.get(s.id) === undefined) byId.set(s.id, entry);
    }
    return Array.from({ length: CHANNEL_SLOT_COUNT }, (_, i) => {
      const id = i + 1;
      const found = byId.get(id);
      return found === undefined ? { id, label: defaultLabel(id), channelId: "" } : sanitizeSlot(found, id);
    });
  } catch {
    return defaultChannelSlots();
  }
}

/** Tulis seluruh array slot (dipakai sesudah saveSlot mengubah satu slot). */
export function saveChannelSlots(slots: ChannelSlot[]): void {
  try {
    const clean = Array.from({ length: CHANNEL_SLOT_COUNT }, (_, i) => {
      const id = i + 1;
      const found = slots.find((s) => s.id === id);
      return found
        ? { id, label: found.label.trim() === "" ? defaultLabel(id) : found.label.trim(), channelId: found.channelId.trim() }
        : { id, label: defaultLabel(id), channelId: "" };
    });
    localStorage.setItem(CHANNEL_SLOTS_KEY, JSON.stringify(clean));
  } catch {
    /* penyimpanan gagal — abaikan, sesi ini tetap jalan */
  }
}

/** Baca id slot aktif; di luar 1..10 → 1. */
export function loadActiveSlotId(): number {
  try {
    const n = Number(localStorage.getItem(ACTIVE_SLOT_KEY));
    return Number.isInteger(n) && n >= 1 && n <= CHANNEL_SLOT_COUNT ? n : 1;
  } catch {
    return 1;
  }
}

export function saveActiveSlotId(id: number): void {
  try {
    if (Number.isInteger(id) && id >= 1 && id <= CHANNEL_SLOT_COUNT) {
      localStorage.setItem(ACTIVE_SLOT_KEY, String(id));
    }
  } catch {
    /* abaikan */
  }
}
