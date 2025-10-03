// app/api/search/route.ts
import { NextResponse } from "next/server";

const CARE_KINDS = new Set([
  "tokuyou","rouken","home_help","day_service",
  "community_day_service","regular_patrol_nursing",
  "night_home_help","care_medical_institute",
]);
const MED_KINDS  = new Set(["hospital","clinic","dental","pharmacy"]);

const KIND_ALIAS: Record<string,string> = {
  // 医療
  "病院":"hospital","クリニック":"clinic","診療所":"clinic","歯科":"dental","薬局":"pharmacy","調剤薬局":"pharmacy",
  // 介護
  "特養":"tokuyou","老健":"rouken","介護医療院":"care_medical_institute",
  "デイサービス":"day_service","地域密着型通所介護":"community_day_service",
  "訪問介護":"home_help","夜間対応型訪問介護":"night_home_help",
  "定期巡回・随時対応":"regular_patrol_nursing",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pref = searchParams.get("pref") || "";
  const kindRaw = searchParams.get("kind") || "";
  const q    = (searchParams.get("q") || "").toLowerCase();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const size = Math.min(200, Math.max(1, Number(searchParams.get("size") || 50)));

  // ★ 追加：市区町村（任意）
  const city = (searchParams.get("city") || "").toLowerCase();

  const kind = KIND_ALIAS[kindRaw] ?? kindRaw;

  const allowed = new Set<string>([...CARE_KINDS, ...MED_KINDS]);
  if (!allowed.has(kind)) {
    return NextResponse.json({ total: 0, items: [] });
  }

  const origin = new URL(req.url).origin;
  const base = MED_KINDS.has(kind) ? "medical" : "care";
  const url = `${origin}/data/${base}/${encodeURIComponent(kind)}/${encodeURIComponent(pref)}.json`;

  let all: any[] = [];
  try {
    const r = await fetch(url, { next: { revalidate: 3600 } });
    all = r.ok ? await r.json() : [];
  } catch {
    all = [];
  }

  // ★ ここで city / q を順に絞り込み（日本語の表記ゆれを考えて includes で部分一致）
  const filtered = all.filter((x: any) => {
    // city 指定がある場合は、市区町村 or 住所に含まれるかで判定
    if (city) {
      const inCity =
        (x.city?.toString().toLowerCase?.() || "") ||
        (x["市区町村"]?.toString().toLowerCase?.() || "") ||
        (x["市町村"]?.toString().toLowerCase?.() || "") ||
        (x.address?.toString().toLowerCase?.() || "") ||
        (x["住所"]?.toString().toLowerCase?.() || "");
      if (!inCity.includes(city)) return false;
    }

    // キーワード検索（名称 / 住所 / 診療科）
    if (!q) return true;
    const name =
      (x.name?.toLowerCase?.() ||
        x.facility_name?.toLowerCase?.() ||
        x.office_name?.toLowerCase?.() ||
        x["施設名"]?.toLowerCase?.() ||
        x["事業所名"]?.toLowerCase?.() ||
        "");
    const addr = (x.address?.toLowerCase?.() || x["住所"]?.toLowerCase?.() || "");
    const deps = (
      Array.isArray(x.departments) ? x.departments.join("、") : (x["診療科"] || "")
    ).toString().toLowerCase();
    return name.includes(q) || addr.includes(q) || deps.includes(q);
  });

  const start = (page - 1) * size;
  return NextResponse.json(
    { total: filtered.length, items: filtered.slice(start, start + size) },
    { headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600" } }
  );
}