// app/api/search/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------- ここから定義（47都道府県対応） ----------------
const PREFS = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県",
  "埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県",
  "岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県",
  "鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県",
  "福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県",
];
const CODE_TO_PREF: Record<string, string> = {};
PREFS.forEach((n, i) => (CODE_TO_PREF[String(i + 1).padStart(2, "0")] = n));

function normalizePref(input: string): string {
  let s = (input || "").trim();
  if (!s) return "";
  if (PREFS.includes(s)) return s;                  // そのまま公式名
  if (CODE_TO_PREF[s]) return CODE_TO_PREF[s];      // 01..47 コード
  // 「東京/大阪/京都/北海道」など接尾辞なしを吸収
  const base = s.replace(/[都道府県道]$/u, "");
  if (/^北海/.test(base)) return "北海道";
  if (base === "東京") return "東京都";
  if (base === "京都") return "京都府";
  if (base === "大阪") return "大阪府";
  // それ以外は県で補完
  return base + "県";
}
// ---------------------------------------------------------------

const CARE_KINDS = new Set([
  "tokuyou","rouken","home_help","day_service",
  "community_day_service","regular_patrol_nursing",
  "night_home_help","care_medical_institute",
]);
const MED_KINDS  = new Set(["hospital","clinic","dental","pharmacy"]);

const KIND_ALIAS: Record<string, string> = {
  // --- 医療 ---
  "病院":"hospital",
  "クリニック":"clinic","診療所":"clinic","医院":"clinic",
  "歯科":"dental","歯科医院":"dental","歯科クリニック":"dental",
  "薬局":"pharmacy","調剤薬局":"pharmacy","保険薬局":"pharmacy","ドラッグストア":"pharmacy",

  // --- 介護 ---
  "特養":"tokuyou","特別養護老人ホーム":"tokuyou",
  "老健":"rouken","介護老人保健施設":"rouken",
  "訪問介護":"home_help","ホームヘルプ":"home_help",
  "デイサービス":"day_service","通所介護":"day_service",
  "地域密着型通所介護":"community_day_service","地域密着デイ":"community_day_service","小規模デイ":"community_day_service",
  "定期巡回・随時対応":"regular_patrol_nursing","定期巡回":"regular_patrol_nursing","定期巡回随時対応型訪問介護看護":"regular_patrol_nursing",
  "夜間対応型訪問介護":"night_home_help","夜間対応":"night_home_help","夜間訪問介護":"night_home_help",
  "介護医療院":"care_medical_institute","介護療養型医療施設":"care_medical_institute",
};

const normDigits = (v: any) => String(v ?? "").replace(/\D/g, "");
const low = (v: any) => String(v ?? "").toLowerCase();

// 市区町村フィルタ（コード/名称どちらでも可・部分一致OK）
function cityMatches(row: any, cityInput: string): boolean {
  if (!cityInput) return true;
  const inCode = normDigits(cityInput);
  const rowCode = normDigits(row.city_code ?? row.muni_code ?? row.city);
  if (inCode && rowCode) return rowCode.startsWith(inCode);
  const inName = low(cityInput);
  const rowName = low(row.city_name ?? row.city ?? row["市区町村名"]);
  return rowName.includes(inName);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const prefRaw = searchParams.get("pref") || "";          // 例: "岩手県" / "03" / "岩手"
  const pref = normalizePref(prefRaw);                      // 公式名へ正規化（47都道府県対応）

  const origin = new URL(req.url).origin;

  const kindRaw =
    searchParams.get("kind") ||
    searchParams.get("industry") ||
    searchParams.get("type") ||
    "";
  const kind1 = KIND_ALIAS[kindRaw] ?? kindRaw;

  const q   = (searchParams.get("q") || "").toLowerCase();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const size = Math.min(200, Math.max(1, Number(searchParams.get("size") || 50)));
  const cityParam = (searchParams.get("city") || "").trim();

  // 検索対象kind（未指定→医療4種＋介護全種を横断）
  const allowed = new Set<string>([...CARE_KINDS, ...MED_KINDS]);
  const targetKinds = kind1
    ? (allowed.has(kind1) ? [kind1] : [])
    : [...MED_KINDS, ...CARE_KINDS];

  if (!pref || targetKinds.length === 0) {
    return NextResponse.json({ total: 0, items: [] });
  }

  // public/data を fetch で読む
  let rows: any[] = [];
  for (const k of targetKinds) {
    const base = MED_KINDS.has(k) ? "medical" : "care";
    const url = `${origin}/data/${base}/${k}/${encodeURIComponent(pref)}.json`;
    try {
      const r = await fetch(url, { cache: "force-cache" });
      if (!r.ok) continue;
      const arr = (await r.json()) as any[];
      rows.push(...arr.map((r) => ({ ...r, kind: k })));
    } catch {
      // スキップ
    }
  }

  // 県名以外のフィルタ
  if (cityParam) rows = rows.filter(r => cityMatches(r, cityParam));
  if (q) {
    rows = rows.filter(r => {
      const hay = low(`${r.name ?? r.facility_name ?? ""} ${r.addr ?? ""} ${r.tags ?? ""} ${r.industry_name ?? ""} ${r.category ?? ""}`);
      return hay.includes(q);
    });
  }

  // ページング
  const total = rows.length;
  const start = (page - 1) * size;
  const items = rows
    .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")))
    .slice(start, start + size);

  return NextResponse.json({ total, items });
}