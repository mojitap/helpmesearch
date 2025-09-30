"use client";
import Link from "next/link";
import { REGION_PREFS } from "@/app/lib/jp"; // { hokkaido:{label,prefs}, ... }

const ORDER = ["hokkaido","tohoku","hokushinetsu","kanto","tokai","kansai","chugoku","shikoku","kyushu"] as const;

export default function RegionGate() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <h2 className="mb-4 text-xl font-bold">エリアから探す</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ORDER.map((key) => {
          const region = REGION_PREFS[key];
          return (
            <Link
              key={key}
              href={`/region/${key}`}
              className="aspect-square rounded-2xl border border-black/10 bg-white shadow-sm
                         flex items-center justify-center text-lg font-semibold hover:bg-gray-50"
            >
              {region.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}