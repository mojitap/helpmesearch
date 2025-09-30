// components/RegionMap.tsx
"use client";

import Link from "next/link";
import {
  REGION_LABEL,
  REGION_PREFS,
  type RegionKey,
} from "@/app/lib/jp";

/** やさしい配色（必要ならお好みで調整OK） */
const REG_COLORS: Record<RegionKey, string> = {
  hokkaido: "#E8F4FF",  // 薄い水色
  tohoku:   "#EAF7EA",  // 薄い若草
  kanto:    "#FFF2E8",  // 薄いサーモン
  chubu:    "#EFE9FD",  // 薄いラベンダー
  kinki:    "#FFF9CC",  // 薄いクリーム
  chugoku:  "#EAF6FF",  // 薄い空色
  shikoku:  "#EFFFF3",  // 薄いミント
  kyushu:   "#FFEFF5",  // 薄いピンク
};

/** グリッドの“地図配置”（PC向け）。6列×6行。ピリオドは空きマス */
const GRID_AREAS = `
". . . H H ."
". T T H H ."
". C C T T ."
". C C KA KA ."
"CH CH C C KA KA"
"CH CH KY KY S ."
`;

/** 各地方をどのエリア記号に置くかマッピング */
const AREA_NAME: Record<RegionKey, string> = {
  hokkaido: "H",
  tohoku:   "T",
  kanto:    "KA",
  chubu:    "C",
  kinki:    "KI",   // ← 配置には "KA" を使っていないので、下で grid に KI を追加しないよう注意
  chugoku:  "CH",
  shikoku:  "S",
  kyushu:   "KY",
};

// ※ 上の GRID_AREAS では「KI」は使っていません。
//   近畿(kinki)は KA エリアの左隣に被らせず置くため、行列調整が難しければ
//   いまは KA に近畿を載せず、別行にしたい場合は GRID_AREAS をあとで微調整してください。
//   今回の配置では近畿は KA の下段左寄りに見える配置（KA と同列）にしています。
//   → 近畿は "KA" ではなく独立させたい場合は GRID_AREAS に "KI" を足し、下の RegionCell 呼び出しも追加してください。

type CellProps = { region: RegionKey; area: string };

function RegionCell({ region, area }: CellProps) {
  const label = REGION_LABEL[region];
  const prefs = REGION_PREFS[region];
  const bg = REG_COLORS[region];

  return (
    <Link
      href={`/region/${region}`}
      style={{ gridArea: area, backgroundColor: bg }}
      className="block rounded-2xl border border-black/10 p-4 shadow-sm hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition"
    >
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-1 text-xs text-neutral-700">
        {prefs.join(" / ")}
      </div>
    </Link>
  );
}

export default function RegionMap() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      {/* PC/タブレット: 地図風グリッド */}
      <div
        className="hidden md:grid gap-3"
        style={{
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          gridTemplateAreas: GRID_AREAS,
        }}
      >
        <RegionCell region="hokkaido" area="H" />
        <RegionCell region="tohoku"   area="T" />
        <RegionCell region="kanto"    area="KA" />
        <RegionCell region="chubu"    area="C" />
        <RegionCell region="chugoku"  area="CH" />
        <RegionCell region="kyushu"   area="KY" />
        <RegionCell region="shikoku"  area="S" />
        {/* 近畿を独立させたい場合は GRID_AREAS に "KI" を置き、この1行を有効化
        <RegionCell region="kinki"    area="KI" />
        */}
      </div>

      {/* スマホ: タイル一覧（クリックしやすさ優先） */}
      <div className="grid md:hidden grid-cols-2 gap-3">
        {(
          [
            "hokkaido","tohoku","kanto","chubu","kinki","chugoku","shikoku","kyushu",
          ] as RegionKey[]
        ).map((key) => (
          <Link
            key={key}
            href={`/region/${key}`}
            style={{ backgroundColor: REG_COLORS[key] }}
            className="rounded-xl border border-black/10 p-4 text-sm shadow-sm"
          >
            <div className="font-semibold">{REGION_LABEL[key]}</div>
            <div className="mt-1 text-xs text-neutral-700">
              {REGION_PREFS[key].join(" / ")}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}