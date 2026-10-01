"use client";

/**
 * Client-side helper: SEMUA request ke Discord WAJIB lewat API Route
 * milik aplikasi ini (/api/discord/*). File ini TIDAK pernah memanggil
 * discord.com langsung (CORS tidak didukung + token tidak boleh terekspos
 * ke origin lain selain diteruskan server-side ke Discord).
 */
import type { CheckStatusResult, SendMessageResult } from "./types";

interface ApiErrorShape {
  error?: string;
  retryAfterSeconds?: number;
}

async function parseJsonSafe(res: Response): Promise<ApiErrorShape & Record<string, unknown>> {
  try {
    return (await res.json()) as ApiErrorShape & Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Uji koneksi bot + akses channel tujuan.
 * → POST /api/discord/check
 */
export async function checkBotStatus(
  token: string,
  channelId: string,
): Promise<CheckStatusResult> {
  const res = await fetch("/api/discord/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, channelId }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    return {
      ok: false,
      status: "gagal",
      error: typeof data.error === "string" ? data.error : "Gagal menguji koneksi bot.",
    };
  }
  return data as unknown as CheckStatusResult;
}

/**
 * Kirim pesan ke channel tujuan yang sudah dikonfigurasi.
 * @param asCodeBlock bila true, pesan dibungkus code fence (```) di server.
 * → POST /api/discord/send
 */
export async function sendMessage(
  token: string,
  channelId: string,
  message: string,
  asCodeBlock: boolean,
): Promise<SendMessageResult> {
  const res = await fetch("/api/discord/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, channelId, message, asCodeBlock }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    return {
      ok: false,
      error: typeof data.error === "string" ? data.error : "Gagal mengirim pesan.",
      retryAfterSeconds:
        typeof data.retryAfterSeconds === "number" ? data.retryAfterSeconds : undefined,
    };
  }
  return data as unknown as SendMessageResult;
}
