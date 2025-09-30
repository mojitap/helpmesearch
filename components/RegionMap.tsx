// components/RegionMap.tsx
"use client";

import Link from "next/link";
import { REGION_PREFS, REGION_LABEL, type RegionKey } from "@/app/lib/jp";

type K = RegionKey;

const REG_COLORS: Record<string, string> = {
  hokkaido_tohoku: "#E8F4FF",
  kanto: "#FFF2E8",
  chubu: "#EFE9FD",
  kinki: "#FFF9CC",
  chugoku_shikoku: "#EAF6FF",
  kyushu_okinawa: "#FFEFF5",
};

export default function RegionMap() {
  const entry = (key: K) => ({
    key,
    label: REGION_LABEL[key],
    prefs: REGION_PREFS[key],
  });

  const HK = entry("hokkaido_tohoku");
  const KA = entry("kanto");
  const CB = entry("chubu");
  const KI = entry("kinki");
  const CS = entry("chugoku_shikoku");
  const KY = entry("kyushu_okinawa");

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <div className="jp-wrap">
        <Tile area="hk" label={HK.label} prefs={HK.prefs} color={REG_COLORS[HK.key]} />
        <Tile area="ka" label={KA.label} prefs={KA.prefs} color={REG_COLORS[KA.key]} />
        <Tile area="cb" label={CB.label} prefs={CB.prefs} color={REG_COLORS[CB.key]} />
        <Tile area="ki" label={KI.label} prefs={KI.prefs} color={REG_COLORS[KI.key]} />
        <Tile area="cs" label={CS.label} prefs={CS.prefs} color={REG_COLORS[CS.key]} />
        <Tile area="ky" label={KY.label} prefs={KY.prefs} color={REG_COLORS[KY.key]} />
      </div>

      {/* スマホは1カラム */}
      <style jsx>{`
        .jp-wrap {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          grid-template-rows: repeat(5, auto);
          /* 北東→南西へ流れる “日本っぽい” 配置 */
          grid-template-areas:
            ". hk hk . . ."
            ". .  ka ka . ."
            "cb cb cb . . ."
            ".  ki ki . . ."
            "cs cs ky ky . .";
        }
        @media (max-width: 768px) {
          .jp-wrap {
            grid-template-columns: 1fr;
            grid-template-rows: none;
            grid-template-areas:
              "hk"
              "ka"
              "cb"
              "ki"
              "cs"
              "ky";
          }
        }
      `}</style>
    </section>
  );
}

function Tile({
  area,
  label,
  prefs,
  color,
}: {
  area: "hk" | "ka" | "cb" | "ki" | "cs" | "ky";
  label: string;
  prefs: readonly string[];
  color: string;
}) {
  return (
    <section
      style={{ gridArea: area, background: color }}
      className="rounded-2xl border border-black/10 p-4 shadow-sm"
    >
      <h3 className="mb-2 font-semibold">{label}</h3>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-neutral-700">
        {prefs.map((p) => (
          <li key={p}>
            <Link
              href={`/pref/${encodeURIComponent(p)}`}
              className="underline-offset-4 hover:underline"
            >
              {p}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}