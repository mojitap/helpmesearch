// app/api/search/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pref = searchParams.get("pref") || "";
  const kind = searchParams.get("kind") || "";
  const q    = (searchParams.get("q") || "").toLowerCase();
  const page = Number(searchParams.get("page") || 1);
  const size = Number(searchParams.get("size") || 50);

  // 例: 都道府県＋カテゴリ毎の小さなJSONだけ読む
  const url = `${process.env.NEXT_PUBLIC_DATA_BASE}/care/${kind}/${pref}.json`;
  const all = await fetch(url, { next: { revalidate: 3600 } }).then(r => r.json());

  const filtered = all.filter((x:any) =>
    (!q || x.name?.toLowerCase().includes(q) || x.address?.includes(q))
  );

  const start = (page-1)*size;
  return NextResponse.json({
    total: filtered.length,
    items: filtered.slice(start, start+size),
  }, {
    headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600" }
  });
}