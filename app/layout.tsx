export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="bg-white">
      <head>
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="bg-white text-neutral-900">{children}</body>
    </html>
  );
}

/* === ライト固定（最後に置く）=== */
:root { color-scheme: light; }
html, body { background: #fff !important; color: #171717 !important; }