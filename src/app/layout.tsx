import type { Metadata } from "next";
import { Inter, Patrick_Hand } from "next/font/google";
import "./globals.css";

// Font handwriting untuk judul: "Patrick Hand" dipilih karena paling
// jelas terbaca di ukuran judul dibanding Caveat/Kalam yang lebih miring.
const handFont = Patrick_Hand({
  variable: "--font-hand",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const sansFont = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Relay — Kirim Pesan ke Discord",
  description:
    "Web tools untuk mengirim pesan ke channel Discord lewat Bot Discord resmi (bukan self-bot).",
};

function themeInitScript() {
  // Dijalankan sebelum render agar tidak kedip saat ganti tema.
  // Murni monokrom: hanya toggle class "dark" di <html>.
  return `(function(){try{var t=localStorage.getItem("relay-theme");if(t==="gelap"){document.documentElement.classList.add("dark")}else if(t==="terang"){document.documentElement.classList.remove("dark")}else if(window.matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.classList.add("dark")}}catch(e){}})();`;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${handFont.variable} ${sansFont.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
