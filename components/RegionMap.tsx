// components/RegionMap.tsx
"use client";

import Link from "next/link";
import { REG8_LABEL } from "@/app/lib/jp";

// 地方キー型（lib/jp.ts の REG8_LABEL のキー）
type Region8Key = keyof typeof REG8_LABEL;

const COLORS: Record<Region8Key, string> = {
  hokkaido: "#E8F4FF",
  tohoku:   "#EAF7EA",
  kanto:    "#FFF2E8",
  chubu:    "#EFE9FD",
  kinki:    "#FFF9CC",
  chugoku:  "#EAF6FF",
  shikoku:  "#EFFFF3",
  kyushu:   "#FFEFF5",
};

const HOVER = "#ffffff80"; // ほんのり白抜き

export default function RegionMap() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      {/* アスペクト比を固定して縮尺を保つ */}
      <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
        <svg
          viewBox="0 0 600 800"
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 北海道 */}
          <RegionArea k="hokkaido" fill={COLORS.hokkaido}>
            {/* ざっくり形の多角形（地図“風”のシルエット） */}
            <polygon points="440,70 560,120 520,200 450,190 410,140" />
          </RegionArea>

          {/* 東北 */}
          <RegionArea k="tohoku" fill={COLORS.tohoku}>
            <polygon points="410,160 480,240 450,300 380,260 360,200" />
          </RegionArea>

          {/* 関東 */}
          <RegionArea k="kanto" fill={COLORS.kanto}>
            <polygon points="380,300 500,340 490,400 410,390 360,350" />
          </RegionArea>

          {/* 中部 */}
          <RegionArea k="chubu" fill={COLORS.chubu}>
            <polygon points="300,320 400,410 360,480 260,460 240,390" />
          </RegionArea>

          {/* 近畿 */}
          <RegionArea k="kinki" fill={COLORS.kinki}>
            <polygon points="230,450 310,500 280,560 210,540 190,490" />
          </RegionArea>

          {/* 中国 */}
          <RegionArea k="chugoku" fill={COLORS.chugoku}>
            <polygon points="150,500 240,530 220,590 130,580 100,540" />
          </RegionArea>

          {/* 四国 */}
          <RegionArea k="shikoku" fill={COLORS.shikoku}>
            <polygon points="160,610 230,630 210,670 140,660 120,630" />
          </RegionArea>

          {/* 九州 */}
          <RegionArea k="kyushu" fill={COLORS.kyushu}>
            <polygon points="70,620 120,660 100,720 30,700 20,640" />
          </RegionArea>
        </svg>
      </div>

      {/* スクリーンリーダー/SEO フォールバック */}
      <ul className="sr-only">
        {(Object.keys(REG8_LABEL) as Region8Key[]).map((k) => (
          <li key={k}>
            <Link href={`/region8/${k}`}>{REG8_LABEL[k]}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 単一地方のクリック領域+ホバー効果 */
function RegionArea({
  k,
  fill,
  children,
}: {
  k: Region8Key;
  fill: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={`/region8/${k}`} aria-label={REG8_LABEL[k]}>
      <g
        tabIndex={0}
        role="button"
        className="transition-all"
        style={{ cursor: "pointer" }}
      >
        <g className="drop-shadow">
          <g fill={fill} stroke="#00000022" strokeWidth={1.5}>
            {children}
          </g>
        </g>
        {/* hover/focus でうっすらハイライト */}
        <g fill="transparent" className="group">
          <g
            className="hover:opacity-100 focus:opacity-100 opacity-0 transition-opacity"
            fill="#ffffff80"
          >
            {children}
          </g>
        </g>
      </g>
    </Link>
  );
}