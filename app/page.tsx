// app/page.tsx
"use client";

import Header from "@/components/Header";
import SearchHero from "@/components/SearchHero";
import ResultCard from "@/components/ResultCard";
import { useState } from "react";

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

// API → ResultCard 用に整形
const coerceItem = (x: any): Item => ({
  id: x.id
    ?? `${x.pref || ""}-${x.city || ""}-${x.name || x.facility_name || x.office_name || ""}-${x.address || ""}`.replace(/\s+/g, ""),
  name: x.name ?? x.facility_name ?? x.office_name ?? x["施設名"] ?? x["事業所名"] ?? "名称不明",
  kind: x.kindLabel || x.service || x.category || "",   // 表示用（病院/薬局/特養…）
  tel:  x.tel ?? x["電話"] ?? x["TEL"],
  address: x.address ?? x["住所"] ?? "",
  url: x.url ?? x.website ?? x.homepage ?? x["URL"] ?? x["HP"],
  pref: x.pref ?? x["都道府県"],
});

export default function Page() {
  const [results, setResults] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);

  // SearchHero から { keyword, pref, category } が来る想定
  async function handleSearch(params: { keyword: string; pref?: string; category?: string }) {
    setLoading(true);

    const qs = new URLSearchParams();
    if (params.pref) qs.set("pref", params.pref);
    if (params.category) qs.set("kind", params.category); // 日本語でもOK（API側で alias 吸収）
    if (params.keyword) qs.set("q", params.keyword.trim());

    const r = await fetch(`/api/search?${qs.toString()}`, { cache: "no-store" });
    const data = await r.json(); // { total, items }

    setResults((data.items || []).map(coerceItem));
    setLoading(false);
  }

  return (
    <>
      <Header />
      <main id="main">
        <SearchHero onSearch={handleSearch} />
        <section aria-live="polite" className="mx-auto grid max-w-5xl gap-3 px-4 pb-16">
          {loading ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-neutral-500">
              検索中…
            </div>
          ) : !results ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-neutral-500">
              条件を指定して検索してください。
            </div>
          ) : results.length === 0 ? (
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