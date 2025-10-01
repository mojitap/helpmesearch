// components/PrefTileMap.tsx
"use client";

import Link from "next/link";
import {
  REG8_LABEL,
  PREF_TO_REG8,
  type Region8Key,
  type PrefValue,
} from "@/app/lib/jp";

type Mode = "pref" | "region";

// 8地方を面で置く（隙間を詰めた日本っぽい並び）
const REG_GRID = `
". . HK HK HK . . ."
". . HK HK HK . . ."
". TH TH TH . . . ."
". TH TH TH KA KA . ."
"CB CB CB TH KA KA . ."
"CB CB CB KI KI . . ."
"KY KY CH CH KI . . ."
"KY KY SH SH . . . ."
`;

function RegionBlock({
  region,
  area,
}: {
  region: Region8Key;
  area: string;
}) {
  return (
    <Link
      href={`/region8/${region}`}
      style={{ gridArea: area, backgroundColor: COLORS[region] }}
      className="flex items-center justify-center rounded-[12px] border border-black/10 p-4 text-white shadow-sm hover:shadow-md"
      aria-label={REG8_LABEL[region]}
    >
      <span className="font-semibold">{REG8_LABEL[region]}</span>
    </Link>
  );
}

/** 地方モード専用の密なレイアウト */
function RegionBlocksDense() {
  return (
    <div
      className="grid gap-0"
      style={{
        gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
        gridTemplateAreas: REG_GRID,
      }}
    >
      <RegionBlock region="hokkaido" area="HK" />
      <RegionBlock region="tohoku" area="TH" />
      <RegionBlock region="kanto" area="KA" />
      <RegionBlock region="chubu" area="CB" />
      <RegionBlock region="kinki" area="KI" />
      <RegionBlock region="chugoku" area="CH" />
      <RegionBlock region="shikoku" area="SH" />
      <RegionBlock region="kyushu" area="KY" />
    </div>
  );
}

/** 8地方の色（要求通り：東北=青 / 関東=黄） */
const COLORS: Record<Region8Key, string> = {
  hokkaido: "#7ACB7A",
  tohoku:   "#5DA8E8",
  kanto:    "#F4D35E",
  chubu:    "#F29B77",
  kinki:    "#60C2C9",
  chugoku:  "#A58AD8",
  shikoku:  "#9DA4F0",
  kyushu:   "#E89AB5",
};

/** ラベル短縮（2〜3字） */
const ABBR: Partial<Record<PrefValue, string>> = {
  北海道:"北海道", 青森県:"青森", 岩手県:"岩手", 宮城県:"宮城", 秋田県:"秋田", 山形県:"山形", 福島県:"福島",
  茨城県:"茨城", 栃木県:"栃木", 群馬県:"群馬", 埼玉県:"埼玉", 千葉県:"千葉", 東京都:"東京", 神奈川県:"神奈川",
  新潟県:"新潟", 富山県:"富山", 石川県:"石川", 福井県:"福井", 山梨県:"山梨", 長野県:"長野", 岐阜県:"岐阜",
  静岡県:"静岡", 愛知県:"愛知",
  三重県:"三重", 滋賀県:"滋賀", 京都府:"京都", 大阪府:"大阪", 兵庫県:"兵庫", 奈良県:"奈良", 和歌山県:"和歌山",
  鳥取県:"鳥取", 島根県:"島根", 岡山県:"岡山", 広島県:"広島", 山口県:"山口",
  徳島県:"徳島", 香川県:"香川", 愛媛県:"愛媛", 高知県:"高知",
  福岡県:"福岡", 佐賀県:"佐賀", 長崎県:"長崎", 大分県:"大分", 熊本県:"熊本", 宮崎県:"宮崎", 鹿児島県:"鹿児島", 沖縄県:"沖縄",
};

/** 13x11 の都道府県タイル配置（既存どおり） */
type Tile = { p: PrefValue; c: number; r: number; w?: number; h?: number };
const TILES: Tile[] = [
  { p:"北海道", c:11, r:1,  w:3, h:2 },
  { p:"青森県", c:13, r:3 }, { p:"秋田県", c:12, r:3 },
  { p:"岩手県", c:13, r:4 }, { p:"山形県", c:12, r:4 },
  { p:"宮城県", c:13, r:5 }, { p:"福島県", c:13, r:6 },
  { p:"茨城県", c:12, r:6 }, { p:"栃木県", c:12, r:5 }, { p:"群馬県", c:11, r:5 },
  { p:"埼玉県", c:11, r:6 }, { p:"千葉県", c:12, r:7 },
  { p:"東京都", c:11, r:7 }, { p:"神奈川県", c:11, r:8 },
  { p:"新潟県", c:10, r:4 }, { p:"富山県", c:9,  r:4 }, { p:"石川県", c:8,  r:4 }, { p:"福井県", c:8,  r:5 },
  { p:"長野県", c:9,  r:5 }, { p:"岐阜県", c:10, r:5 }, { p:"山梨県", c:10, r:6 }, { p:"静岡県", c:11, r:9 }, { p:"愛知県", c:10, r:7 },
  { p:"滋賀県", c:9,  r:6 }, { p:"京都府", c:8,  r:6 }, { p:"大阪府", c:8,  r:7 }, { p:"兵庫県", c:7,  r:6 },
  { p:"奈良県", c:9,  r:7 }, { p:"和歌山県", c:8,  r:8 }, { p:"三重県", c:10, r:8 },
  { p:"鳥取県", c:6,  r:6 }, { p:"島根県", c:5,  r:6 }, { p:"岡山県", c:6,  r:7 }, { p:"広島県", c:5,  r:7 }, { p:"山口県", c:4,  r:7 },
  { p:"香川県", c:6,  r:8 }, { p:"徳島県", c:7,  r:8 }, { p:"愛媛県", c:5,  r:8 }, { p:"高知県", c:6,  r:9 },
  { p:"福岡県", c:4,  r:8 }, { p:"佐賀県", c:3,  r:8 }, { p:"長崎県", c:2,  r:8 }, { p:"大分県", c:5,  r:9 },
  { p:"熊本県", c:4,  r:9 }, { p:"宮崎県", c:5,  r:10 }, { p:"鹿児島県", c:4,  r:10 }, { p:"沖縄県", c:2,  r:11 },
];

export default function PrefTileMap({ mode = "pref" }: { mode?: Mode }) {
  // ★ “地方モード” は 8ブロックだけを表示して即 return
  if (mode === "region") {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        <RegionBlocksDense />
      </section>
    );
  }

  // 以降は “都道府県モード” 専用
  return (
    <section className="mx-auto w-full px-4 py-8">
      <div className="overflow-x-auto">
        <div
          className="grid gap-2 rounded-2xl bg-white/10 p-2"
          style={{
            gridTemplateColumns: "repeat(13, 48px)",
            gridTemplateRows: "repeat(11, 48px)",
          }}
        >
          {TILES.map((t) => {
            const region = PREF_TO_REG8[t.p];
            const color = COLORS[region];
            const href = `/pref/${encodeURIComponent(t.p)}`;
            const label = ABBR[t.p] ?? t.p;

            return (
              <Link
                key={`${t.p}-${t.c}-${t.r}`}
                href={href}
                style={{
                  gridColumn: `${t.c} / span ${t.w ?? 1}`,
                  gridRow: `${t.r} / span ${t.h ?? 1}`,
                  background: color,
                }}
                className="flex items-center justify-center rounded-[8px] border border-black/10 text-[12px] leading-tight text-white shadow-sm hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                aria-label={t.p}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-neutral-500">
        色は地方ごと（北海道=緑／東北=青／関東=黄／中部=橙／近畿=シアン／中国=紫／四国=薄紫／九州=ピンク）
      </p>
    </section>
  );
}