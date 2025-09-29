'use client';
import React, { useState } from 'react';
import { PREFS_47, KIND_OPTIONS, KindValue, PrefValue } from '@/app/lib/search-constants';

export default function SearchBar() {
  const [q, setQ] = useState('');
  const [pref, setPref] = useState<PrefValue | ''>('');
  const [kind, setKind] = useState<KindValue | ''>('');
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  async function runSearch() {
    setLoading(true);
    const params = new URLSearchParams();
    if (pref) params.set('pref', String(pref));
    if (kind) params.set('kind', String(kind)); // ← value は英語スラッグ
    if (q)    params.set('q', q.trim());
    const r = await fetch(`/api/search?${params.toString()}`, { cache: 'no-store' });
    const data = await r.json(); // { total, items }
    setResults(data.items || []);
    setTotal(data.total || 0);
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          placeholder="例：整形外科 / 夜間対応 / さくらクリニック"
          className="flex-1 border rounded-lg px-3 py-2"
        />
        <select
          value={pref}
          onChange={(e)=>setPref(e.target.value as PrefValue | '')}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">都道府県</option>
          {PREFS_47.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          value={kind}
          onChange={(e)=>setKind(e.target.value as KindValue | '')}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">業種（任意）</option>
          {KIND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <button onClick={runSearch} className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold">
          {loading ? '検索中…' : '検索'}
        </button>
      </div>

      <div className="text-sm text-gray-600">{total} 件</div>

      <div className="rounded-xl border">
        {results.length === 0 ? (
          <div className="p-6 text-gray-500 text-sm">該当する施設が見つかりませんでした。</div>
        ) : (
          <ul className="divide-y">
            {results.map((it, i) => (
              <li key={it.id || i} className="p-4">
                <div className="font-semibold">{it.name || it.facility_name}</div>
                <div className="text-sm text-gray-600">
                  {(it.address || '')} {it.city ? ` / ${it.city}` : ''}
                </div>
                {it.tel && <div className="text-sm"><a className="underline" href={`tel:${String(it.tel).replace(/\D/g,'')}`}>{it.tel}</a></div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}