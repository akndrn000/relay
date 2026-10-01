# Relay

Web tools untuk mengirim pesan ke channel Discord lewat **Bot Discord RESMI** — bukan self-bot, bukan token akun pribadi.

Terinspirasi alur proyek lama "BOT-SIMPAN-PESAN" (Python self-bot), tapi diimplementasikan ulang dengan cara resmi/legal:

| Fitur lama | Bentuk baru di Relay |
|---|---|
| Auto-format jadi code block | Dipertahankan sebagai **toggle** saat kirim pesan (`asCodeBlock`) |
| Pembatasan channel | User menentukan **SATU Channel ID tujuan** di panel konfigurasi; pesan HANYA bisa dikirim ke channel itu |
| Token akun pribadi (self-bot, melanggar ToS) | **Diganti total** dengan Bot Token resmi via Discord Developer Portal, dipanggil lewat Discord REST API resmi |

Tema visual: **sketsa monokrom** — hitam-putih murni + gradasi abu, tanpa warna/hue apa pun. Mode terang seperti kertas, mode gelap abu sangat gelap (bukan hitam pekat).

## Cara membuat Bot Discord (resmi)

1. Buka [Discord Developer Portal](https://discord.com/developers/applications) → **New Application** → beri nama (mis. `Relay`).
2. Masuk ke menu **Bot** → **Reset Token** → salin **Bot Token**. Simpan baik-baik, jangan dibagikan.
3. Matikan **Public Bot** bila hanya untuk server sendiri (opsional).
4. Tidak perlu Privileged Gateway Intent apa pun untuk kirim pesan biasa.

## Cara invite bot ke server

1. Di Developer Portal → **OAuth2 → URL Generator**.
2. Centang scope: **`bot`**.
3. Centang permission: **View Channels**, **Send Messages** (tambah **Read Message History** bila perlu).
4. Buka URL hasil generate → pilih server → **Authorize**.
5. Pastikan role bot berada di atas channel yang dituju dan punya akses View + Send.

## Cara ambil Channel ID

1. Di aplikasi Discord: **User Settings (ikon gir) → Advanced → aktifkan Developer Mode**.
2. Klik kanan channel tujuan → **Copy Channel ID** (berupa angka panjang, mis. `123456789012345678`).
3. Tempel Channel ID itu ke panel konfigurasi Relay. Semua pesan hanya dikirim ke channel tersebut.

## Menjalankan proyek

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # verifikasi produksi
npx tsc --noEmit
```

## Keamanan

- Bot Token disimpan di **localStorage browser milik user** (tidak ada akun, tidak ada database).
- Setiap request ke Discord **WAJIB lewat API Route milik aplikasi ini** (`/api/discord/check`, `/api/discord/send`) karena Discord API tidak mendukung CORS dari browser. Browser tidak pernah memanggil `discord.com` langsung.
- API Route **tidak menyimpan/mencatat token di mana pun**: tanpa database, tanpa file, tanpa `console.log` berisi token. Token hanya diteruskan sebagai header `Authorization: Bot <token>` ke Discord lalu dilupakan.
- Jangan pernah memakai token akun pribadi (user token / self-bot): melanggar Ketentuan Layanan Discord dan dapat menyebabkan akun diblokir. Relay menolak token non-bot saat cek status.

## Struktur (M1–M2)

```text
src/
  app/
    page.tsx                    # header + ConfigPanel + SendPanel
    layout.tsx                  # font Patrick Hand (judul) + Inter (body)
    globals.css                 # token warna monokrom + utilitas sketsa
    api/discord/check/route.ts  # uji token + akses channel (server-side)
    api/discord/send/route.ts   # kirim pesan, opsi code block (server-side)
  components/
    ThemeToggle.tsx             # toggle siang/malam monokrom
    ConfigPanel.tsx             # form token + channel ID + cek status
    SendPanel.tsx               # form kirim pesan + riwayat sesi ini
  hooks/
    useTheme.ts                 # state tema + localStorage + class dark
    useBotConfig.ts             # draft form + kredensial terverifikasi + status
  lib/
    types.ts                    # BotStatus, CheckStatusResult, SendMessageResult
    discord.ts                  # client helper → fetch ke API Route
```
