import { NextResponse } from "next/server";
import type { CheckStatusResult } from "@/lib/types";

/**
 * POST /api/discord/check
 * Body: { token: string, channelId: string }
 *
 * Menguji Bot Token resmi + akses ke SATU channel tujuan:
 *  1. GET https://discord.com/api/v10/users/@me (Authorization: Bot <token>)
 *  2. GET https://discord.com/api/v10/channels/{channelId}
 *
 * KEAMANAN: token hanya diteruskan ke Discord, TIDAK disimpan,
 * TIDAK dicatat ke database, dan TIDAK di-log ke console dalam bentuk apa pun.
 */

interface DiscordMe {
  id: string;
  username: string;
  discriminator?: string;
  bot?: boolean;
}

interface DiscordChannel {
  id: string;
  name?: string;
  guild_id?: string;
  type?: number;
}

interface DiscordGuild {
  id: string;
  name?: string;
}

function bad(message: string, status = 400): NextResponse<CheckStatusResult> {
  return NextResponse.json({ ok: false, status: "gagal", error: message }, { status });
}

function discordError(status: number, konteks: "bot" | "channel"): string {
  if (status === 401)
    return "Token bot tidak valid (401 Unauthorized). Periksa kembali Bot Token dari Discord Developer Portal → Bot → Reset Token, lalu tempel ulang.";
  if (status === 403)
    return konteks === "bot"
      ? "Token valid tapi ditolak (403 Forbidden). Pastikan ini Bot Token resmi (diawali prefix bot, format \"Bot <token>\"), bukan token akun pribadi."
      : "Bot tidak punya akses ke channel ini (403 Forbidden). Pastikan bot sudah di-invite ke server dengan permission View Channel + Send Messages, dan Channel ID benar.";
  if (status === 404)
    return konteks === "channel"
      ? "Channel tidak ditemukan (404). Pastikan Channel ID benar (Developer Mode → klik kanan channel → Copy Channel ID) dan bot berada di server yang sama."
      : "Endpoint Discord tidak ditemukan (404). Coba lagi nanti.";
  if (status === 429)
    return "Kena rate limit Discord (429). Tunggu beberapa detik lalu coba lagi.";
  if (status >= 500)
    return "Server Discord sedang bermasalah. Tunggu sebentar lalu coba lagi.";
  return `Discord mengembalikan status ${status}. Coba lagi, dan pastikan token + Channel ID benar.`;
}

export async function POST(req: Request): Promise<NextResponse<CheckStatusResult>> {
  let body: { token?: unknown; channelId?: unknown };
  try {
    body = (await req.json()) as { token?: unknown; channelId?: unknown };
  } catch {
    return bad("Body request harus JSON valid berisi { token, channelId }.");
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const channelId = typeof body.channelId === "string" ? body.channelId.trim() : "";

  if (!token) return bad("Bot Token wajib diisi.");
  if (!channelId) return bad("Channel ID wajib diisi.");
  if (!/^\d{5,}$/.test(channelId))
    return bad("Channel ID tidak valid. Channel ID hanya berisi angka (mis. 123456789012345678).");

  const headers = { Authorization: `Bot ${token}` };

  // 1) Identitas bot
  let meRes: Response;
  try {
    meRes = await fetch("https://discord.com/api/v10/users/@me", { headers });
  } catch {
    return bad("Tidak bisa menghubungi Discord. Periksa koneksi internet server lalu coba lagi.", 502);
  }
  if (!meRes.ok) {
    return bad(discordError(meRes.status, "bot"), meRes.status === 429 ? 429 : 400);
  }
  const me = (await meRes.json()) as DiscordMe;
  if (me.bot === false) {
    return bad(
      "Token ini bukan milik BOT (terdeteksi akun user). Relay hanya mendukung Bot Token resmi dari Discord Developer Portal — token akun pribadi (self-bot) melanggar ToS Discord dan tidak didukung.",
    );
  }
  const botUsername =
    me.discriminator && me.discriminator !== "0" ? `${me.username}#${me.discriminator}` : me.username;

  // 2) Channel tujuan
  let chRes: Response;
  try {
    chRes = await fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}`, {
      headers,
    });
  } catch {
    return bad("Token valid, tapi gagal memeriksa channel. Periksa koneksi lalu coba lagi.", 502);
  }
  if (!chRes.ok) {
    return bad(discordError(chRes.status, "channel"), chRes.status === 429 ? 429 : 400);
  }
  const channel = (await chRes.json()) as DiscordChannel;

  // 3) (Opsional) nama server — gagal di sini tidak menggagalkan hasil.
  let guildName: string | undefined;
  if (channel.guild_id) {
    try {
      const gRes = await fetch(`https://discord.com/api/v10/guilds/${channel.guild_id}`, { headers });
      if (gRes.ok) {
        const guild = (await gRes.json()) as DiscordGuild;
        guildName = guild.name;
      }
    } catch {
      guildName = undefined;
    }
  }

  return NextResponse.json({
    ok: true,
    status: "aktif",
    botUsername,
    botId: me.id,
    channelName: channel.name,
    guildName,
  });
}
