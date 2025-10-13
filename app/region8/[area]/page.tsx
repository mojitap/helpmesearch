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
    return <main className="mx-auto max-w-5xl px-4 py-8">不明なエリアです。</main>;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* ページ上部の広告 */}
      <AdSlot variant="leaderboard" className="mb-4" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <h1 className="text-2xl font-extrabold">{label}</h1>
          <p className="text-sm text-neutral-600">{prefs.length}件の都道府県</p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {prefs.map((p) => (
              <Link
                key={p}
                href={`/pref/${encodeURIComponent(p)}`}
                className="rounded-full border bg-white px-4 py-2 text-center hover:bg-gray-50"
              >
                {p}
              </Link>
            ))}
          </div>

          {/* in-feed */}
          <AdSlot variant="infeed" />
        </section>

        <aside className="sticky top-4 space-y-4">
          <AdSlot variant="sidebar" />
        </aside>
      </div>
    </main>
  );
}