// app/region/[region]/page.tsx
import type { PageProps } from "next";
import Link from "next/link";
import { REGION_PREFS, type RegionKey } from "@/app/lib/jp";

export default function RegionPage({ params }: PageProps<{ region: string }>) {
  // URL の %E5%8C%97%E6%B5%B7%E9%81%93 → 北海道 などを復元
  const region = decodeURIComponent(params.region) as RegionKey;

  const prefs = REGION_PREFS[region] ?? [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-extrabold">{region}</h1>

      {prefs.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-sm text-neutral-500">
          地方が見つかりませんでした。
        </div>
      ) : (
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
      )}
    </main>
  );
}