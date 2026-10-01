"use client";

import { useState } from "react";
import { sendMessage } from "@/lib/discord";
import { DISCORD_MESSAGE_LIMIT, type SendMessageResult } from "@/lib/types";

interface SendPanelProps {
  /** Kredensial terverifikasi — hanya ini yang dipakai mengirim. */
  token: string;
  channelId: string;
  /** True bila tes koneksi terakhir berstatus aktif. */
  isActive: boolean;
  channelName?: string;
  /** Isi pesan (controlled dari page agar baris status bisa menghitung karakter). */
  message: string;
  onMessageChange: (value: string) => void;
}

interface Feedback {
  kind: "sukses" | "gagal";
  text: string;
}

interface FailedToken {
  token: string;
  error: string;
}

interface HistoryItem {
  time: string;
  snippet: string;
  messageId?: string;
}

const HISTORY_LIMIT = 5;
const SNIPPET_LENGTH = 80;
/** Pembungkus ``` menambah 8 karakter (```\n + \n```) pada pesan final. */
const CODE_FENCE_EXTRA = 8;
/** Jeda antar pesan agar menghormati rate limit Discord. */
const SEND_GAP_MS = 850;
/** Maksimal percobaan per token bila gagal karena 429 (1 awal + 2 retry). */
const MAX_429_ATTEMPTS = 3;

function makeSnippet(message: string): string {
  const flat = message.replace(/\s+/g, " ").trim();
  return flat.length > SNIPPET_LENGTH ? flat.slice(0, SNIPPET_LENGTH) + "…" : flat;
}

/** Pecah input jadi token terpisah: spasi & baris baru sama-sama pemisah. */
function splitTokens(message: string): string[] {
  return message
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t !== "");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowTime(): string {
  return new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Panel kirim pesan ke channel tujuan yang sudah dikonfigurasi. */
export function SendPanel({ token, channelId, isActive, channelName, message, onMessageChange }: SendPanelProps) {
  const [asCodeBlock, setAsCodeBlock] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [failures, setFailures] = useState<FailedToken[]>([]);
  // Riwayat sesi ini saja — di memori, hilang saat refresh.
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const tokens = splitTokens(message);
  // Tiap token dikirim sebagai pesan sendiri → batas dihitung per token.
  const tooLongIndex = tokens.findIndex(
    (t) => t.length + (asCodeBlock ? CODE_FENCE_EXTRA : 0) > DISCORD_MESSAGE_LIMIT,
  );
  const canSend =
    isActive && !sending && tokens.length > 0 && tooLongIndex === -1;

  async function handleSend() {
    if (!canSend) return;
    const batch = splitTokens(message);
    const total = batch.length;
    setSending(true);
    setFeedback(null);
    setFailures([]);
    setProgress({ current: 0, total });
    try {
      let okCount = 0;
      const failed: FailedToken[] = [];
      const sent: HistoryItem[] = [];

      for (let i = 0; i < batch.length; i++) {
        const tk = batch[i];
        setProgress({ current: i + 1, total });

        // Kirim dengan retry khusus 429: tunggu sesuai retry_after
        // Discord (retryAfterSeconds) lalu coba lagi token YANG SAMA.
        // Error non-429 langsung dicatat gagal tanpa retry.
        let hasil: SendMessageResult = {
          ok: false,
          error: "Gagal mengirim pesan.",
        };
        for (let attempt = 1; attempt <= MAX_429_ATTEMPTS; attempt++) {
          hasil = await sendMessage(token, channelId, tk, asCodeBlock);
          if (hasil.ok) break;
          if (hasil.retryAfterSeconds !== undefined && attempt < MAX_429_ATTEMPTS) {
            await sleep(hasil.retryAfterSeconds * 1000 + 250);
            continue;
          }
          break;
        }

        if (hasil.ok) {
          okCount += 1;
          sent.push({ time: nowTime(), snippet: makeSnippet(tk), messageId: hasil.messageId });
        } else {
          const suffix =
            hasil.retryAfterSeconds !== undefined
              ? ` (rate limit, tunggu ±${hasil.retryAfterSeconds} dtk)`
              : "";
          failed.push({ token: tk, error: `${hasil.error ?? "Gagal mengirim pesan."}${suffix}` });
        }

        // Jeda antar pesan (kecuali sesudah pesan terakhir).
        if (i < batch.length - 1) await sleep(SEND_GAP_MS);
      }

      // Tiap token yang berhasil = entri riwayat terpisah (terbaru di atas).
      if (sent.length > 0) {
        setHistory((prev) => [...sent].reverse().concat(prev).slice(0, HISTORY_LIMIT));
      }

      if (failed.length === 0) {
        setFeedback({
          kind: "sukses",
          text:
            total === 1
              ? "Pesan terkirim ke channel tujuan."
              : `${okCount} dari ${total} pesan terkirim ke channel tujuan.`,
        });
        onMessageChange("");
      } else {
        setFeedback({
          kind: "gagal",
          text: `${okCount} berhasil, ${failed.length} gagal dari ${total} total.`,
        });
        setFailures(failed);
        // Sisakan token gagal di kolom agar mudah dikirim ulang.
        onMessageChange(failed.map((f) => f.token).join(" "));
      }
    } finally {
      setSending(false);
      setProgress(null);
    }
  }

  return (
    <section className="sketch-panel p-6" aria-labelledby="judul-kirim">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="judul-kirim" className="font-hand text-3xl">
          Kirim Pesan
        </h2>
        <span className="sketch sketch-badge" role="status">
          {channelName ? `#${channelName}` : isActive ? "Siap" : "Belum aktif"}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <label htmlFor="relay-message" className="mb-1 block text-sm font-semibold">
            Isi pesan
          </label>
          <textarea
            id="relay-message"
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="Tulis pesan / deretan kode dipisah spasi atau baris baru…"
            rows={7}
            disabled={sending}
            className="sketch-textarea w-full resize-none px-3 py-2 text-sm leading-6 disabled:cursor-not-allowed disabled:opacity-40"
          />
        </div>
        <p className="text-xs opacity-60">
          Tiap kata/baris dipisah spasi dikirim sebagai pesan terpisah — mis. “AFC20D AFC1D8 AFC1CC”
          terkirim sebagai 3 pesan berurutan.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={asCodeBlock}
              onChange={(e) => setAsCodeBlock(e.target.checked)}
              disabled={sending}
              className="h-4 w-4 accent-neutral-800 dark:accent-neutral-200"
            />
            Kirim sebagai code block
          </label>
          <span className="text-xs opacity-60">
            {tokens.length > 0 && `${tokens.length} pesan • `}
            {message.length}/{DISCORD_MESSAGE_LIMIT} karakter
            {asCodeBlock && " (+8 pembungkus ``` per pesan)"}
          </span>
        </div>
        {tooLongIndex !== -1 && (
          <p className="text-xs font-semibold" role="alert">
            Pesan ke-{tooLongIndex + 1} melebihi {DISCORD_MESSAGE_LIMIT} karakter
            {asCodeBlock ? " (termasuk pembungkus code block)" : ""}. Pendekkan dulu sebelum dikirim.
          </p>
        )}

        <div>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!canSend}
            className="sketch-btn px-6 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending && progress
              ? `Mengirim ${progress.current} dari ${progress.total}…`
              : "Kirim"}
          </button>
        </div>
        {sending && progress && (
          <p className="text-xs opacity-70" role="status" aria-live="polite">
            Mengirim {progress.current} dari {progress.total}… (jeda ±{SEND_GAP_MS}ms antar pesan)
          </p>
        )}

        {feedback && (
          <div className={feedback.kind === "sukses" ? "sketch-panel-alt p-4 text-sm leading-6" : "sketch p-4 text-sm leading-6"} role={feedback.kind === "gagal" ? "alert" : "status"}>
            <p className="font-bold">{feedback.kind === "sukses" ? "Berhasil." : "Selesai dengan kegagalan."}</p>
            <p>{feedback.text}</p>
          </div>
        )}

        {failures.length > 0 && (
          <div className="sketch p-4 text-sm leading-6" role="alert">
            <p className="font-bold">Token yang gagal ({failures.length}):</p>
            <ul className="mt-2 flex flex-col gap-1">
              {failures.map((f, i) => (
                <li key={`${f.token}-${i}`} className="text-xs leading-5">
                  <span className="font-bold">{f.token}</span>
                  <span className="opacity-60"> — </span>
                  <span>{f.error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-1">
            <h3 className="font-hand text-2xl">Terkirim sesi ini</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {history.map((item, i) => (
                <li key={`${item.messageId ?? "tanpa-id"}-${i}`} className="sketch px-3 py-2 text-xs leading-5">
                  <span className="font-bold">{item.time}</span>
                  <span className="opacity-60"> — </span>
                  <span>{item.snippet}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs opacity-60">Riwayat hanya sesi ini, hilang saat halaman di-refresh.</p>
          </div>
        )}
      </div>
    </section>
  );
}
