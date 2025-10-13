// app/region8/[area]/page.tsx
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { REG8_LABEL, REG8_PREFS, type Region8Key } from "@/app/lib/jp";
import AdSlot from "@/components/AdSlot";

export default function Region8Page() {
  const { area } = useParams<{ area: Region8Key }>();
  const key = area as Region8Key;
  const label = REG8_LABEL[key];
  const prefs = REG8_PREFS[key];

  if (!label || !prefs) {
    return <main className="mx-auto max-w-6xl px-4 py-8">不明なエリアです。</main>;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-center text-3xl font-extrabold">{label}</h1>
      <p className="mt-1 text-center text-sm text-neutral-600">{prefs.length}件の都道府県</p>

      {/* 上部広告 */}
      <AdSlot
        variant="leaderboard"
        slotId={process.env.NEXT_PUBLIC_ADSENSE_SLOT_LEADER}
        className="my-6"
      />

      <div className="mx-auto mt-2 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {prefs.map((p) => (
          <Link
            key={p}
            href={`/pref/${encodeURIComponent(p)}`}
            className="rounded-2xl border bg-white px-4 py-3 text-center text-base font-medium shadow-sm transition hover:bg-gray-50"
          >
            {p}
          </Link>
        ))}
      </div>

      {/* 下部広告 */}
      <AdSlot
        variant="infeed"
        slotId={process.env.NEXT_PUBLIC_ADSENSE_SLOT_INFEED}
        className="my-10"
      />
    </main>
  );
}