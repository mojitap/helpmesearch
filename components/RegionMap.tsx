// components/RegionMap.tsx
"use client";

import Link from "next/link";
import { REG8_LABEL, type Region8Key } from "@/app/lib/jp";

/** やさしい配色（8地方ぶん） */
const REGION_COLORS: Record<Region8Key, string> = {
  hokkaido: "#E8F4FF",
  tohoku:   "#EAF7EA",
  kanto:    "#FFF2E8",
  chubu:    "#EFE9FD",
  kinki:    "#FFF9CC",
  chugoku:  "#EAF6FF",
  shikoku:  "#EFFFF3",
  kyushu:   "#FFEFF5",
};

/** PC/タブレット：日本地図っぽい配置（8カラム × 可変行） */
type TileSpec = {
  key: Region8Key;
  colStart: number; colSpan: number;
  rowStart: number; rowSpan: number;
};
const PC_LAYOUT: TileSpec[] = [
  // 北から南へ流れる配置（微調整は下の数字だけ変えればOK）
  { key: "hokkaido", colStart: 7, colSpan: 2, rowStart: 1, rowSpan: 2 },
  { key: "tohoku",   colStart: 6, colSpan: 2, rowStart: 2, rowSpan: 2 },
  { key: "kanto",    colStart: 7, colSpan: 2, rowStart: 4, rowSpan: 2 },
  { key: "chubu",    colStart: 5, colSpan: 2, rowStart: 4, rowSpan: 2 },
  { key: "kinki",    colStart: 6, colSpan: 2, rowStart: 6, rowSpan: 2 },
  { key: "chugoku",  colStart: 4, colSpan: 2, rowStart: 6, rowSpan: 2 },
  { key: "shikoku",  colStart: 5, colSpan: 1, rowStart: 8, rowSpan: 1 },
  { key: "kyushu",   colStart: 3, colSpan: 2, rowStart: 8, rowSpan: 2 },
];

export default function RegionMap() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      {/* PC/タブレット：地図風タイル */}
      <div className="hidden md:grid map-grid">
        {PC_LAYOUT.map(({ key, colStart, colSpan, rowStart, rowSpan }) => (
          <Link
            key={key}
            href={`/region/${key}`}
            className="tile"
            style={{
              gridColumn: `${colStart} / span ${colSpan}`,
              gridRow: `${rowStart} / span ${rowSpan}`,
              backgroundColor: REGION_COLORS[key],
            }}
            aria-label={REG8_LABEL[key]}
          >
            <span className="label">{REG8_LABEL[key]}</span>
          </Link>
        ))}
      </div>

      {/* スマホ：2カラムのシンプルなタイル */}
      <div className="grid md:hidden grid-cols-2 gap-3">
        {(Object.keys(REG8_LABEL) as Region8Key[]).map((k) => (
          <Link
            key={k}
            href={`/region/${k}`}
            className="rounded-xl border border-black/10 p-4 shadow-sm"
            style={{ backgroundColor: REGION_COLORS[k] }}
            aria-label={REG8_LABEL[k]}
          >
            <span className="font-semibold">{REG8_LABEL[k]}</span>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .map-grid {
          grid-template-columns: repeat(8, minmax(0, 1fr));
          grid-auto-rows: 76px;
          gap: 14px;
        }
        .tile {
          display: flex;
          align-items: center;
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,.1);
          box-shadow: 0 1px 2px rgba(0,0,0,.06);
          transition: box-shadow .15s ease, transform .1s ease;
        }
        .tile:hover { box-shadow: 0 2px 8px rgba(0,0,0,.12); transform: translateY(-1px); }
        .label { font-weight: 700; font-size: 14px; }
      `}</style>
    </section>
  );
}