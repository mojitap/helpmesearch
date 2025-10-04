// components/SearchHero.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { KIND_OPTIONS, PREFS_47 } from "@/app/lib/jp";

// 日本語→スラッグ（フォーム内で都市一覧取得に使う）
const PREF_TO_ID: Record<string, string> = {
  北海道:"hokkaido", 青森県:"aomori", 岩手県:"iwate", 宮城県:"miyagi", 秋田県:"akita", 山形県:"yamagata", 福島県:"fukushima",
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
  onSearch: (q: { keyword: string; pref?: string; city?: string; category?: string }) => void;
}) {
  const [pref, setPref] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");

  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // 県が変わったら /api/cities から市区町村候補を取得（なければ空配列）
  useEffect(() => {
    setCity("");
    setCities([]);
    if (!pref) return;

    const slug = PREF_TO_ID[pref] ?? pref; // pref がスラッグでも可
    setLoadingCities(true);
    fetch(`/api/cities?pref=${encodeURIComponent(slug)}`, { cache: "force-cache" })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => setCities(Array.isArray(data.items) ? data.items : []))
      .catch(() => setCities([]))
      .finally(() => setLoadingCities(false));
  }, [pref]);

  // 送信用の city 値（セレクトが無い県はテキスト入力でOK）
  const canSelectCity = useMemo(() => cities.length > 0, [cities]);

  return (
    <section className="relative">
      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-10 sm:py-14">
        <h1 className="text-balance text-2xl font-extrabold sm:text-3xl">介護・医療をまとめて検索</h1>
        <p className="text-sm text-neutral-600">
          都道府県・市区町村・業種で絞り込んでから、必要ならキーワードで検索できます。
        </p>

        <form
          className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:grid-cols-5"
          role="search"
          aria-label="施設検索"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch({
              pref: pref || undefined,
              city: city || undefined,
              category: category || undefined,
              keyword: keyword.trim(),
            });
          }}
        >
          {/* 1) 都道府県 */}
          <select
            id="prefecture"
            name="prefecture"
            aria-label="都道府県"
            data-role="prefecture" // ← pref-bridge 用
            value={pref}
            onChange={(e) => setPref(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 shadow-sm
                       text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:col-span-2"
          >
            <option value="">都道府県</option>
            {PREFS_47.map((jp) => (
              <option key={jp} value={jp}>{jp}</option>
            ))}
          </select>

          {/* 2) 市区町村（候補があればセレクト、無ければテキスト入力） */}
          {canSelectCity ? (
            <select
              id="city"
              name="city"
              aria-label="市区町村"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!pref || loadingCities}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 shadow-sm
                         text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:col-span-2"
            >
              <option value="">{loadingCities ? "読込中…" : "市区町村"}</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          ) : (
            <input
              id="city"
              name="city"
              aria-label="市区町村"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="市区町村"
              disabled={!pref}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 shadow-sm
                         text-neutral-900 placeholder:text-neutral-400
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:col-span-2"
            />
          )}

          {/* 3) 業種 */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 shadow-sm
                       text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            aria-label="業種"
          >
            <option value="">業種</option>
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* 4) キーワード */}
          <input
            aria-label="キーワードで探す"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="例：整形外科 / 夜間対応 / さくらクリニック"
            className="sm:col-span-4 rounded-lg border border-neutral-300 bg-white px-3 py-2 shadow-sm
                       text-neutral-900 placeholder:text-neutral-400
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />

          {/* 5) 検索ボタン */}
          <div className="sm:col-span-5 flex justify-end">
            <button type="submit" data-search className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
              検索
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}