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

// ===== 表示用フィールド生成ヘルパー =====

// 住所を除いた時間系テキスト（時刻抽出用）
const timeText = (r: any) => `${readHours(r)} ${readMemo(r)}`;

// 20:00以降が含まれるか（「午後/PM」表記も考慮）
const hasNightByTime = (r: any) => {
  const t = toAscii(timeText(r));
  const pm = /午後|PM/i.test(t);
  const re = /(?:^|[^\d])(2[0-3]|1?\d)(?::([0-5]\d)|時)/g;
  const times = [...t.matchAll(re)].map(m => {
    let h = +m[1]; const mm = m[2] ? +m[2] : 0;
    if (pm && h < 12) h += 12;
    return h * 60 + mm;
  });
  return times.some(min => min >= 20 * 60);
};

const toAscii = (s: string) =>
  (s || "")
    .replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0))
    .replace(/[：－―ー〜～]/g, m => (m === "：" ? ":" : "～"));

const pickStr = (obj: any, keys: string[]) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
};

// 個別キーを並べて1行にまとめる（平日/土/日 があれば "平日:… / 土:… / 日:…" に）
const combineDaily = (r: any, plan: Array<[string, string]>) => {
  const parts: string[] = [];
  for (const [key, label] of plan) {
    const v = r?.[key];
    if (v != null && String(v).trim()) parts.push(`${label}:${String(v).trim()}`);
  }
  return parts.join(" / ");
};

// 医療 + 介護の代表的なキーを拾う
const readHours = (r: any) =>
  // まずは1フィールドで完結している候補を優先
  pickStr(r, [
    // 医療系
    "診療時間_平日", "診療時間", "外来診療時間", "外来受付時間",
    // 介護系
    "サービス提供時間", "営業時間",
    // 共通/英語
    "hours", "opening_hours", "business_hours", "営業時間_平日", "営業時間（平日）",
  ]) ||
  // だめなら曜日別を合体
  combineDaily(r, [
    ["サービス提供時間_平日","平日"], ["サービス提供時間_土曜","土"], ["サービス提供時間_日曜","日"],
    ["診療時間_平日","平日"], ["診療時間_土曜","土"], ["診療時間_日曜","日"],
    ["営業時間_平日","平日"], ["営業時間_土曜","土"], ["営業時間_日曜","日"],
  ]);

const readClosed = (r: any) =>
  pickStr(r, ["休診日", "定休日", "休業日", "休館日", "休み"]);

const readMemo = (r: any) =>
  [
    "備考","注記","特記事項",
    // care系の補足も拾う
    "営業日時備考","サービス提供時間備考","連絡事項",
    // 夜間/救急などのフラグ
    "夜間","時間外","夜間対応","救急","救急告示","二次救急","三次救急",
  ].map(k => String(r?.[k] ?? "")).join(" ");

// 電話番号（複数・国番号対応：最初の1番号だけ抽出）
const readTel = (r: any) => {
  const raw = pickStr(r, [
    "tel","TEL","Tel","電話","電話番号","代表電話","phone","Phone"
  ]);
  if (!raw) return "";
  const s = toAscii(raw);
  // +81 / 0 / 0120 の形式っぽい最初の1件だけ拾う
  const m = s.match(
    /(\+81[-\s]?\d{1,4}[-\s]?\d{2,4}[-\s]?\d{3,4}|0\d{1,4}[-\s]?\d{2,4}[-\s]?\d{3,4}|0120[-\s]?\d{3}[-\s]?\d{3})/
  );
  if (!m) return "";
  let d = m[1].replace(/[^\d+]/g, "");
  // 国番号 → 国内表記
  if (d.startsWith("+81")) d = "0" + d.slice(3);
  // 10 or 11 桁のみ採用
  return (d.length === 10 || d.length === 11) ? d : "";
};

// ── 夜間/救急ラベル作成 ──
const NIGHT_RE = /(夜|夜診|準夜|夜間|深夜|時間外|当直|24 ?時間|夜間診療|夜間受付|夜間救急|休日夜間)/i;
const EMERGENCY_RE = /(救急|ER|ＥＲ|救急外来|救命|救急告示|二次救急|三次救急)/i;

const hasNightMark = (r: any) => NIGHT_RE.test(agg(r));
const hasEmergencyMark = (r: any) => EMERGENCY_RE.test(agg(r));

// 20:00 以降の最大時刻があれば "〜HH:MM"
const nightTail = (text: string) => {
  const t = toAscii(text);
  const pm = /午後|PM/i.test(t);
  const re = /(?:^|[^\d])(2[0-3]|1?\d)(?::([0-5]\d)|時)/g;
  const mins = [...t.matchAll(re)].map(m => {
    let h = +m[1]; const mm = m[2] ? +m[2] : 0;
    if (pm && h < 12) h += 12;
    return h * 60 + mm;
  });
  if (!mins.length) return "";
  const max = Math.max(...mins);
  if (max >= 20 * 60) {
    const hh = String(Math.floor(max / 60)).padStart(2, "0");
    const mm = String(max % 60).padStart(2, "0");
    return `〜${hh}:${mm}`;
  }
  return "";
};

// 時間帯「HH:MM〜(翌)?HH:MM」を拾って "救急：…"
const emergencyRange = (text: string) => {
  const t = toAscii(text);

  // 1) 「救急/夜間/時間外」ラベル直後の時間帯を優先
  const lbl =
    t.match(/(?:救急|夜間|時間外)[^0-9]*([0-2]?\d)(?::([0-5]\d))?\s*[～~\-]\s*(翌|翌日)?\s*([0-2]?\d)(?::([0-5]\d))?/i);

  // 2) なければ文中の最後の時間帯を採用（通常→救急の順で並ぶデータ対策）
  const all = Array.from(
    t.matchAll(/([0-2]?\d)(?::([0-5]\d))?\s*[～~\-]\s*(翌|翌日)?\s*([0-2]?\d)(?::([0-5]\d))?/gi)
  );
  const m = lbl ?? (all.length ? all[all.length - 1] : null);
  if (!m) return "";

  const fmt = (h: string, mm?: string) =>
    `${String(+h).padStart(2, "0")}:${String(mm ? +mm : 0).padStart(2, "0")}`;
  const head = fmt(m[1], m[2]);
  const tail = `${m[3] ? "翌" : ""}${fmt(m[4], m[5])}`;
  return `救急：${head}〜${tail}`;
};

// 施設1件から hours / nightLabel / closed / tel を生成
const decorate = (r: any) => {
  let hours = readHours(r);
  const closed = readClosed(r);
  const tel = readTel(r);
  const memo = readMemo(r);
  const bag = `${hours} ${memo}`;

  let nightLabel = "";
  if (EMERGENCY_RE.test(bag)) {
    nightLabel = emergencyRange(bag) || "救急対応";
  }
  if (!nightLabel && NIGHT_RE.test(bag)) {
    nightLabel = nightTail(bag) || "対応あり";
  }
  return { hours, nightLabel, closed, tel };
};

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

// 先に共通ユーティリティ
const normDigits = (v: any) => String(v ?? "").replace(/\D/g, "");
const low = (v: any) => String(v ?? "").toLowerCase();

// 1) 検索対象テキスト（名前/住所/診療時間/備考などを結合して小文字化）
const agg = (r: any) =>
  (
    `${r.name ?? r.facility_name ?? r.office_name ?? ""} ${r.addr ?? r.address ?? ""} ${r.tags ?? ""} ${r.industry_name ?? ""} ${r.category ?? ""} `
    + `${r.hours ?? r.opening_hours ?? r.business_hours ?? ""} `
    + `${r["診療時間"] ?? ""} ${r["診療時間_平日"] ?? ""} ${r["診療時間_土曜"] ?? ""} ${r["診療時間_日曜"] ?? ""} `
    + `${r["受付時間"] ?? ""} ${r["備考"] ?? r["注記"] ?? r["特記事項"] ?? ""} `
    + `${r["夜間"] ?? r["時間外"] ?? r["夜間対応"] ?? ""} ${r["救急"] ?? r["救急告示"] ?? r["二次救急"] ?? r["三次救急"] ?? ""} `
  ).toString().toLowerCase();

// 6) 市区町村フィルタ（これはどこでも良いが、この後で）
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
      rows.push(
        ...arr.map((raw) => {
          const extra = decorate(raw);
          return { ...raw, ...extra, kind: k };
        })
      );
    } catch {
      // スキップ
    }
  }

  // 県名以外のフィルタ
  if (cityParam) rows = rows.filter(r => cityMatches(r, cityParam));

  if (q) {
    const wantsNight     = NIGHT_RE.test(q);
    const wantsEmergency = EMERGENCY_RE.test(q);

    if (wantsNight || wantsEmergency) {
      rows = rows.filter(r => {
        const text = agg(r);
        const nightOk = wantsNight
          // マーク or 時刻 or 「夜」単体が本文に含まれる（後方互換）
          ? (hasNightMark(r) || hasNightByTime(r) || /夜/.test(text))
          : true;
        const emOk = wantsEmergency ? hasEmergencyMark(r) : true;
        return nightOk && emOk;
      });
    } else {
      // 従来の部分一致（agg は name/住所/診療時間/備考などを結合済み）
      rows = rows.filter(r => agg(r).includes(q));
    }
  }

  // ページング
  // ページング
  const total = rows.length;
  const start = (page - 1) * size;

  // ★ 空文字ソート回避のための名前取得ヘルパー（ここに追加）
  const getName = (x: any) =>
    x.name ?? x.facility_name ?? x.office_name ?? x["施設名"] ?? x["事業所名"] ?? "";

  const items = rows
    .sort((a, b) => String(getName(a)).localeCompare(String(getName(b)), "ja"))
    .slice(start, start + size);

  return NextResponse.json({ total, items });
}