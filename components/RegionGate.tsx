// components/RegionGate.tsx
'use client';

import Link from "next/link";
import { REGION_PREFS, REGION_LABEL, type RegionKey } from "@/app/lib/jp";

const ORDER: RegionKey[] = [
  "hokkaido_tohoku",
  "kanto",
  "chubu",
  "kinki",
  "chugoku_shikoku",
  "kyushu_okinawa",
];

export default function RegionGate() {
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
      {ORDER.map((key) => {
        const label = REGION_LABEL[key];
        const prefs = REGION_PREFS[key];
        return (
          <Link
            key={key}
            href={`/region/${key}`}
            className="rounded-2xl border bg-white p-4 hover:bg-gray-50"
          >
            <div className="font-bold">{label}</div>
            <div className="mt-1 text-xs text-neutral-500">
              {prefs.join(" / ")}
            </div>
          </Link>
        );
      })}
    </section>
  );
}