// scripts/build-care-json.mjs
import fs from "node:fs";
import path from "node:path";

// ---- CSV helpers ----
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

// ---- format helpers ----
const toAscii = (s) => (s ?? '').toString().normalize('NFKC').trim();
const digitsOnly = (s) => toAscii(s).replace(/[^\d]/g, '');
function formatJPPhone(raw) {
  const d = digitsOnly(raw);
  if (!(d.startsWith('0') && (d.length === 10 || d.length === 11))) return '';
  if (d.length === 10 && (d.startsWith('03') || d.startsWith('06'))) {
    return `${d.slice(0,2)}-${d.slice(2,6)}-${d.slice(6)}`;
  }
  if (d.length === 10) {
    return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;
  }
  return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
}

const KIND_LABELS = {
  tokuyou: '特別養護老人ホーム',
  rouken: '介護老人保健施設',
  care_medical_institute: '介護医療院',
  day_service: '通所介護',
  community_day_service: '地域密着型通所介護',
  home_help: '訪問介護',
  night_home_help: '夜間対応型訪問介護',
  regular_patrol_nursing: '定期巡回・随時対応型訪問介護看護',
};

// ---- 入出力 ----
// 使い方: node scripts/build-care-json.mjs <input_csv> <category_slug>
// 例: node scripts/build-care-json.mjs data/mhlw/510_tokuyou_latest.csv tokuyou
const inCSV = path.resolve(process.argv[2] || "");
const category = (process.argv[3] || "").trim(); // tokuyou, rouken, care_medical_institute, day_service, home_help, night_home_help, regular_patrol_nursing, community_day_service
if (!inCSV || !category) {
  console.error("Usage: node scripts/build-care-json.mjs <input_csv> <category_slug>");
  process.exit(1);
}

const outDir = path.resolve(`public/data/care/${category}`);
fs.mkdirSync(outDir, { recursive: true });

const { header, rows } = readCSV(inCSV);

// 主要列（存在しない可能性もあるので index=-1 を許容）
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
  const city = IDX.city >= 0 ? r[IDX.city] : "";
  if (!pref) continue; // 県が無い行は捨てる

  const rawTel = IDX.tel >= 0 ? r[IDX.tel] : "";
  const tel = formatJPPhone(rawTel); // ← 全角→半角 & 10/11桁のみ

  const rec = {
    id: (IDX.no >= 0 ? r[IDX.no] : "") || (r[0] || ""), // 事業所番号優先、なければ先頭列フォールバック
    name: IDX.name >= 0 ? r[IDX.name] : "",
    kana: IDX.kana >= 0 ? r[IDX.kana] : "",
    address: (IDX.addr >= 0 ? r[IDX.addr] : "") + ((IDX.bldg >= 0 && r[IDX.bldg]) ? ` ${r[IDX.bldg]}` : ""),
    lat: (IDX.lat >= 0 && r[IDX.lat]) ? (Number(r[IDX.lat]) || null) : null,
    lng: (IDX.lng >= 0 && r[IDX.lng]) ? (Number(r[IDX.lng]) || null) : null,
    tel,
    url: IDX.url >= 0 ? r[IDX.url] : "",
    pref, city,
    category,                                 // スラッグ
    kindLabel: KIND_LABELS[category] ?? category, // 表示用（日本語）
    serviceType: IDX.svc >= 0 ? r[IDX.svc] : "", // CSVにある“サービスの種類”の原文
    capacity: (IDX.cap >= 0 && r[IDX.cap]) ? Number(r[IDX.cap].replace(/[,，]/g,"")) : null,
    openDays: IDX.days >= 0 ? (r[IDX.days] || "").split(/[,、\s]+/).filter(Boolean) : [],
    openDaysNote: IDX.daysNote >= 0 ? (r[IDX.daysNote] || "") : "",
  };

  const key = pref;
  if (!byPref.has(key)) byPref.set(key, []);
  byPref.get(key).push(rec);
}

// 出力（県ごと）
for (const [pref, arr] of byPref) {
  arr.sort((a, b) =>
    (a.city || "").localeCompare(b.city || "", "ja") ||
    a.name.localeCompare(b.name, "ja")
  );
  const outfile = path.join(outDir, `${pref}.json`);
  fs.writeFileSync(outfile, JSON.stringify(arr, null, 2));
  console.log(`wrote: ${outfile} (${arr.length})`);
}
console.log("done.");