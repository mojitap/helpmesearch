// app/region/[region]/page.tsx
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { REGION_PREFS } from '@/app/lib/jp'; // jp.ts に REGION_PREFS を export しておく

export default function RegionPage() {
  const { region } = useParams<{ region: keyof typeof REGION_PREFS }>();
  const info = REGION_PREFS[region];

  if (!info) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm text-neutral-500">不明な地方です。</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-extrabold">{info.label}</h1>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {info.prefs.map((p) => (
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