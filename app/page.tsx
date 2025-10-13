// app/page.tsx
"use client";

import Header from "@/components/Header";
import SearchHero from "@/components/SearchHero";
import ResultCard from "@/components/ResultCard";
import { useState } from "react";
import AdSlot from "@/components/AdSlot";
import PrefTileMap from "@/components/PrefTileMap"; // ← 追加（地方ナビ）

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

// 既存ロジックはそのまま
const toAscii = (s: string) =>
  (s || "")
    .replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0))
    .replace(/：/g, ":");

function pickNightTail(raw?: string): string | null {
  if (!raw) return null;
  const t = toAscii(raw);
  const pm = /午後|PM/i.test(t);
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

// 既存の coerceItem（先に x を優先する方針）は維持
const coerceItem = (x: any): Item => ({
  id:
    x.id ??
    `${x.pref || ""}-${x.city || ""}-${x.name || x.facility_name || x.office_name || ""}-${x.address || ""}`.replace(/\s+/g, ""),
  name: x.name ?? x.facility_name ?? x.office_name ?? x["施設名"] ?? x["事業所名"] ?? "名称不明",
  kind: x.kind ?? x.kindLabel ?? x.service ?? x.category ?? "",
  tel: x.tel ?? x["電話"] ?? x["TEL"],
  address: x.address ?? x["住所"] ?? "",
  url: x.url ?? x.website ?? x.homepage ?? x["URL"] ?? x["HP"],
  pref: x.pref ?? x["都道府県"],
  hours: x.hours ?? "",
  nightLabel: x.nightLabel ?? "",
  closed: x.closed ?? "",
});

// トップの特集ボタン
const PICKUP: Array<{label:string; q?:string; kind?:string}> = [
  { label:"夜間・救急",   q:"夜間 救急", kind:"hospital" },
  { label:"在宅・訪問",   q:"訪問診療",   kind:"clinic"   },
  { label:"小児科",       q:"小児科",     kind:"clinic"   },
  { label:"歯科",         kind:"dental" },
  { label:"薬局",         kind:"pharmacy" },
  { label:"特養",         kind:"tokuyou"  },
  { label:"老健",         kind:"rouken"   },
  { label:"デイサービス", kind:"day_service" },
];

const HOT = ["発熱外来","在宅医療","リハビリ","バリアフリー","英語対応","女性医師"];

export default function Page() {
  const [results, setResults] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);

  // 既存の handleSearch をそのまま利用（差分はありません）
  async function handleSearch(params: { keyword: string; pref?: string; city?: string; category?: string }) {
    setLoading(true);
    const qs = new URLSearchParams();
    if (params.pref) qs.set("pref", params.pref);
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

        {/* ヒーロー直下のリーダーボード広告（env 未設定ならダミー枠） */}
        <div className="mx-auto max-w-5xl px-4">
          <AdSlot variant="leaderboard" />
        </div>

        {/* 2カラム構成：左=コンテンツ、右=サイドバー */}
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 md:grid-cols-[1fr_320px]">
          <section className="space-y-6">
            {/* 検索結果が出るまでは地方ナビを表示 */}
            {!results && <PrefTileMap mode="region" />}

            {/* 業種・用途から探す */}
            {!results && (
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <h2 className="mb-3 text-lg font-bold">業種・用途から探す</h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PICKUP.map((c) => (
                    <button
                      key={c.label}
                      onClick={() => handleSearch({ keyword: c.q || "", category: c.kind })}
                      className="rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 人気キーワード */}
            {!results && (
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <h2 className="mb-3 text-lg font-bold">人気キーワード</h2>
                <div className="flex flex-wrap gap-2">
                  {HOT.map((k) => (
                    <button
                      key={k}
                      onClick={() => handleSearch({ keyword: k })}
                      className="rounded-full border bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* in-feed 広告（結果の前に1枠） */}
            {!results && <AdSlot variant="infeed" />}

            {/* 検索結果 */}
            <section aria-live="polite" className="grid gap-3">
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
          </section>

          {/* サイドバー（広告＋ガイド） */}
          <aside className="space-y-4">
            <div className="sticky top-4 space-y-4">
              <AdSlot variant="sidebar" />
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <h3 className="mb-2 font-bold">お役立ちガイド</h3>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li><a href="/guides/how-to-call-ambulance" className="hover:underline">救急車の呼び方と迷った時の目安</a></li>
                  <li><a href="/guides/long-term-care" className="hover:underline">介護保険で使えるサービス一覧</a></li>
                  <li><a href="/guides/after-hours" className="hover:underline">夜間・休日の受診先の探し方</a></li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}