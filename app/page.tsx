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
  hours?: string;
  nightLabel?: string;
  closed?: string;
};

const toAscii = (s: string) =>
  (s || "")
    .replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0))
    .replace(/：/g, ":");

// 「20:00 以降」の最大時刻を拾って "〜HH:MM" を返す（無ければ null）
function pickNightTail(raw?: string): string | null {
  if (!raw) return null;
  const t = toAscii(raw);
  const pm = /午後|PM/i.test(t); // 「午後8時」→ 20時 に寄せる
  const re = /(?:^|[^\d])(2[0-3]|1?\d)(?:[:：]([0-5]\d)|時)/g;
  const mins = [...t.matchAll(re)].map(m => {
    let h = +m[1];
    const mm = m[2] ? +m[2] : 0;
    if (pm && h < 12) h += 12;
    return h * 60 + mm;
  });
  const max = Math.max(...mins, -1);
  if (max >= 20 * 60) {
    const hh = String(Math.floor(max / 60)).padStart(2, "0");
    const mm = String(max % 60).padStart(2, "0");
    return `〜${hh}:${mm}`;
  }
  return null;
}

// カード表示用フィールドを原データから生成
function deriveDisplayFields(x: any) {
  const hours =
    x["診療時間_平日"] ??
    x["診療時間"] ??
    x.hours ?? x.opening_hours ?? x.business_hours ?? x["営業時間"] ?? "";

  const memoLike = `${x["備考"] ?? ""} ${x["注記"] ?? ""} ${x["特記事項"] ?? ""} ${x["夜間"] ?? ""} ${x["時間外"] ?? ""} ${x["夜間対応"] ?? ""}`;

  const nightTail  = pickNightTail(`${hours} ${memoLike}`);
  const nightMark  = /(夜|夜診|準夜|夜間|深夜|時間外|当直|24 ?時間|夜間診療|夜間受付|夜間救急|休日夜間)/i.test(`${hours} ${memoLike}`);
  const nightLabel = nightTail ?? (nightMark ? "対応あり" : "");

  const closed =
    x["休診日"] ?? x["定休日"] ?? x["休業日"] ?? x["休み"] ?? "";

  return { hours, nightLabel, closed };
}

// 先にある deriveDisplayFields は残してOKですが、まず x の値を優先します
const coerceItem = (x: any): Item => {
  // 可能な限りサーバ付与の値をそのまま使う
  const hours      = x.hours ?? "";      // decorate 済
  const nightLabel = x.nightLabel ?? ""; // decorate 済（例：救急：20:00〜09:00 / 〜23:00）
  const closed     = x.closed ?? "";     // decorate 済
  const tel        = x.tel ?? x["電話"] ?? x["TEL"]; // decorate 済を優先

  return {
    id: x.id ??
        `${x.pref || ""}-${x.city || ""}-${x.name || x.facility_name || x.office_name || ""}-${x.address || ""}`.replace(/\s+/g, ""),
    name: x.name ?? x.facility_name ?? x.office_name ?? x["施設名"] ?? x["事業所名"] ?? "名称不明",
    kind: x.kind ?? x.kindLabel ?? x.service ?? x.category ?? "",
    tel,
    address: x.address ?? x["住所"] ?? "",
    url: x.url ?? x.website ?? x.homepage ?? x["URL"] ?? x["HP"],
    pref: x.pref ?? x["都道府県"],
    hours,
    nightLabel,
    closed,
  };
};

export default function Page() {
  const [results, setResults] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);

  // app/page.tsx（handleSearch だけ差し替え）
  async function handleSearch(params: { keyword: string; pref?: string; city?: string; category?: string }) {
    setLoading(true);
    const qs = new URLSearchParams();

    if (params.pref) {
      qs.set("pref", params.pref); // ★ スラッグ変換をやめる
    }

    if (params.city) qs.set("city", params.city);
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
            <></>
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