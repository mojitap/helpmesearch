// components/SearchHero.tsx
"use client";
import { useEffect, useState } from "react";
import { PREFS_47, KIND_OPTIONS, type PrefValue, type KindValue } from "@/app/lib/jp";

export default function SearchHero({
  onSearch,
}: {
  onSearch: (q: { keyword: string; pref?: PrefValue; city?: string; category?: KindValue }) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [pref, setPref] = useState<PrefValue | "">("");
  const [city, setCity] = useState<string>("");
  const [cities, setCities] = useState<string[]>([]);
  const [category, setCategory] = useState<KindValue | "">("");

  // 都道府県が選ばれたらその市区町村リストを取得
  useEffect(() => {
    if (!pref) {
      setCities([]);
      setCity("");
      return;
    }
    (async () => {
      try {
        const r = await fetch(`/api/cities?pref=${encodeURIComponent(pref)}`, { cache: "no-store" });
        const data = (await r.json()) as { items?: string[] } | string[];
        const list = Array.isArray(data) ? data : data?.items || [];
        setCities(list);
        setCity(""); // 毎回リセット
      } catch {
        setCities([]);
        setCity("");
      }
    })();
  }, [pref]);

  return (
    <section className="relative">
      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-10 sm:py-14">
        <h1 className="text-balance text-2xl font-extrabold sm:text-3xl">介護・医療をまとめて検索</h1>
        <p className="text-sm text-neutral-600">
          施設名・サービス名・診療科で検索できます。電話や住所もワンタップで。
        </p>

        <form
          className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:grid-cols-6"
          role="search"
          aria-label="施設検索"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch({
              keyword,
              pref: pref || undefined,
              city: city || undefined,
              category: category || undefined,
            });
          }}
        >
          {/* キーワード */}
          <input
            aria-label="キーワードで探す"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="例：整形外科 / 夜間対応 / さくらクリニック"
            className="sm:col-span-3 rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
          />

          {/* 都道府県（pref-bridge が拾えるよう name/id/aria-label を付与） */}
          <select
            id="prefecture"
            name="prefecture"
            aria-label="都道府県"
            data-role="prefecture"
            value={pref}
            onChange={(e) => setPref(e.target.value as PrefValue | "")}
            className="rounded-lg border px-3 py-2"
          >
            <option value="">都道府県</option>
            {PREFS_47.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* 市区町村（都道府県選択後に活性化） */}
          <select
            id="city"
            name="city"
            aria-label="市区町村"
            data-role="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={!pref || cities.length === 0}
            className="rounded-lg border px-3 py-2 disabled:opacity-50"
          >
            <option value="">{pref ? "市区町村（任意）" : "都道府県を先に選択"}</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* 業種 */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as KindValue | "")}
            className="rounded-lg border px-3 py-2"
          >
            <option value="">業種（任意）</option>
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <div className="sm:col-span-6 flex justify-end">
            <button
              type="submit"
              data-search
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            >
              検索
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}