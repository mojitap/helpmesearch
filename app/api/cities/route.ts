// app/api/cities/route.ts
import { NextResponse } from "next/server";

// 県スラッグ ↔ 日本語
const ID_TO_PREF: Record<string, string> = {
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
const PREF_TO_ID = Object.fromEntries(Object.entries(ID_TO_PREF).map(([k,v]) => [v, k]));

// 病院など医療/介護の代表ディレクトリ
const MED_KINDS  = ["hospital", "clinic", "dental", "pharmacy"];
const CARE_KINDS = ["tokuyou","rouken","home_help","day_service","community_day_service","regular_patrol_nursing","night_home_help","care_medical_institute"];

// 東京都フォールバック（万一データから取れない場合）
const TOKYO_WARDS = [
  "千代田区","中央区","港区","新宿区","文京区","台東区","墨田区","江東区","品川区","目黒区","大田区","世田谷区",
  "渋谷区","中野区","杉並区","豊島区","北区","荒川区","板橋区","練馬区","足立区","葛飾区","江戸川区",
];

function guessCityFromAddress(prefJp: string, addr: string): string | null {
  if (!addr) return null;
  // 先頭の都道府県名を落とす
  let s = addr.replace(prefJp, "");
  // 代表的なパターンで先頭の市区町村を抽出
  const m1 = s.match(/^(.+?郡.+?(市|町|村))/); if (m1) return m1[1];
  const m2 = s.match(/^(.+?市)/);              if (m2) return m2[1];
  const m3 = s.match(/^(.+?区)/);              if (m3) return m3[1];
  const m4 = s.match(/^(.+?町)/);              if (m4) return m4[1];
  const m5 = s.match(/^(.+?村)/);              if (m5) return m5[1];
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let prefParam = (searchParams.get("pref") || "").trim(); // スラッグ or 日本語
  if (!prefParam) return NextResponse.json({ items: [] });

  const prefId = ID_TO_PREF[prefParam] ? prefParam : (PREF_TO_ID[prefParam] ?? "");
  const prefJp = ID_TO_PREF[prefParam] ?? (ID_TO_PREF[prefId] || prefParam);
  const slug   = prefId || PREF_TO_ID[prefParam] || prefParam; // どちらでも対応

  const origin = new URL(req.url).origin;
  const files: string[] = [];

  // 医療優先で数種類を当てに行き、無ければ介護も参照する
  for (const k of MED_KINDS)  files.push(`${origin}/data/medical/${k}/${encodeURIComponent(slug)}.json`);
  for (const k of CARE_KINDS) files.push(`${origin}/data/care/${k}/${encodeURIComponent(slug)}.json`);

  const citySet = new Set<string>();

  for (const url of files) {
    try {
      const r = await fetch(url, { next: { revalidate: 3600 } });
      if (!r.ok) continue;
      const arr = await r.json();
      if (!Array.isArray(arr)) continue;

      for (const x of arr) {
        const direct =
          x.city || x.municipality || x.city_ward ||
          x["市区町村"] || x["市町村"] || x["区市町村"] || x["行政区"];
        if (direct && String(direct).trim()) {
          citySet.add(String(direct).trim());
          continue;
        }
        const addr = (x.address || x["住所"] || "").toString();
        const guessed = guessCityFromAddress(prefJp, addr);
        if (guessed) citySet.add(guessed);
      }
    } catch {
      /* 404 などは無視して次 */
    }
    // 充分集まったら打ち切り
    if (citySet.size > 200) break;
  }

  // 東京都はフォールバックで23区だけでも出す
  if (citySet.size === 0 && (prefJp === "東京都" || slug === "tokyo")) {
    TOKYO_WARDS.forEach(w => citySet.add(w));
  }

  const items = Array.from(citySet).sort((a,b) => a.localeCompare(b, "ja"));
  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600" } }
  );
}