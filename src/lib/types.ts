/**
 * Tipe bersama untuk Relay (dipakai client + API Route).
 */

/** Status koneksi bot: belum pernah dites, sedang menguji, aktif, atau gagal. */
export type BotStatus = "belum-dites" | "menguji" | "aktif" | "gagal";

/** Hasil pengecekan status bot + akses channel. */
export interface CheckStatusResult {
  ok: boolean;
  status: BotStatus;
  /** Username bot, mis. "RelayBot#1234" (tanpa discriminator bila tidak ada). */
  botUsername?: string;
  botId?: string;
  channelName?: string;
  guildName?: string;
  /** Pesan error Bahasa Indonesia yang ramah dibaca user. */
  error?: string;
}

/** Hasil pengiriman pesan. */
export interface SendMessageResult {
  ok: boolean;
  messageId?: string;
  channelId?: string;
  /** Pesan error Bahasa Indonesia yang ramah dibaca user. */
  error?: string;
  /** Terisi bila Discord mengembalikan 429 (rate limit). Dalam detik. */
  retryAfterSeconds?: number;
}

/** Batas panjang pesan Discord (karakter). */
export const DISCORD_MESSAGE_LIMIT = 2000;

/** Jumlah slot channel tersimpan. */
export const CHANNEL_SLOT_COUNT = 10;

/** Satu slot channel tersimpan. id selalu 1..CHANNEL_SLOT_COUNT. */
export interface ChannelSlot {
  id: number;
  label: string;
  channelId: string;
}
