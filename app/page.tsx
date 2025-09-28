// app/page.tsx
"use client";

import Header from "@/components/Header";
import SearchHero from "@/components/SearchHero";
import ResultCard from "@/components/ResultCard";
import { useMemo, useState } from "react";

type Item = {
  id: string;
  name: string;
  kind: string;
  tel?: string;
  address?: string;
  tags?: string[];
  url?: string;
  pref?: string;
};

// まずはダミー（あとでJSON/APIに差し替え）
const SAMPLE: Item[] = [
  { id: "1", name: "羽ノ浦整形外科内科病院", kind: "病院", tel: "0884-00-0000", address: "徳島県阿南市...", tags: ["整形外科","内科"] },
  { id: "2", name: "おおさか中央薬局",       kind: "薬局", tel: "06-5555-1111", address: "大阪府大阪市...", tags: ["処方箋","在宅対応"] },
  { id: "3", name: "さくらデイサービス",     kind: "デイサービス", tel: "03-3000-0000", address: "東京都杉並区...", tags: ["送迎","入浴"] },
];

export default function Page() {
  const [query, setQuery] = useState<{ keyword: string; pref?: string; category?: string } | null>(null);

  const results = useMemo(() => {
    if (!query) return SAMPLE;
    const kw = query.keyword.trim();
    return SAMPLE.filter((it) => {
      const hitKw = !kw || [it.name, it.address, ...(it.tags ?? [])].some((s) => s?.includes(kw));
      const hitPref = !query.pref || it.pref === query.pref || (it.address ?? "").includes(query.pref);
      const hitCat = !query.category || it.kind === query.category;
      return hitKw && hitPref && hitCat;
    });
  }, [query]);

  return (
    <>
      <Header />
      <main id="main">
        <SearchHero onSearch={setQuery} />
        <section aria-live="polite" className="mx-auto grid max-w-5xl gap-3 px-4 pb-16">
          {results.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-neutral-500">
              該当する施設が見つかりませんでした。
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {results.map((r) => (
                <ResultCard key={r.id} item={r} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}