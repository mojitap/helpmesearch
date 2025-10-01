// components/RegionMap.tsx
"use client";

import Link from "next/link";
import { REG8_LABEL, type Region8Key } from "@/app/lib/jp";

// やさしい配色
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

// 12列×可変行の“日本っぽい”配置
// （右上=北海道 → 左下=九州の対角線に流れる）
const POS: Record<
  Region8Key,
  { col: [number, number]; row: [number, number] }
> = {
  // 上にいくほど row が小さく、右へ行くほど col が大きい
  hokkaido: { col: [8, 12], row: [1, 3] },
  tohoku:   { col: [9, 12], row: [2, 4] },
  kanto:    { col: [8, 12], row: [3, 5] },
  chubu:    { col: [6, 10], row: [4, 6] },
  kinki:    { col: [5, 9],  row: [5, 7] },
  chugoku:  { col: [3, 7],  row: [6, 7] },
  shikoku:  { col: [4, 6],  row: [7, 8] },
  kyushu:   { col: [2, 6],  row: [7, 9] },
};

export default function RegionMap() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div
        className="grid gap-3"
        style={{
          // 12 列固定。高さは画面幅に応じてスケール
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gridAutoRows: "clamp(56px, 8.5vw, 100px)",
          minHeight: "520px", // 縦に詰まり過ぎないように
        }}
      >
        {(Object.keys(REG8_LABEL) as Region8Key[]).map((k) => {
          const p = POS[k];
          return (
            <Link
              key={k}
              href={`/region8/${k}`}
              style={{
                gridColumn: `${p.col[0]} / ${p.col[1]}`,
                gridRow: `${p.row[0]} / ${p.row[1]}`,
                backgroundColor: COLORS[k],
              }}
              className="rounded-2xl border border-black/10 p-4 shadow-sm hover:shadow-md transition outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <div className="font-semibold">{REG8_LABEL[k]}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}