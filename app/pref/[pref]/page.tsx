// app/pref/[pref]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function PrefPage() {
  const { pref: encodedPref } = useParams<{ pref: string }>();
  const pref = decodeURIComponent(encodedPref);
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/data/pref/${encodeURIComponent(pref)}.json`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr) => setCities(Array.isArray(arr) ? arr : []))
      .catch(() => setCities([]));
  }, [pref]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-extrabold">{pref}</h1>

      {cities.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-sm text-neutral-500">
          市区町村データが見つかりませんでした。
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {cities.map((c) => {
            const name = typeof c === 'string' ? c : (c as any).name;
            return (
              <Link
                key={name}
                href={`/search?pref=${encodeURIComponent(pref)}&city=${encodeURIComponent(name)}`}
                className="rounded-full border px-4 py-2 text-center bg-white hover:bg-gray-50"
              >
                {name}
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}