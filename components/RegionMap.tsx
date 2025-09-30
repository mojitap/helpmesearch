// components/RegionMap.tsx
"use client";

import Link from "next/link";
import { REGION_LABEL, REGION_PREFS } from "@/app/lib/jp";

// jp.ts が持っているキー（6区分 or 8区分）をそのまま採用
type K = keyof typeof REGION_LABEL;

// やさしい配色（存在するキーだけ使われます）
const REG_COLORS: Record<string, string> = {
  // 8区分系
  hokkaido: "#E8F4FF",
  tohoku: "#EAF7EA",
  kanto: "#FFF2E8",
  chubu: "#EFE9FD",
  kinki: "#FFF9CC",
  chugoku: "#EAF6FF",
  shikoku: "#EFFFF3",
  kyushu: "#FFEFF5",
  // 6区分系
  hokkaido_tohoku: "#E8F4FF",
  chugoku_shikoku: "#EAF6FF",
  kyushu_okinawa: "#FFEFF5",
};

// 8区分の地図っぽい配置
const GRID_8 = `
". . . H H ."
". T T H H ."
". C C T T ."
". C C KA KA ."
"CH CH C C KA KA"
"CH CH KY KY S ."
`;

// 6区分の簡易配置（“北海道・東北 / 関東 / 中部 / 近畿 / 中国・四国 / 九州・沖縄”）
const GRID_6 = `
". . . HT HT ."
". C C KA KA ."
"CH CH C C KA KA"
"CH CH KY KY . ."
`;

function RegionCell({ region, area }: { region: K; area: string }) {
  const label = REGION_LABEL[region];
  const prefs = (REGION_PREFS as Record<string, string[]>)[region] ?? [];
  const bg = REG_COLORS[region] ?? "#F8FAFC";

  return (
    <Link
      href={`/region/${region}`}
      style={{ gridArea: area, backgroundColor: bg }}
      className="block rounded-2xl border border-black/10 p-4 shadow-sm hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition"
    >
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-1 text-xs text-neutral-700">{prefs.join(" / ")}</div>
    </Link>
  );
}

export default function RegionMap() {
  // 8区分かどうかはキーの有無で判定
  const isEight =
    "hokkaido" in REGION_LABEL ||
    "tohoku" in REGION_LABEL ||
    "shikoku" in REGION_LABEL;

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      {/* PC/タブレット: 地図風グリッド */}
      {isEight ? (
        <div
          className="hidden md:grid gap-3"
          style={{
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            gridTemplateAreas: GRID_8,
          }}
        >
          {"hokkaido" in REGION_LABEL && <RegionCell region={"hokkaido" as K} area="H" />}
          {"tohoku"   in REGION_LABEL && <RegionCell region={"tohoku" as K}   area="T" />}
          {"kanto"    in REGION_LABEL && <RegionCell region={"kanto" as K}    area="KA" />}
          {"chubu"    in REGION_LABEL && <RegionCell region={"chubu" as K}    area="C" />}
          {"chugoku"  in REGION_LABEL && <RegionCell region={"chugoku" as K}  area="CH" />}
          {"kyushu"   in REGION_LABEL && <RegionCell region={"kyushu" as K}   area="KY" />}
          {"shikoku"  in REGION_LABEL && <RegionCell region={"shikoku" as K}  area="S" />}
          {"kinki"    in REGION_LABEL && (
            // 近畿を独立させたい場合は GRID_8 を微調整し、ここにも "KI" を置いてください。
            <RegionCell region={"kinki" as K} area="KA" />
          )}
        </div>
      ) : (
        <div
          className="hidden md:grid gap-3"
          style={{
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            gridTemplateAreas: GRID_6,
          }}
        >
          {"hokkaido_tohoku" in REGION_LABEL && (
            <RegionCell region={"hokkaido_tohoku" as K} area="HT" />
          )}
          {"kanto" in REGION_LABEL && <RegionCell region={"kanto" as K} area="KA" />}
          {"chubu" in REGION_LABEL && <RegionCell region={"chubu" as K} area="C" />}
          {"kinki" in REGION_LABEL && <RegionCell region={"kinki" as K} area="KA" />}
          {"chugoku_shikoku" in REGION_LABEL && (
            <RegionCell region={"chugoku_shikoku" as K} area="CH" />
          )}
          {"kyushu_okinawa" in REGION_LABEL && (
            <RegionCell region={"kyushu_okinawa" as K} area="KY" />
          )}
        </div>
      )}

      {/* スマホ: タイル一覧 */}
      <div className="grid md:hidden grid-cols-2 gap-3">
        {(Object.keys(REGION_LABEL) as K[]).map((key) => (
          <Link
            key={key}
            href={`/region/${key}`}
            style={{ backgroundColor: REG_COLORS[key] ?? "#F8FAFC" }}
            className="rounded-xl border border-black/10 p-4 text-sm shadow-sm"
          >
            <div className="font-semibold">{REGION_LABEL[key]}</div>
            <div className="mt-1 text-xs text-neutral-700">
              {(REGION_PREFS as Record<string, string[]>)[key]?.join(" / ")}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}