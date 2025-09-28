// app/api/search/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pref = searchParams.get("pref") || "";
  const kind = searchParams.get("kind") || "";
  const q    = (searchParams.get("q") || "").toLowerCase();
  const page = Number(searchParams.get("page") || 1);
  const size = Number(searchParams.get("size") || 50);

  // ① 取りうる kind をホワイトリスト（パストラバーサル対策）
  const allowed = new Set(["tokuyou","rouken","home_help","day_service","community_day_service","regular_patrol_nursing","night_home_help","care_medical_institute"]);
  if (!allowed.has(kind)) return NextResponse.json({ total: 0, items: [] });

  // ② どの環境でも動くベースURL
  const origin = new URL(req.url).origin; // 例: https://helpmesearch.vercel.app
  const url = `${origin}/data/care/${encodeURIComponent(kind)}/${encodeURIComponent(pref)}.json`;

  const all = await fetch(url, { next: { revalidate: 3600 } }).then(r => r.json());

  const filtered = all.filter((x: any) =>
    !q ||
    x.name?.toLowerCase().includes(q) ||
    x.address?.toLowerCase?.().includes(q)
  );

  const start = (page - 1) * size;
  return NextResponse.json(
    { total: filtered.length, items: filtered.slice(start, start + size) },
    { headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600" } }
  );
}