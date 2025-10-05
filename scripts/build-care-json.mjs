// scripts/build-care-json.mjs
import fs from "node:fs";
import path from "node:path";

// ====== 基本パス ======
const ROOT = process.cwd();
const MHLW_DIR = path.join(ROOT, "data", "mhlw");             // CSV置き場
const OUT_DIR  = path.join(ROOT, "public", "data", "care");    // 出力先

// ====== 県名 ======
const PREFS = ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"];

// ====== care カテゴリ定義（CSVプレフィックス → 出力スラッグ/表示名）======
const CARE_DEFS = [
  { prefix: "510_tokuyou_",               slug: "tokuyou",                 label: "特別養護老人ホーム" },
  { prefix: "520_rouken_",                slug: "rouken",                  label: "介護老人保健施設" },
  { prefix: "550_care_medical_institute_",slug: "care_medical_institute",  label: "介護医療院" },
  { prefix: "150_day_service_",           slug: "day_service",             label: "通所介護" },
  { prefix: "110_home_help_",             slug: "home_help",               label: "訪問介護" },
  { prefix: "710_night_home_help_",       slug: "night_home_help",         label: "夜間対応型訪問介護" },
  { prefix: "760_regular_patrol_nursing_",slug: "regular_patrol_nursing",  label: "定期巡回・随時対応型訪問介護看護" },
  { prefix: "780_community_day_service_", slug: "community_day_service",   label: "地域密着型通所介護" },
];

// ====== CSVヘルパ ======
function parseCSVLine(line) {
  const out = []; let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i], nx = line[i + 1];
    if (ch === '"' && inQ && nx === '"') { cur += '"'; i++; continue; }
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map(s => s.trim());
}
function readCSV(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(l => parseCSVLine(l));
  return { header, rows };
}
const col = (h, name) => h.indexOf(name);

// ====== 電話/URL 正規化（medicalと同等） ======
const toAscii = (s) =>
  String(s ?? "")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/：/g, ":").replace(/／/g, "/").replace(/　/g, " ");

const toAsciiPhone = (s) =>
  toAscii(s).replace(/＋/g, "+")
    .replace(/[‐-‒–—―−ー－〜~]/g, "-")
    .replace(/[()\（\）\[\]【】]/g, " ");

const normalize81 = (w) =>
  w.replace(/^\+81[\s‐-–—－ー-]*/, "0").replace(/^81[\s‐-–—－ー-]*/, "0");

function extractTel(raw) {
  let s = toAsciiPhone(String(raw || ""));
  s = normalize81(s);
  const cand = Array.from(s.matchAll(/0\d(?:[\d-]{6,12})\d/g)).map(m => m[0]);
  for (const c of cand) {
    const d = c.replace(/\D/g, "");
    if (d.length === 10 || d.length === 11) {
      return c.replace(/[^0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
    }
  }
  const only = s.replace(/\D/g, "");
  if (only.length === 11) return `${only.slice(0,3)}-${only.slice(3,7)}-${only.slice(7)}`;
  if (only.length === 10)  return `${only.slice(0,3)}-${only.slice(3,6)}-${only.slice(6)}`;
  return "";
}

function normalizeUrl(u) {
  let s = toAscii(String(u || "").trim());
  if (!s) return "";
  if (!/^https?:\/\//i.test(s) && /^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(s)) s = "https://" + s;
  return s.replace(/[)\]＞＞。、．，）】」』]+$/g, "");
}

// ====== ファイル検出（_latest 優先 → 日付フォルダ） ======
function detectLatest(prefix) {
  const latest = path.join(MHLW_DIR, `${prefix.replace(/_$/, "")}_latest.csv`);
  if (fs.existsSync(latest)) return latest;

  if (!fs.existsSync(MHLW_DIR)) return null;
  const dateDirs = fs.readdirSync(MHLW_DIR)
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && fs.statSync(path.join(MHLW_DIR,d)).isDirectory())
    .sort().reverse();
  for (const d of dateDirs) {
    const dir = path.join(MHLW_DIR, d);
    const hit = fs.readdirSync(dir).find(f => f.startsWith(prefix) && f.endsWith(".csv"));
    if (hit) return path.join(dir, hit);
  }
  return null;
}

// ====== カテゴリ1つ分のビルド ======
function buildOneCare({ prefix, slug, label }) {
  const csv = detectLatest(prefix);
  if (!csv) { console.warn(`! not found: ${prefix}*.csv`); return; }

  const outDir = path.join(OUT_DIR, slug);
  fs.mkdirSync(outDir, { recursive: true });

  const { header, rows } = readCSV(csv);
  const IDX = {
    pref:     col(header, "都道府県名"),
    city:     col(header, "市区町村名"),
    name:     col(header, "事業所名"),
    kana:     col(header, "事業所名カナ"),
    addr:     col(header, "住所"),
    bldg:     col(header, "方書（ビル名等）"),
    lat:      col(header, "緯度"),
    lng:      col(header, "経度"),
    tel:      col(header, "電話番号"),
    no:       col(header, "事業所番号"),
    days:     col(header, "利用可能曜日"),
    daysNote: col(header, "利用可能曜日特記事項"),
    cap:      col(header, "定員"),
    url:      col(header, "URL"),
    svc:      col(header, "サービスの種類"),
  };

  const byPref = new Map();

  for (const r of rows) {
    const pref = IDX.pref >= 0 ? r[IDX.pref] : "";
    if (!pref) continue;
    const city = IDX.city >= 0 ? r[IDX.city] : "";

    const rawTel = IDX.tel >= 0 ? r[IDX.tel] : "";
    const tel = extractTel(rawTel);

    const rec = {
      id: (IDX.no >= 0 ? r[IDX.no] : "") || (r[0] || ""),
      name: IDX.name >= 0 ? r[IDX.name] : "",
      kana: IDX.kana >= 0 ? r[IDX.kana] : "",
      address: (IDX.addr >= 0 ? r[IDX.addr] : "") + ((IDX.bldg >= 0 && r[IDX.bldg]) ? ` ${r[IDX.bldg]}` : ""),
      lat: (IDX.lat >= 0 && r[IDX.lat]) ? (Number(r[IDX.lat]) || null) : null,
      lng: (IDX.lng >= 0 && r[IDX.lng]) ? (Number(r[IDX.lng]) || null) : null,
      tel,
      url: IDX.url >= 0 ? normalizeUrl(r[IDX.url]) : "",
      pref, city,
      category: slug,
      kindLabel: label,
      serviceType: IDX.svc >= 0 ? r[IDX.svc] : "",
      capacity: (IDX.cap >= 0 && r[IDX.cap]) ? Number(String(r[IDX.cap]).replace(/[,，]/g,"")) : null,
      openDays: IDX.days >= 0 ? (r[IDX.days] || "").split(/[,、\s]+/).filter(Boolean) : [],
      openDaysNote: IDX.daysNote >= 0 ? (r[IDX.daysNote] || "") : "",
    };

    (byPref.get(pref) ?? byPref.set(pref, []).get(pref)).push(rec);
  }

  for (const [pref, arr] of byPref) {
    arr.sort((a, b) =>
      (a.city || "").localeCompare(b.city || "", "ja") ||
      a.name.localeCompare(b.name, "ja")
    );
    const outfile = path.join(outDir, `${pref}.json`);
    fs.writeFileSync(outfile, JSON.stringify(arr, null, 2));
    console.log(`✔ ${slug}: wrote ${outfile} (${arr.length})`);
  }
}

// ====== 実行 ======
fs.mkdirSync(OUT_DIR, { recursive: true });
for (const def of CARE_DEFS) buildOneCare(def);
console.log("Done (care).");