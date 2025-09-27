// scripts/build-medical.mjs
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const ROOT = process.cwd();

// ←★ あなたの構成に合わせた場所
const MHLW_DIR = path.join(ROOT, "data", "mhlw"); // 例: data/mhlw/2025-06-01/*.csv
const OUT = path.join(ROOT, "public", "data", "medical");

const PREFS = ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"];

// ===== util =====
const firstKey = (row, names) => {
  for (const n of names) {
    const k = Object.keys(row).find(h => h.trim() === n);
    if (k) return row[k];
  }
  return "";
};
const readCSV = (p) => parse(fs.readFileSync(p, "utf-8"), { columns:true, skip_empty_lines:true });
const ensureDir = (p) => fs.mkdirSync(p, { recursive:true });

// data/mhlw/配下の**日付フォルダ**を新しい順に並べ、prefixに一致するCSVを探す
const detectLatest = (prefix) => {
  if (!fs.existsSync(MHLW_DIR)) return null;
  const dateDirs = fs.readdirSync(MHLW_DIR)
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && fs.statSync(path.join(MHLW_DIR,d)).isDirectory())
    .sort() // 文字列日付は昇順
    .reverse(); // 新しい順

  for (const d of dateDirs) {
    const dir = path.join(MHLW_DIR, d);
    const hit = fs.readdirSync(dir).find(f => f.startsWith(prefix) && f.endsWith(".csv"));
    if (hit) return path.join(dir, hit);
  }
  return null;
};

const pickPrefCity = (row) => {
  const pref = firstKey(row, ["都道府県名","都道府県","pref"]) || (() => {
    const addr = firstKey(row, ["所在地","住所","所在地住所","所在地（住所）","address"]);
    return PREFS.find(p => addr?.startsWith(p)) || "";
  })();
  const city =
    firstKey(row, ["市区町村名","市区町村","市町村名","郡市区","city"]) ||
    (firstKey(row, ["所在地","住所","所在地住所","所在地（住所）","address"]) || "")
      .replace(pref,"")
      .split(/[０-９0-9\-－―丁目番地\s]/)[0] || "";
  return { pref, city };
};

const normalizeCommon = (row) => {
  const id = firstKey(row, ["医療機関コード","施設ID","機関ID","id","ID"]) || "";
  const name = firstKey(row, ["医療機関名称","機関名称","名称","name"]);
  const tel = firstKey(row, ["電話番号","TEL","Tel","tel"]);
  const url = firstKey(row, ["URL","Url","url","ホームページ"]);
  const address = firstKey(row, ["所在地","住所","所在地住所","所在地（住所）","address"]);
  const { pref, city } = pickPrefCity(row);
  return { id: String(id || name), name, tel, url, address, pref, city };
};

const buildDeptMap = (rows) => {
  const m = new Map();
  for (const r of rows) {
    const id = String(firstKey(r, ["医療機関コード","施設ID","機関ID","id","ID"]) || "");
    if (!id) continue;
    const dept = firstKey(r, ["標榜科名","診療科名","診療科","科名","dept"]) || "";
    if (!dept) continue;
    if (!m.has(id)) m.set(id, new Set());
    m.get(id).add(dept);
  }
  return m;
};

const writeByPref = (dirName, items) => {
  const outDir = path.join(OUT, dirName);
  ensureDir(outDir);
  const byPref = {};
  for (const it of items) {
    if (!it.pref) continue;
    (byPref[it.pref] ||= []).push(it);
  }
  for (const [pref, list] of Object.entries(byPref)) {
    list.sort((a,b) =>
      (a.city||"").localeCompare(b.city||"", "ja") ||
      (a.name||"").localeCompare(b.name||"", "ja")
    );
    fs.writeFileSync(path.join(outDir, `${pref}.json`), JSON.stringify(list, null, 2));
  }
  console.log(`✔ ${dirName}: ${Object.keys(byPref).length} prefectures`);
};

// ===== builders =====
const buildHospital = () => {
  const fInfo = detectLatest("01-1_hospital_facility_info_");
  if (!fInfo) return console.warn("! hospital facility csv not found");
  const info = readCSV(fInfo);

  const fDept = detectLatest("01-2_hospital_speciality_hours_");
  const deptMap = fDept ? buildDeptMap(readCSV(fDept)) : new Map();

  const items = info.map(r => {
    const base = normalizeCommon(r);
    return { ...base, kind:"hospital", departments: Array.from(deptMap.get(String(base.id)) || []) };
  });
  writeByPref("hospital", items);
};

const buildClinic = () => {
  const fInfo = detectLatest("02-1_clinic_facility_info_");
  if (!fInfo) return console.warn("! clinic facility csv not found");
  const info = readCSV(fInfo);

  const fDept = detectLatest("02-2_clinic_speciality_hours_");
  const deptMap = fDept ? buildDeptMap(readCSV(fDept)) : new Map();

  const items = info.map(r => {
    const base = normalizeCommon(r);
    return { ...base, kind:"clinic", departments: Array.from(deptMap.get(String(base.id)) || []) };
  });
  writeByPref("clinic", items);
};

const buildDental = () => {
  const fInfo = detectLatest("03-1_dental_facility_info_");
  if (!fInfo) return console.warn("! dental facility csv not found");
  const info = readCSV(fInfo);

  const fDept = detectLatest("03-2_dental_speciality_hours_");
  const deptMap = fDept ? buildDeptMap(readCSV(fDept)) : new Map();

  const items = info.map(r => {
    const base = normalizeCommon(r);
    return { ...base, kind:"dental", departments: Array.from(deptMap.get(String(base.id)) || []) };
  });
  writeByPref("dental", items);
};

const buildPharmacy = () => {
  const f = detectLatest("05_pharmacy_");
  if (!f) return console.warn("! pharmacy csv not found");
  const rows = readCSV(f);
  const items = rows.map(r => ({ ...normalizeCommon(r), kind:"pharmacy" }));
  writeByPref("pharmacy", items);
};

// run
fs.mkdirSync(OUT, { recursive:true });
buildHospital();
buildClinic();
buildDental();
buildPharmacy();
console.log("Done.");