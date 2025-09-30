// app/region/[region]/page.tsx
'use client';

import Link from "next/link";
import { useParams } from "next/navigation";
import { REGION_PREFS, REGION_LABEL, type RegionKey } from "@/app/lib/jp";

export default function RegionPage() {
  const { region } = useParams<{ region: RegionKey }>();

  const label = REGION_LABEL[region];
  const prefs = REGION_PREFS[region];

  if (!label || !prefs) {
    return <main className="mx-auto max-w-5xl px-4 py-8">不明なエリアです。</main>;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-extrabold">{label}</h1>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {prefs.map((p) => (
          <Link
            key={p}
            href={`/pref/${encodeURIComponent(p)}`}
            className="rounded-full border px-4 py-2 text-center bg-white hover:bg-gray-50"
          >
            {p}
          </Link>
        ))}
      </div>
    </main>
  );
}