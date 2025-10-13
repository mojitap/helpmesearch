"use client";

import Script from "next/script";
import { useEffect, useId } from "react";

type Variant = "leaderboard" | "rectangle" | "infeed" | "sidebar";
type Props = {
  client?: string; // 例: NEXT_PUBLIC_ADSENSE_CLIENT
  slot?: string;   // 例: NEXT_PUBLIC_ADSENSE_SLOT_*
  variant?: Variant;
  className?: string;
  style?: React.CSSProperties;
  /** 開発中もダミー枠を見たいときだけ true。既定は非表示 */
  showPlaceholder?: boolean;
};

export default function AdSlot({
  client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT,
  slot,
  variant = "leaderboard",
  className,
  style,
  showPlaceholder = false,
}: Props) {
  const id = useId();

  // スロットIDを variant から自動選択（省力化）
  const autoSlot =
    slot ??
    (variant === "leaderboard"
      ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_LEADER
      : variant === "sidebar"
      ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR
      : process.env.NEXT_PUBLIC_ADSENSE_SLOT_INFEED);

  // env が無ければ「何も出さない」＝プレースホルダー非表示
  if (!client || !autoSlot) {
    if (!showPlaceholder) return null;
    const base =
      variant === "leaderboard" ? "h-[90px]" :
      variant === "sidebar"     ? "h-[600px] w-[300px] mx-auto" :
      variant === "rectangle"   ? "h-[250px]" : "h-[180px]";
    return (
      <div
        className={`w-full ${base} rounded-xl border border-dashed border-neutral-300
                    bg-neutral-50 grid place-items-center text-neutral-400 ${className || ""}`}
        style={style}
        aria-label="Ad placeholder"
      >
        AD
      </div>
    );
  }

  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, [client, autoSlot, variant]);

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
        data-ad-slot={autoSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </>
  );
}