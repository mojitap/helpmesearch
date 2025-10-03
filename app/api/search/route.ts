// app/api/search/route.ts
import { NextResponse } from "next/server";

const CARE_KINDS = new Set([
  "tokuyou","rouken","home_help","day_service",
  "community_day_service","regular_patrol_nursing",
  "night_home_help","care_medical_institute",
]);
const MED_KINDS  = new Set(["hospital","clinic","dental","pharmacy"]);

// 日本語→英語スラッグのエイリアス（日本語で来てもOKにする）
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
  const pref    = searchParams.get("pref") || "";
  const kindRaw = searchParams.get("kind") || "";
  const q       = (searchParams.get("q") || "").toLowerCase();
  const page    = Math.max(1, Number(searchParams.get("page") || 1));
  const size    = Math.min(200, Math.max(1, Number(searchParams.get("size") || 50)));

  // ★ 市区町村（任意）
  const cityRaw = (searchParams.get("city") || "").trim();
  const city    = cityRaw.toLowerCase();

  // kind は日本語でも英語でもOK
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

  // ★ city → q の順でしぼり込み
  const filtered = all.filter((x: any) => {
    // ① 市区町村（x.city / x["市区町村"] が無いデータもあるため住所も見る）
    if (city) {
      const cityField = (
        x.city ?? x.municipality ?? x.city_ward ?? x["市区町村"] ?? x["市町村"] ?? x["区市町村"] ?? x["行政区"] ?? ""
      ).toString().toLowerCase();
      const addrField = (x.address ?? x["住所"] ?? "").toString().toLowerCase();
      if (!cityField.includes(city) && !addrField.includes(city)) return false;
    }

    // ② キーワード（名称 / 住所 / 診療科）
    if (!q) return true;
    const name = (
      x.name ?? x.facility_name ?? x.office_name ?? x["施設名"] ?? x["事業所名"] ?? ""
    ).toString().toLowerCase();
    const addr = (x.address ?? x["住所"] ?? "").toString().toLowerCase();
    const deps = (
      Array.isArray(x.departments) ? x.departments.join("、") : (x["診療科"] ?? "")
    ).toString().toLowerCase();

    return name.includes(q) || addr.includes(q) || deps.includes(q);
  });

  const start = (page - 1) * size;
  return NextResponse.json(
    { total: filtered.length, items: filtered.slice(start, start + size) },
    { headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600" } }
  );
}