/** Footer Relay: 3 kolom di desktop, tumpuk di mobile. */
export function Footer() {
  return (
    <footer className="border-t-2 border-[var(--line)] pt-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div>
          <p className="font-hand text-2xl leading-none">Relay</p>
          <p className="mt-2 text-xs leading-5 opacity-70">
            Web tools untuk mengirim pesan ke channel Discord lewat Bot Discord resmi.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold">Disclaimer</p>
          <p className="mt-2 text-xs leading-5 opacity-70">
            Relay adalah alat independen yang memakai Bot Discord resmi — bukan self-bot — dan tidak
            berafiliasi dengan Discord Inc. Discord adalah merek dagang milik Discord Inc.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold">Privasi</p>
          <p className="mt-2 text-xs leading-5 opacity-70">
            Bot Token dan pesan dikirim dari browser melalui API Route milik Relay sendiri ke
            Discord; tidak pernah disimpan di server/database. Tanpa analytics atau pelacak.
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3 text-[11px] opacity-70">
        <span>© 2026 Relay</span>
        <span className="font-mono">diproses via API Route sendiri</span>
      </div>
    </footer>
  );
}
