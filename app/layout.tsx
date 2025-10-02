// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// ▼ 追加
import Script from "next/script";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HelpMeSearch",
  description: "介護・医療を横断検索するポータル",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 rounded bg-blue-600 px-3 py-2 text-white"
        >
          本文へ移動
        </a>
        {children}

        {/* ▼ 追加：ボタン/モーダルを注入するスクリプトを読み込み */}
        <Script src="/hms4.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}