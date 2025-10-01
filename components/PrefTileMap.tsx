// components/PrefTileMap.tsx
"use client";

import Link from "next/link";
import { PREFS_47, type PrefValue } from "@/app/lib/jp";

/** 8地方の色（要求通り：東北=青 / 関東=黄） */
const REGION_OF: Record<PrefValue, "hokkaido"|"tohoku"|"kanto"|"chubu"|"kinki"|"chugoku"|"shikoku"|"kyushu"> = {
  // 北海道
  北海道: "hokkaido",
  // 東北
  青森県: "tohoku", 岩手県: "tohoku", 宮城県: "tohoku", 秋田県: "tohoku", 山形県: "tohoku", 福島県: "tohoku",
  // 関東
  東京都: "kanto", 神奈川県: "kanto", 千葉県: "kanto", 埼玉県: "kanto", 茨城県: "kanto", 栃木県: "kanto", 群馬県: "kanto",
  // 中部
  新潟県: "chubu", 富山県: "chubu", 石川県: "chubu", 福井県: "chubu", 山梨県: "chubu", 長野県: "chubu",
  岐阜県: "chubu", 静岡県: "chubu", 愛知県: "chubu",
  // 近畿
  三重県: "kinki", 滋賀県: "kinki", 京都府: "kinki", 大阪府: "kinki", 兵庫県: "kinki", 奈良県: "kinki", 和歌山県: "kinki",
  // 中国
  鳥取県: "chugoku", 島根県: "chugoku", 岡山県: "chugoku", 広島県: "chugoku", 山口県: "chugoku",
  // 四国
  徳島県: "shikoku", 香川県: "shikoku", 愛媛県: "shikoku", 高知県: "shikoku",
  // 九州
  福岡県: "kyushu", 佐賀県: "kyushu", 長崎県: "kyushu", 大分県: "kyushu",
  熊本県: "kyushu", 宮崎県: "kyushu", 鹿児島県: "kyushu", 沖縄県: "kyushu",
};

const COLORS = {
  hokkaido: "#7ACB7A",   // 緑
  tohoku:    "#5DA8E8",   // 青
  kanto:     "#F4D35E",   // 黄
  chubu:     "#F29B77",   // 橙
  kinki:     "#60C2C9",   // シアン
  chugoku:   "#A58AD8",   // 紫
  shikoku:   "#9DA4F0",   // 薄紫
  kyushu:    "#E89AB5",   // ピンク
} as const;

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

/**
 * 13x10 の CSS Grid 上に「日本型」の座標で47タイルを配置
 * （よく見るタイル地図の定番配置に近い並び）
 */
type Tile = { p: PrefValue; c: number; r: number; w?: number; h?: number };

// Hokkaido を少し大きめにして、東北→関東→中部…と斜めに流れる配置
const TILES: Tile[] = [
  // 北海道
  { p:"北海道", c:11, r:1, w:3, h:2 },

  // 東北（青）
  { p:"青森県", c:13, r:3 }, { p:"秋田県", c:12, r:3 },
  { p:"岩手県", c:13, r:4 }, { p:"山形県", c:12, r:4 },
  { p:"宮城県", c:13, r:5 }, { p:"福島県", c:13, r:6 },

  // 関東（黄）
  { p:"茨城県", c:12, r:6 }, { p:"栃木県", c:12, r:5 }, { p:"群馬県", c:11, r:5 },
  { p:"埼玉県", c:11, r:6 }, { p:"千葉県", c:12, r:7 },
  { p:"東京都", c:11, r:7 }, { p:"神奈川県", c:11, r:8 },

  // 中部（橙）
  { p:"新潟県", c:10, r:4 }, { p:"富山県", c:9, r:4 }, { p:"石川県", c:8, r:4 }, { p:"福井県", c:8, r:5 },
  { p:"長野県", c:9, r:5 }, { p:"岐阜県", c:10, r:5 },
  { p:"山梨県", c:10, r:6 }, { p:"静岡県", c:11, r:9 }, { p:"愛知県", c:10, r:7 },

  // 近畿（シアン）
  { p:"滋賀県", c:9, r:6 }, { p:"京都府", c:8, r:6 }, { p:"大阪府", c:8, r:7 },
  { p:"兵庫県", c:7, r:6 }, { p:"奈良県", c:9, r:7 }, { p:"和歌山県", c:8, r:8 }, { p:"三重県", c:10, r:8 },

  // 中国（紫）
  { p:"鳥取県", c:6, r:6 }, { p:"島根県", c:5, r:6 }, { p:"岡山県", c:6, r:7 },
  { p:"広島県", c:5, r:7 }, { p:"山口県", c:4, r:7 },

  // 四国（薄紫）
  { p:"香川県", c:6, r:8 }, { p:"徳島県", c:7, r:8 },
  { p:"愛媛県", c:5, r:8 }, { p:"高知県", c:6, r:9 },

  // 九州（ピンク）
  { p:"福岡県", c:4, r:8 }, { p:"佐賀県", c:3, r:8 }, { p:"長崎県", c:2, r:8 },
  { p:"大分県", c:5, r:9 }, { p:"熊本県", c:4, r:9 }, { p:"宮崎県", c:5, r:10 }, { p:"鹿児島県", c:4, r:10 },
  { p:"沖縄県", c:2, r:11 },
];

/** 1タイルの見た目 */
function TileBox({ t }: { t: Tile }) {
  const region = REGION_OF[t.p];
  const color = COLORS[region];
  const label = ABBR[t.p] ?? t.p;

  const style: React.CSSProperties = {
    gridColumn: `${t.c} / span ${t.w ?? 1}`,
    gridRow: `${t.r} / span ${t.h ?? 1}`,
    background: color,
  };

  return (
    <Link
      href={`/pref/${encodeURIComponent(t.p)}`}
      style={style}
      className="flex items-center justify-center rounded-[8px] border border-black/10 text-[12px] leading-tight text-white shadow-sm hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
      aria-label={t.p}
    >
      {label}
    </Link>
  );
}

export default function PrefTileMap() {
  return (
    <section className="mx-auto w-full px-4 py-8">
      {/* 横スクロール許容（スマホは縮小、PCは広め） */}
      <div className="overflow-x-auto">
        <div
          className="grid gap-2 rounded-2xl bg-white/10 p-2"
          style={{
            gridTemplateColumns: "repeat(13, 48px)",
            gridTemplateRows: "repeat(11, 48px)",
            // 画面幅でスケール（スマホで潰れ過ぎないよう clamp）
            // ※お好みで 44/52px など微調整OK
          }}
        >
          {TILES.map((t) => (
            <TileBox key={`${t.p}-${t.c}-${t.r}`} t={t} />
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-neutral-500">
        色は地方ごと（北海道=緑／東北=青／関東=黄／中部=橙／近畿=シアン／中国=紫／四国=薄紫／九州=ピンク）
      </p>
    </section>
  );
}