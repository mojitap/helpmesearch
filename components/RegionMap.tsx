// components/RegionMap.tsx
"use client";

import Link from "next/link";
import { REG8_LABEL, type Region8Key } from "@/app/lib/jp";

// やさしい配色（お好みで調整可）
const COLORS: Record<Region8Key, string> = {
  hokkaido: "#E8F4FF",
  tohoku: "#EAF7EA",
  kanto: "#FFF2E8",
  chubu: "#EFE9FD",
  kinki: "#FFF9CC",
  chugoku: "#EAF6FF",
  shikoku: "#EFFFF3",
  kyushu: "#FFEFF5",
};

// 日本地図“っぽい”配置（12分割グリッド上に並べる）
const POS: Record<
  Region8Key,
  { col: [number, number]; row: [number, number] }
> = {
  hokkaido: { col: [3, 11], row: [1, 3] }, // 北（横長）
  tohoku:   { col: [6, 12], row: [2, 4] }, // 北東
  kanto:    { col: [7, 12], row: [3, 5] }, // 関東
  chubu:    { col: [4, 11], row: [4, 6] }, // 中央
  kinki:    { col: [5, 10], row: [5, 7] }, // 近畿
  chugoku:  { col: [3, 9],  row: [6, 7] }, // 中国
  shikoku:  { col: [4, 7],  row: [7, 8] }, // 四国
  kyushu:   { col: [2, 7],  row: [7, 9] }, // 九州（南西）
};

export default function RegionMap() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      {/* PC/タブレット：地図風の固定配置 */}
      <div
        className="hidden md:grid gap-3"
        style={{
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gridAutoRows: "84px",
        }}
      >
        {(Object.keys(REG8_LABEL) as Region8Key[]).map((k) => {
          const pos = POS[k];
          return (
            <Link
              key={k}
              href={`/region8/${k}`}
              style={{
                gridColumn: `${pos.col[0]} / ${pos.col[1]}`,
                gridRow: `${pos.row[0]} / ${pos.row[1]}`,
                backgroundColor: COLORS[k],
              }}
              className="rounded-2xl border border-black/10 p-4 shadow-sm hover:shadow-md transition outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <div className="font-semibold">{REG8_LABEL[k]}</div>
            </Link>
          );
        })}
      </div>

      {/* スマホ：1カラム（上から順に並べる） */}
      <div className="grid md:hidden grid-cols-1 gap-3">
        {(Object.keys(REG8_LABEL) as Region8Key[]).map((k) => (
          <Link
            key={k}
            href={`/region8/${k}`}
            style={{ backgroundColor: COLORS[k] }}
            className="rounded-2xl border border-black/10 p-4 shadow-sm"
          >
            <div className="font-semibold">{REG8_LABEL[k]}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}