// app/api/search/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pref = searchParams.get("pref") || "";
  const kind = searchParams.get("kind") || "";
  const q    = (searchParams.get("q") || "").toLowerCase();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const size = Math.min(200, Math.max(1, Number(searchParams.get("size") || 50)));

  const allowed = new Set([
    "tokuyou","rouken","home_help","day_service",
    "community_day_service","regular_patrol_nursing",
    "night_home_help","care_medical_institute"
  ]);
  if (!allowed.has(kind)) return NextResponse.json({ total: 0, items: [] });

  const origin = new URL(req.url).origin;
  const url = `${origin}/data/care/${encodeURIComponent(kind)}/${encodeURIComponent(pref)}.json`;

  let all: any[] = [];
  try {
    const r = await fetch(url, { next: { revalidate: 3600 } });
    all = r.ok ? await r.json() : [];
  } catch {
    all = [];
  }

  const filtered = all.filter((x: any) =>
    !q ||
    x.name?.toLowerCase?.().includes(q) ||
    x.address?.toLowerCase?.().includes(q)
  );

  const start = (page - 1) * size;
  return NextResponse.json(
    { total: filtered.length, items: filtered.slice(start, start + size) },
    { headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600" } }
  );
}