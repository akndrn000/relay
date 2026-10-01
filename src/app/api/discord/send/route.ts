import { NextResponse } from "next/server";
import { DISCORD_MESSAGE_LIMIT, type SendMessageResult } from "@/lib/types";

/**
 * POST /api/discord/send
 * Body: { token: string, channelId: string, message: string, asCodeBlock?: boolean }
 *
 * Mengirim pesan ke SATU channel tujuan via Bot Token resmi:
 *  POST https://discord.com/api/v10/channels/{channelId}/messages
 *
 * Fitur warisan "BOT-SIMPAN-PESAN" yang dipertahankan:
 *  - asCodeBlock=true → pesan dibungkus code fence (```) sebelum dikirim.
 *  - Pembatasan channel → hanya channelId eksplisit dari user yang dipakai.
 *
 * KEAMANAN: token hanya diteruskan ke Discord, TIDAK disimpan,
 * TIDAK dicatat ke database, dan TIDAK di-log ke console dalam bentuk apa pun.
 */

interface DiscordMessage {
  id: string;
  channel_id: string;
}

function bad(message: string, status = 400, extra?: Partial<SendMessageResult>): NextResponse<SendMessageResult> {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

function wrapCodeBlock(message: string): string {
  // Hindari fence rusak bila pesan mengandung ``` : sisipkan zero-width space.
  const aman = message.replaceAll("```", "`\u200b``");
  return "```\n" + aman + "\n```";
}

export async function POST(req: Request): Promise<NextResponse<SendMessageResult>> {
  let body: { token?: unknown; channelId?: unknown; message?: unknown; asCodeBlock?: unknown };
  try {
    body = (await req.json()) as {
      token?: unknown;
      channelId?: unknown;
      message?: unknown;
      asCodeBlock?: unknown;
    };
  } catch {
    return bad("Body request harus JSON valid berisi { token, channelId, message }.");
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const channelId = typeof body.channelId === "string" ? body.channelId.trim() : "";
  const message = typeof body.message === "string" ? body.message : "";
  const asCodeBlock = body.asCodeBlock === true;

  if (!token) return bad("Bot Token wajib diisi.");
  if (!channelId) return bad("Channel ID wajib diisi.");
  if (!/^\d{5,}$/.test(channelId))
    return bad("Channel ID tidak valid. Channel ID hanya berisi angka.");
  if (!message.trim()) return bad("Pesan kosong. Tulis dulu pesannya sebelum dikirim.");

  const finalMessage = asCodeBlock ? wrapCodeBlock(message) : message;

  if (finalMessage.length > DISCORD_MESSAGE_LIMIT) {
    return bad(
      `Pesan terlalu panjang (${finalMessage.length}/${DISCORD_MESSAGE_LIMIT} karakter). Pendekkan pesan lalu coba lagi.` +
        (asCodeBlock ? " (Catatan: mode code block menambah 8 karakter untuk pembungkus ```.)" : ""),
    );
  }

  let res: Response;
  try {
    res = await fetch(
      `https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: finalMessage }),
      },
    );
  } catch {
    return bad("Tidak bisa menghubungi Discord. Periksa koneksi internet server lalu coba lagi.", 502);
  }

  if (res.status === 429) {
    let retryAfter = 5;
    try {
      const data = (await res.json()) as { retry_after?: number };
      if (typeof data.retry_after === "number" && data.retry_after > 0) retryAfter = Math.ceil(data.retry_after);
    } catch {
      const header = res.headers.get("retry-after");
      if (header) {
        const parsed = Number(header);
        if (Number.isFinite(parsed) && parsed > 0) retryAfter = Math.ceil(parsed);
      }
    }
    return bad(
      `Kena rate limit Discord (429). Tunggu ±${retryAfter} detik lalu coba lagi.`,
      429,
      { retryAfterSeconds: retryAfter },
    );
  }

  if (res.status === 401) {
    return bad(
      "Token bot tidak valid (401 Unauthorized). Periksa kembali Bot Token dari Discord Developer Portal → Bot → Reset Token, lalu tempel ulang.",
      401,
    );
  }
  if (res.status === 403) {
    return bad(
      "Bot tidak punya izin mengirim ke channel ini (403 Forbidden). Pastikan bot sudah di-invite dengan permission View Channel + Send Messages.",
      403,
    );
  }
  if (res.status === 404) {
    return bad(
      "Channel tidak ditemukan (404). Pastikan Channel ID benar dan bot berada di server yang sama.",
      404,
    );
  }
  if (!res.ok) {
    return bad(`Discord mengembalikan status ${res.status}. Coba lagi nanti.`, 502);
  }

  const sent = (await res.json()) as DiscordMessage;
  return NextResponse.json({ ok: true, messageId: sent.id, channelId: sent.channel_id });
}
