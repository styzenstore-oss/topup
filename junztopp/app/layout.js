import "./globals.css";

export const metadata = {
  title: "JunzTopp - Topup Game Termurah",
  description: "Topup game cepat, aman, dan murah. Bayar pakai QRIS/e-wallet, proses otomatis.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <header className="nav">
          <a href="/" className="brand">JunzTopp</a>
          <nav>
            <a href="/riwayat">Riwayat</a>
            <a href="/login">Masuk</a>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <p>© {new Date().getFullYear()} JunzTopp. Butuh bantuan? WhatsApp: wa.me/agenstyzenid</p>
        </footer>
      </body>
    </html>
  );
}
