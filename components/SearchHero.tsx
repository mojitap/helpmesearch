// components/SearchHero.tsx
"use client";
import { useState } from "react";

const PREFS = ["東京都","大阪府","愛知県","北海道","福岡県"] as const;
const CATEGORIES = ["全て","病院","クリニック","歯科","薬局","特養","老健","訪問介護"] as const;

export default function SearchHero({ onSearch }:{
  onSearch: (q:{keyword:string; pref?:string; category?:string}) => void;
}) {
  const [keyword, setKeyword]   = useState("");
  const [pref, setPref]         = useState<string>("");
  const [category, setCategory] = useState<string>("");

  return (
    <section className="relative">
      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-10 sm:py-14">
        <h1 className="text-balance text-2xl font-extrabold sm:text-3xl">
          介護・医療をまとめて検索
        </h1>
        <p className="text-sm text-neutral-600">
          施設名・サービス名・診療科で検索できます。電話や住所もワンタップで。
        </p>

        <form
          className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:grid-cols-5"
          role="search"
          aria-label="施設検索"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch({ keyword, pref: pref || undefined, category: category || undefined });
          }}
        >
          <input
            aria-label="キーワードで探す"
            value={keyword}
            onChange={(e)=>setKeyword(e.target.value)}
            placeholder="例：整形外科 / 夜間対応 / さくらクリニック"
            className="sm:col-span-3 rounded-lg border px-3 py-2 outline-none ring-0 focus:border-blue-500"
          />
          <select
            aria-label="都道府県を選択"
            value={pref}
            onChange={(e)=>setPref(e.target.value)}
            className="sm:col-span-1 rounded-lg border px-3 py-2 focus:border-blue-500"
          >
            <option value="">都道府県</option>
            {PREFS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            aria-label="業種を選択"
            value={category}
            onChange={(e)=>setCategory(e.target.value)}
            className="sm:col-span-1 rounded-lg border px-3 py-2 focus:border-blue-500"
          >
            <option value="">業種（任意）</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="sm:col-span-5 flex justify-end">
            <button
              type="submit"
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