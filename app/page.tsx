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

const coerceItem = (x: any): Item => ({
  id:
    x.id ??
    `${x.pref || ""}-${x.city || ""}-${x.name || x.facility_name || x.office_name || ""}-${x.address || ""}`.replace(/\s+/g, ""),
  name: x.name ?? x.facility_name ?? x.office_name ?? x["施設名"] ?? x["事業所名"] ?? "名称不明",
  kind: x.kindLabel || x.service || x.category || "",
  tel: x.tel ?? x["電話"] ?? x["TEL"],
  address: x.address ?? x["住所"] ?? "",
  url: x.url ?? x.website ?? x.homepage ?? x["URL"] ?? x["HP"],
  pref: x.pref ?? x["都道府県"],
});

export default function Page() {
  const [results, setResults] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);

  // 日本語 -> スラッグ 変換
  const PREF_TO_ID: Record<string, string> = {
    "北海道":"hokkaido",
    "青森県":"aomori","岩手県":"iwate","宮城県":"miyagi","秋田県":"akita","山形県":"yamagata","福島県":"fukushima",
    "茨城県":"ibaraki","栃木県":"tochigi","群馬県":"gunma","埼玉県":"saitama","千葉県":"chiba","東京都":"tokyo","神奈川県":"kanagawa",
    "新潟県":"niigata","富山県":"toyama","石川県":"ishikawa","福井県":"fukui","山梨県":"yamanashi","長野県":"nagano",
    "岐阜県":"gifu","静岡県":"shizuoka","愛知県":"aichi",
    "三重県":"mie","滋賀県":"shiga","京都府":"kyoto","大阪府":"osaka","兵庫県":"hyogo","奈良県":"nara","和歌山県":"wakayama",
    "鳥取県":"tottori","島根県":"shimane","岡山県":"okayama","広島県":"hiroshima","山口県":"yamaguchi",
    "徳島県":"tokushima","香川県":"kagawa","愛媛県":"ehime","高知県":"kochi",
    "福岡県":"fukuoka","佐賀県":"saga","長崎県":"nagasaki","熊本県":"kumamoto","大分県":"oita","宮崎県":"miyazaki","鹿児島県":"kagoshima",
    "沖縄県":"okinawa",
  };

  // app/page.tsx（handleSearch だけ差し替え）
  async function handleSearch(params: { keyword: string; pref?: string; city?: string; category?: string }) {
    setLoading(true);
    const qs = new URLSearchParams();
    if (params.pref) qs.set("pref", params.pref);
    if (params.city) qs.set("city", params.city);              // ★ 追加
    if (params.category) qs.set("kind", params.category);
    if (params.keyword) qs.set("q", params.keyword.trim());
    const r = await fetch(`/api/search?${qs.toString()}`, { cache: "no-store" });
    const data = await r.json();
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