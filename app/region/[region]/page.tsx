'use client';

import Link from 'next/link';
import { REGION_PREFS } from '@/app/lib/jp';

type Props = { params: { region: string } };

export default function RegionPage({ params }: Props) {
  const region = decodeURIComponent(params.region) as keyof typeof REGION_PREFS;
  const prefs = REGION_PREFS[region] ?? [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-extrabold">{region}</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {prefs.map((p) => (
          <Link
            key={p}
            href={`/pref/${encodeURIComponent(p)}`}
            className="rounded-xl border px-4 py-3 text-center bg-white hover:bg-gray-50"
          >
            {p}
          </Link>
        ))}
      </div>
    </main>
  );
}