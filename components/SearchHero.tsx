// components/SearchHero.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { PREFS_47, KIND_OPTIONS, type PrefValue, type KindValue } from "@/app/lib/jp";

// 日本語 → スラッグ
const JP_TO_ID: Record<string, string> = {
  北海道:"hokkaido",
  青森県:"aomori", 岩手県:"iwate", 宮城県:"miyagi", 秋田県:"akita", 山形県:"yamagata", 福島県:"fukushima",
  茨城県:"ibaraki", 栃木県:"tochigi", 群馬県:"gunma", 埼玉県:"saitama", 千葉県:"chiba", 東京都:"tokyo", 神奈川県:"kanagawa",
  新潟県:"niigata", 富山県:"toyama", 石川県:"ishikawa", 福井県:"fukui", 山梨県:"yamanashi", 長野県:"nagano",
  岐阜県:"gifu", 静岡県:"shizuoka", 愛知県:"aichi",
  三重県:"mie", 滋賀県:"shiga", 京都府:"kyoto", 大阪府:"osaka", 兵庫県:"hyogo", 奈良県:"nara", 和歌山県:"wakayama",
  鳥取県:"tottori", 島根県:"shimane", 岡山県:"okayama", 広島県:"hiroshima", 山口県:"yamaguchi",
  徳島県:"tokushima", 香川県:"kagawa", 愛媛県:"ehime", 高知県:"kochi",
  福岡県:"fukuoka", 佐賀県:"saga", 長崎県:"nagasaki", 熊本県:"kumamoto", 大分県:"oita", 宮崎県:"miyazaki", 鹿児島県:"kagoshima",
  沖縄県:"okinawa",
};

export default function SearchHero({
  onSearch,
}: {
  onSearch: (q: { keyword: string; pref?: PrefValue | string; city?: string; category?: KindValue }) => void;
}) {
  const [keyword, setKeyword]   = useState("");
  const [pref, setPref]         = useState<string>("");   // スラッグを保持
  const [city, setCity]         = useState<string>("");
  const [category, setCategory] = useState<KindValue | "">("");
  const [cities, setCities]     = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // options 用データ：value=スラッグ, label=日本語
  const prefOptions = useMemo(
    () => PREFS_47.map((jp) => ({ value: JP_TO_ID[jp] || jp, label: jp })),
    []
  );

  // 県が変わったら市区町村リストを取得
  useEffect(() => {
    setCity("");
    setCities([]);
    if (!pref) return;
    setLoadingCities(true);
    fetch(`/api/cities?pref=${encodeURIComponent(pref)}`, { cache: "no-store" })
      .then(r => r.json())
      .then((d) => setCities(Array.isArray(d.items) ? d.items : []))
      .catch(() => setCities([]))
      .finally(() => setLoadingCities(false));
  }, [pref]);

  return (
    <section className="relative">
      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-10 sm:py-14">
        <h1 className="text-balance text-2xl font-extrabold sm:text-3xl">介護・医療をまとめて検索</h1>
        <p className="text-sm text-neutral-600">都道府県・市区町村・業種で絞り込んでから、必要ならキーワードで検索できます。</p>

        <form
          className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm"
          role="search"
          aria-label="施設検索"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch({
              keyword: keyword.trim(),
              pref: pref || undefined,
              city: city || undefined,
              category: (category || undefined) as any,
            });
          }}
        >
          {/* 1段目：県 → 市 → 業種 */}
          <div className="grid gap-3 sm:grid-cols-3">
            {/* 都道府県（pref-bridge が拾えるよう属性付与） */}
            <select
              id="prefecture" name="prefecture" aria-label="都道府県" data-role="prefecture"
              value={pref}
              onChange={(e) => setPref(e.target.value)}
              className="rounded-lg border px-3 py-2"
            >
              <option value="">都道府県</option>
              {prefOptions.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            {/* 市区町村 */}
            <select
              id="city" name="city" aria-label="市区町村"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-lg border px-3 py-2 disabled:bg-neutral-100"
              disabled={!pref || loadingCities || cities.length === 0}
            >
              <option value="">{loadingCities ? "読込中…" : "市区町村"}</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* 業種（医療＋介護） */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as KindValue | "")}
              className="rounded-lg border px-3 py-2"
            >
              <option value="">業種</option>
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* 2段目：検索窓 */}
          <input
            aria-label="キーワードで探す"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="例：整形外科 / 夜間対応 / さくらクリニック"
            className="rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
          />

          {/* 3段目：検索ボタン */}
          <div className="flex justify-end">
            <button type="submit" data-search className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
              検索
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}