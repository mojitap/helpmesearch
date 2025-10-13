// components/AdSlot.tsx
"use client";

import { useEffect, useId } from "react";

type Variant = "leaderboard" | "sidebar" | "infeed" | "rectangle";
type Props = {
  /** AdSense の slot id（例: 1234567890）*/
  slotId?: string;
  /** レイアウトに応じた推奨サイズ */
  variant?: Variant;
  /** 追加の className（余白調整など） */
  className?: string;
  /** ラベル（アクセシビリティ用） */
  label?: string;
};

/**
 * AdSense を前提とした広告コンポーネント。
 * - `NEXT_PUBLIC_ADSENSE_CLIENT` を設定すると script を自動ロード
 * - `slotId` が無い場合/クライアントIDが無い場合は何も描画しない（プレースホルダも無し）
 */
export default function AdSlot({
  slotId,
  variant = "leaderboard",
  className = "",
  label = "広告",
}: Props) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT; // 例: ca-pub-xxxxxxxxxxxxxxxx
  const domId = useId();

  // 必須情報がなければ描画しない（ダミーテキストは出さない）
  if (!client || !slotId) return null;

  useEffect(() => {
    // スクリプトが未挿入なら 1回だけ読み込み
    const already = document.querySelector<HTMLScriptElement>('script[data-adsbygoogle="loaded"]');
    if (!already) {
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
      s.crossOrigin = "anonymous";
      s.setAttribute("data-adsbygoogle", "loaded");
      document.head.appendChild(s);
    }

    // レンダリング後に push
    // @ts-ignore
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }, [client, slotId]);

  // 推奨スタイル（レスポンシブ）
  const style: React.CSSProperties = { display: "block" };
  switch (variant) {
    case "leaderboard": // 728x90 / 970x90 / レスポンシブ
      style.minHeight = 90;
      break;
    case "sidebar": // 300x250 / 300x600 / レスポンシブ
      style.minHeight = 250;
      break;
    case "infeed": // 横幅に応じて可変
      style.minHeight = 180;
      break;
    case "rectangle": // 336x280 / 300x250
      style.minHeight = 250;
      break;
  }

  return (
    <div className={className} aria-label={label}>
      <ins
        key={domId}
        className="adsbygoogle"
        style={style}
        data-ad-client={client}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}