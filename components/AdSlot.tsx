"use client";

import Script from "next/script";
import { useEffect, useId } from "react";

type Variant = "leaderboard" | "rectangle" | "infeed" | "sidebar";
type Props = {
  /** 例: "ca-pub-xxxxxxxxxxxxxxxx"。env が無ければプレースホルダー表示 */
  client?: string;
  /** 例: "1234567890"（広告ユニット） */
  slot?: string;
  variant?: Variant;
  className?: string;
  style?: React.CSSProperties;
};

export default function AdSlot({
  client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT,
  slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT, // 置き換え可
  variant = "leaderboard",
  className,
  style,
}: Props) {
  const id = useId();

  // env 未設定ならダミー枠を表示（デザイン保持用）
  if (!client || !slot) {
    const base =
      variant === "leaderboard" ? "h-[90px]" :
      variant === "sidebar"     ? "h-[600px]" :
      variant === "rectangle"   ? "h-[250px]" : "h-[180px]";
    return (
      <div
        className={`w-full ${base} min-h-[90px] rounded-xl border border-dashed border-neutral-300 bg-neutral-50 grid place-items-center text-neutral-400 ${className || ""}`}
        style={style}
        aria-label="Ad placeholder"
      >
        AD
      </div>
    );
  }

  // AdSense 本体
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, [client, slot, variant]);

  const sizeStyle: React.CSSProperties =
    variant === "leaderboard"
      ? { minHeight: 90 }
      : variant === "sidebar"
      ? { minHeight: 600, width: 300, margin: "0 auto" }
      : variant === "rectangle"
      ? { minHeight: 250 }
      : { minHeight: 180 }; // infeed

  return (
    <>
      <Script
        id={`adsense-init-${id}`}
        strategy="afterInteractive"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
        crossOrigin="anonymous"
      />
      <ins
        className={`adsbygoogle block ${className || ""}`}
        style={{ display: "block", ...sizeStyle, ...style }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </>
  );
}