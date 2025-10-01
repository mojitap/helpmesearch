// app/region8/[area]/page.tsx
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { REG8_LABEL, REG8_PREFS, type Region8Key } from "@/app/lib/jp";

export default function Region8Page() {
  const { area } = useParams<{ area: Region8Key }>();
  const key = area as Region8Key;

  const label = REG8_LABEL[key];
  const prefs = REG8_PREFS[key];

  if (!label || !prefs) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">不明なエリアです。</main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-extrabold">{label}</h1>
      <p className="text-sm text-neutral-600">
        {prefs.length}件の都道府県
      </p>
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