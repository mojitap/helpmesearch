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
  const re = /(?:^|[^\d])([01]?\d|2[0-3])(?::([0-5]\d)|時)/g;
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

// 共通: 最初に見つかった空でない文字列を返す
const pickStr = (obj: any, keys: string[]) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
};

// 曜日別を合体して 例) "平日:9:00-18:00 / 土:9:00-12:00"
const combineDaily = (r: any, plan: Array<[string, string]>) => {
  const parts: string[] = [];
  for (const [key, label] of plan) {
    const v = r?.[key];
    if (v != null && String(v).trim()) parts.push(`${label}:${String(v).trim()}`);
  }
  return parts.join(" / ");
};

// 開始/終了のペアから合成する簡易関数
const composeFromPairs = (r: any) => {
  const pairs: Array<[string, string]> = [
    ["営業時間（開始）","営業時間（終了）"],
    ["営業時間開始","営業時間終了"],
    ["営業開始時間","営業終了時間"],
    ["開始時間","終了時間"],
    ["サービス提供開始時間","サービス提供終了時間"],
    ["提供開始時間","提供終了時間"],
    ["開局時間（開始）","開局時間（終了）"],
    ["受付開始","受付終了"], ["受付開始時間","受付終了時間"],
  ];
  for (const [a, b] of pairs) {
    const A = r?.[a], B = r?.[b];
    if (A && B) return `${A}〜${B}`;
  }
  return "";
};

// 文中から時間帯（9:00〜18:00 等）を1つ拾う最終手段
const scanForRange = (r: any) => {
  for (const v of Object.values(r)) {
    if (typeof v !== "string") continue;
    const s = toAscii(v);
    const m = s.match(/((?:[01]?\d|2[0-3]):[0-5]\d|(?:[01]?\d|2[0-3])時(?:[0-5]\d分)?)\s*[〜~\-]\s*(?:翌|翌日)?((?:[01]?\d|2[0-3]):[0-5]\d|(?:[01]?\d|2[0-3])時(?:[0-5]\d分)?)/);
    if (m) return m[0].replace(/[-~]/g, "〜");
  }
  return "";
};

// ★医療＋介護＋薬局の揺れを広めに
const readHours = (r: any) =>
  // ① 薬局の曜日×時間帯 from CSV
  buildPharmacyHours(r) ||
  // ② 病院/クリニック/歯科の 診療 or 受付 時間
  buildDeptHours(r) ||
  // ③ 単一フィールド候補（既存）
  pickStr(r, [
    // 医療
    "診療時間_平日", "診療時間", "外来診療時間", "外来受付時間",
    "診療受付時間", "通常営業時間",
    // 介護
    "サービス提供時間", "営業日時", "営業時間", "利用時間", "提供時間",
    // 薬局 単項目
    "開局時間", "開局時間_平日",
    "開局時間（平日）","開局時間(平日)","開局時間（月〜金）","開局時間(月〜金)",
    // 英語・その他
    "hours", "opening_hours", "business_hours",
    "営業時間_平日","営業時間（平日）","営業時間(平日)","営業時間 平日",
    "営業時間（月〜金）","営業時間(月〜金)","受付時間",
  ]) ||
  // ④ 曜日別の合体（既存）
  combineDaily(r, [
    ["サービス提供時間_平日","平日"], ["サービス提供時間_土曜","土"], ["サービス提供時間_日曜","日"],
    ["診療時間_平日","平日"], ["診療時間_土曜","土"], ["診療時間_日曜","日"],
    ["開局時間_平日","平日"], ["開局時間_土曜","土"], ["開局時間_日曜","日"],
    ["営業時間_平日","平日"], ["営業時間_土曜","土"], ["営業時間_日曜","日"],
    ["提供時間_平日","平日"], ["提供時間_土曜","土"], ["提供時間_日曜","日"],
  ]) ||
  composeFromPairs(r) ||
  scanForRange(r);

const valIsOne = (v: any) => {
  const s = String(v ?? "").trim();
  return s === "1" || /^true$/i.test(s) || s === "○" || s === "◯";
};

const readClosed = (r: any) => {
  const closedDays: string[] = [];
  const days = ["月","火","水","木","金","土","日"] as const;

  for (const d of days) {
    // 病院/クリニック/歯科/施設系：毎週休み系のカラム
    const weeklyKeys = [
      `毎週決まった曜日に休診（${d}）`, `毎週決まった曜日に休診(${d})`,
      `定期休診毎週（${d}）`,           `定期休診毎週(${d})`,
      `定期休業毎週（${d}）`,           `定期休業毎週(${d})`,
      `定期閉店毎週（${d}）`,           `定期閉店毎週(${d})`, // 薬局CSV
    ];
    const wk = weeklyKeys.find(k => r?.[k] != null && String(r[k]).trim() !== "");
    if (wk && valIsOne(r[wk])) closedDays.push(d);

    // 薬局CSV：「営業日（X）」が 0/空 なら休み扱い
    const openKeys = [`営業日（${d}）`, `営業日(${d})`];
    const ok = openKeys.find(k => r?.[k] != null);
    if (ok) {
      const v = String(r[ok]).trim();
      if (v && v !== "1" && !/^true$/i.test(v) && v !== "○" && v !== "◯") {
        closedDays.push(d);
      }
    }
  }

  // 祝日に休み（病院/クリニックは「祝日に休診」、薬局は「祝日」）
  const holidayKeys = ["祝日に休診","祝日","祝日に休業","祝日に閉店"];
  const hKey = holidayKeys.find(k => r?.[k] != null);
  if (hKey && valIsOne(r[hKey])) closedDays.push("祝");

  // 文字列で明示されている場合はそれを優先
  const text = pickStr(r, ["休診日","定休日","休業日","休館日","休み","店休日","店休"]);
  if (text) return text;

  return closedDays.length ? closedDays.join("・") : "";
};

// ---- ETLヘルパー（pivotHours用）----
type Day = "月" | "火" | "水" | "木" | "金" | "土" | "日" | "祝";

function normalizeDay(input: any): Day | "" {
  const s = String(input ?? "").trim();
  if (!s) return "";
  // 日本語1文字を優先して拾う
  const m = s.match(/[月火水木金土日祝]/);
  if (m) return m[0] as Day;
  // 英語表記の簡易対応
  const t = s.toLowerCase();
  if (t.startsWith("mon")) return "月";
  if (t.startsWith("tue")) return "火";
  if (t.startsWith("wed")) return "水";
  if (t.startsWith("thu")) return "木";
  if (t.startsWith("fri")) return "金";
  if (t.startsWith("sat")) return "土";
  if (t.startsWith("sun")) return "日";
  if (t.includes("holiday")) return "祝";
  return "";
}

// "9:00" / "9時30分" / "0930" / "9" → "HH:MM"
function toHHMM(val: any): string {
  const s0 = toAscii(String(val ?? ""))
    .replace(/時/g, ":")
    .replace(/分/g, "")
    .trim();

  // 0930 / 930 → 09:30
  if (/^\d{3,4}$/.test(s0)) {
    const d = s0.padStart(4, "0");
    return `${d.slice(0, 2)}:${d.slice(2)}`;
  }

  const m = s0.match(/^([0-2]?\d)(?::?([0-5]\d))?$/);
  if (!m) return "";
  const h = Math.min(23, parseInt(m[1], 10));
  const mm = m[2] ? parseInt(m[2], 10) : 0;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function pivotHours(hoursRows: any[]) {
  const map = new Map<string, Record<Day, Array<[string,string]>>>();
  for (const r of hoursRows) {
    const id = String(r["医療機関コード"]);
    const d = normalizeDay(r["曜日"]);           // Day | ""
    const s = toHHMM(r["診療開始時間"]);
    const e = toHHMM(r["診療終了時間"]);
    if (!id || !d || !s || !e) continue;         // ここで d は Day に絞られる

    if (!map.has(id)) {
      const init: Record<Day, Array<[string,string]>> = {
        月: [], 火: [], 水: [], 木: [], 金: [], 土: [], 日: [], 祝: []
      };
      map.set(id, init);
    }
    map.get(id)![d].push([s, e]);                // ここは Record<Day, ...> 確定
  }

  // 施設×曜日で最速開始 / 最遅終了を採用（ここは現状のままでOK）
  const out = new Map<string, Record<string,string>>();
  for (const [id, days] of map) {
    const rec: Record<string,string> = {};
    (["月","火","水","木","金","土","日","祝"] as Day[]).forEach(d => {
      if (!days[d].length) return;
      const starts = days[d].map(([s]) => s).sort();
      const ends   = days[d].map(([,e]) => e).sort();
      rec[`${d}_診療開始時間`] = starts[0];
      rec[`${d}_診療終了時間`] = ends[ends.length-1];
    });
    out.set(id, rec);
  }
  return out;
}

function joinFacilityAndHours(facRows: any[], hours: Map<string,Record<string,string>>) {
  return facRows.map(r => ({ ...r, ...(hours.get(String(r["医療機関コード"])) ?? {}) }));
}

const DAY_KEYS = ["月","火","水","木","金","土","日","祝"] as const;

type DayKey = typeof DAY_KEYS[number];

// ── 薬局: 「月_開店時間帯#_開始/終了時間」→ 日別レンジ配列
function pharmacyDayRanges(r: any, day: DayKey): string[] {
  const out: string[] = [];
  for (let i = 1; i <= 4; i++) {
    const s = r?.[`${day}_開店時間帯${i}_開始時間`];
    const e = r?.[`${day}_開店時間帯${i}_終了時間`];
    if (s && e) out.push(`${s}〜${e}`);
  }
  return out;
}
function buildPharmacyHours(r: any): string {
  const sig: Record<DayKey,string> = { 月:"",火:"",水:"",木:"",金:"",土:"",日:"",祝:"" };
  DAY_KEYS.forEach(d => sig[d] = pharmacyDayRanges(r, d).join(" / "));
  if (!DAY_KEYS.some(d => sig[d])) return "";
  const weekdaySame = sig["月"] && ["火","水","木","金"].every(d => sig[d as DayKey] === sig["月"]);
  const parts: string[] = [];
  if (weekdaySame) parts.push(`平日:${sig["月"]}`);
  else (["月","火","水","木","金"] as DayKey[]).forEach(d => { if (sig[d]) parts.push(`${d}:${sig[d]}`); });
  if (sig["土"]) parts.push(`土:${sig["土"]}`);
  if (sig["日"]) parts.push(`日:${sig["日"]}`);
  if (sig["祝"]) parts.push(`祝:${sig["祝"]}`);
  return parts.join(" / ");
}

// ── 病院/クリニック/歯科: 「月_診療開始/終了時間」または「月_外来受付開始/終了時間」
function buildDeptHours(r: any): string {
  const mk = (d: DayKey, a: string, b: string) => {
    const s = r?.[`${d}_${a}`], e = r?.[`${d}_${b}`];
    return s && e ? `${s}〜${e}` : "";
  };
  // 診療（最優先）
  const consult: Record<DayKey,string> = { 月:"",火:"",水:"",木:"",金:"",土:"",日:"",祝:"" };
  DAY_KEYS.forEach(d => consult[d] = mk(d, "診療開始時間", "診療終了時間"));
  const hasConsult = DAY_KEYS.some(d => consult[d]);

  // 受付（診療が無い場合のフォールバック）
  const reception: Record<DayKey,string> = { 月:"",火:"",水:"",木:"",金:"",土:"",日:"",祝:"" };
  DAY_KEYS.forEach(d => reception[d] = mk(d, "外来受付開始時間", "外来受付終了時間"));
  const sig = hasConsult ? consult : reception;
  if (!DAY_KEYS.some(d => sig[d])) return "";

  const weekdaySame = sig["月"] && ["火","水","木","金"].every(d => sig[d as DayKey] === sig["月"]);
  const label = hasConsult ? "" : "受付:";
  const parts: string[] = [];
  if (weekdaySame) parts.push(`${label}平日:${sig["月"]}`);
  else (["月","火","水","木","金"] as DayKey[]).forEach(d => { if (sig[d]) parts.push(`${label}${d}:${sig[d]}`); });
  if (sig["土"]) parts.push(`${label}土:${sig["土"]}`);
  if (sig["日"]) parts.push(`${label}日:${sig["日"]}`);
  if (sig["祝"]) parts.push(`${label}祝:${sig["祝"]}`);
  return parts.join(" / ");
}

const readMemo = (r: any) =>
  [
    "備考","注記","特記事項",
    "営業日時備考","サービス提供時間備考","連絡事項",
    "夜間","時間外","夜間対応","救急","救急告示","二次救急","三次救急",
  ].map(k => String(r?.[k] ?? "")).join(" ");


// ───── 電話番号抽出ヘルパ ─────
const toAsciiPhone = (s: string) =>
  String(s)
    // 数字と＋を半角に
    .replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0))
    .replace(/＋/g, "+")
    // すべてのダッシュ/波ダッシュ/長音を "-" に統一
    .replace(/[‐-‒–—―−ー－〜~]/g, "-")
    // 括弧類は区切りとしてスペースへ
    .replace(/[()\（\）\[\]【】]/g, " ");

const normalize81 = (w: string) =>
  w.replace(/^\+81[\s‐-–—－ー-]*/, "0").replace(/^81[\s‐-–—－ー-]*/, "0");

const extractTel = (raw: string): string => {
  let s = toAsciiPhone(String(raw));
  s = normalize81(s);

  // 0で始まるブロック（数字とハイフン含む）を広く拾う
  const cand = Array.from(s.matchAll(/0\d(?:[\d-]{6,12})\d/g)).map(m => m[0]);

  // 1) 候補にハイフンが含まれていれば、それを正規化して返す
  for (const c of cand) {
    const digits = c.replace(/\D/g, "");
    if (digits.length === 10 || digits.length === 11) {
      const normalized = c.replace(/[^0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
      return normalized;
    }
  }

  // 2) だめなら全体から数字だけ拾って 10/11 桁なら整形
  const only = s.replace(/\D/g, "");
  if (only.length === 11) {
    // 携帯/050などは 3-4-4
    return `${only.slice(0,3)}-${only.slice(3,7)}-${only.slice(7)}`;
  }
  if (only.length === 10) {
    // 地方局番は本来2/3/4桁と揺れますが、ソースにハイフンがあることが多いので
    // フォールバックとして 3-3-4 を採用（ソースにハイフンがあれば上で保持）
    return `${only.slice(0,3)}-${only.slice(3,6)}-${only.slice(6)}`;
  }
  return "";
};

// 電話番号（複数・国番号対応：最初の1番号だけ抽出）
const readTel = (r: any) => {
  const raw = pickStr(r, [
    "tel","TEL","Tel","電話","電話番号","代表電話","連絡先","連絡先電話番号",
    "phone","Phone","TEL1","TEL２","TEL_1","TEL_2","TEL-1","TEL-2",
    "電話1","電話２","TEL（代表）" // 任意で拡張
  ]);
  if (raw) {
    const hit = extractTel(raw);
    if (hit) return hit;
  }
  for (const [k, v] of Object.entries(r)) {
    if (v == null) continue;
    if (/fax|ＦＡＸ/i.test(k)) continue;           // ★ FAXを除外
    const hit = extractTel(String(v));
    if (hit) return hit;
  }
  return "";
};

const normalizeUrl = (u: string) => {
  let s = String(u || "").trim()
    // 全角記号や全角英数を半角へ
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/：/g, ":").replace(/／/g, "/").replace(/　/g, " ");
  if (!s) return "";
  // プロトコル省略を補う（例: example.com → https://example.com）
  if (!/^https?:\/\//i.test(s) && /^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(s)) {
    s = "https://" + s;
  }
  // 末尾の句読点・括弧などを落とす
  s = s.replace(/[)\]＞＞。、．，）】」』]+$/g, "");
  return s;
};

const readUrl = (r: any) => {
  // まずはよくあるキー名を広く見る
  const FIRST_KEYS = [
    "url","URL","Url",
    "website","Website","web","Web",
    "homepage","HomePage","home_page",
    "リンク","外部リンク","サイト","サイトURL",
    "ホームページ","ホームページURL","ホームページアドレス",
    "公式サイト","公式サイトURL","公式Web","公式HP","公式ホームページ",
    "ＨＰ","HP","HPアドレス","店舗HP","店舗URL","企業HP","企業URL","病院HP","薬局HP","施設HP","園HP",
    "薬局のホームページアドレス",     // ★ 薬局CSV
    "案内用ホームページアドレス",       // ★ 病院/クリニック/歯科CSV
  ];
  for (const k of FIRST_KEYS) {
    const v = r?.[k];
    if (v && String(v).trim()) {
      return normalizeUrl(String(v));
    }
  }

  // 文字列を再帰的に全部集める（配列・ネスト対策）
  const strings: string[] = [];
  const visit = (x: any, depth = 0) => {
    if (depth > 3 || x == null) return;
    if (typeof x === "string") {
      strings.push(x);
    } else if (Array.isArray(x)) {
      for (const it of x) visit(it, depth + 1);
    } else if (typeof x === "object") {
      for (const v of Object.values(x)) visit(v, depth + 1);
    }
  };
  visit(r);

  // 1) http(s):// を直接拾う
  for (const s0 of strings) {
    const s = s0.replace(/\s+/g, " ");
    const m = s.match(/https?:\/\/[^\s"'<>）)】】、。]+/i);
    if (m) return normalizeUrl(m[0]);
  }
  // 2) ドメインっぽい文字列も拾う（TLD を拡張）
  const domainRe = /\b[\w.-]+\.(?:jp|co\.jp|or\.jp|ne\.jp|go\.jp|ac\.jp|lg\.jp|com|net|org|info|biz|clinic|hospital|pharmacy|co|io)\b/i;
  for (const s0 of strings) {
    const s = s0.replace(/\s+/g, " ");
    const m = s.match(domainRe);
    if (m) return normalizeUrl(m[0]);
  }
  return "";
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
  const re = /(?:^|[^\d])([01]?\d|2[0-3])(?::([0-5]\d)|時)/g;
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
  const hours = readHours(r);
  const closed = readClosed(r);
  const tel = readTel(r);
  const memo = readMemo(r);
  const url = readUrl(r);
  const bag = `${hours} ${memo}`;

  let nightLabel = "";
  if (EMERGENCY_RE.test(bag)) {
    nightLabel = emergencyRange(bag) || "救急対応";
  }
  if (!nightLabel && NIGHT_RE.test(bag)) {
    nightLabel = nightTail(bag) || "対応あり";
  }
  return { hours, nightLabel, closed, tel, url };
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
          const extra = decorate(raw);             // hours/night/closed/tel/url
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