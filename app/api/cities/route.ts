// app/api/cities/route.ts
import { NextResponse } from "next/server";

const ID_TO_JP: Record<string,string> = {
  hokkaido:"北海道",
  aomori:"青森県", iwate:"岩手県", miyagi:"宮城県", akita:"秋田県", yamagata:"山形県", fukushima:"福島県",
  ibaraki:"茨城県", tochigi:"栃木県", gunma:"群馬県", saitama:"埼玉県", chiba:"千葉県", tokyo:"東京都", kanagawa:"神奈川県",
  niigata:"新潟県", toyama:"富山県", ishikawa:"石川県", fukui:"福井県", yamanashi:"山梨県", nagano:"長野県",
  gifu:"岐阜県", shizuoka:"静岡県", aichi:"愛知県",
  mie:"三重県", shiga:"滋賀県", kyoto:"京都府", osaka:"大阪府", hyogo:"兵庫県", nara:"奈良県", wakayama:"和歌山県",
  tottori:"鳥取県", shimane:"島根県", okayama:"岡山県", hiroshima:"広島県", yamaguchi:"山口県",
  tokushima:"徳島県", kagawa:"香川県", ehime:"愛媛県", kochi:"高知県",
  fukuoka:"福岡県", saga:"佐賀県", nagasaki:"長崎県", kumamoto:"熊本県", oita:"大分県", miyazaki:"宮崎県", kagoshima:"鹿児島県",
  okinawa:"沖縄県",
};
const JP_TO_ID = Object.fromEntries(Object.entries(ID_TO_JP).map(([k,v])=>[v,k]));

// 複数ソースを順に試す
const CANDS = [
  { base:"medical", kind:"clinic" },
  { base:"medical", kind:"hospital" },
  { base:"medical", kind:"pharmacy" },
  { base:"care",    kind:"day_service" },
  { base:"care",    kind:"tokuyou" },
];

function extractCity(x: any): string {
  // 明示項目
  const direct =
    x.city || x.municipality || x.city_ward || x["市区町村"] || x["市町村"] || x["区市町村"] || x["行政区"];
  if (direct) return String(direct).trim();

  // 住所から推定
  const addr = String(x.address || x["住所"] || "");
  if (!addr) return "";
  const afterPref = addr.replace(/.*?(北海道|東京都|京都府|大阪府|.{2,3}県)/, "");
  const m = afterPref.match(/([^0-9\-\s、,（）\(\)]+?[市区町村])/);
  return m ? m[1] : "";
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const prefParam = u.searchParams.get("pref") || "";
  if (!prefParam) return NextResponse.json({ items: [] });

  const slug = JP_TO_ID[prefParam] || prefParam;
  const origin = u.origin;

  let items: any[] = [];
  for (const c of CANDS) {
    try {
      const dataUrl = `${origin}/data/${c.base}/${c.kind}/${encodeURIComponent(slug)}.json`;
      const r = await fetch(dataUrl, { next: { revalidate: 3600 } });
      if (r.ok) { items = await r.json(); if (items.length) break; }
    } catch {}
  }

  const set = new Set<string>();
  for (const it of items) {
    const name = extractCity(it);
    if (name) set.add(name);
  }

  return NextResponse.json({
    items: Array.from(set).sort((a,b)=>a.localeCompare(b,"ja")),
  }, { headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600" } });
}