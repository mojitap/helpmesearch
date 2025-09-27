// scripts/build-clinic-json.mjs
import fs from "node:fs";
import path from "node:path";

// -------- CSVユーティリティ --------
function parseCSVLine(line) {
  const out = [];
  let cur = "", inQ = false;
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
  const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""); // BOM対策
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(l => parseCSVLine(l));
  return { header, rows };
}
function idx(header, names) {
  for (const n of names) {
    const i = header.findIndex(h => h === n);
    if (i !== -1) return i;
  }
  return -1;
}

// -------- 診療科の正規化（必要十分） --------
const DEPT_ALIASES = {
  "耳鼻科": "耳鼻咽喉科",
  "心療内科": "精神科・心療内科",
  "精神科": "精神科・心療内科",
  "産科": "産婦人科",
  "婦人科": "産婦人科",
};
function canonDept(name) {
  const n = (name || "").replace(/\s+/g, "");
  return DEPT_ALIASES[n] || n;
}

// -------- 時間の取り扱い --------
const DAY_KEYS = [
  ["月","mon"],["火","tue"],["水","wed"],["木","thu"],["金","fri"],["土","sat"],["日","sun"],["祝","hol"],
];
function putSlot(obj, dept, dayKey, start, end, type="consult") {
  if (!start || !end) return;
  obj.hours ??= {};
  obj.hours[dept] ??= { consult:{}, accept:{} };
  const bag = obj.hours[dept][type];
  bag[dayKey] ??= [];
  bag[dayKey].push([start, end]);
}

// -------- 住所→都道府県/市区町村 推定（public/data/pref を利用） --------
const PREF_DIR = path.resolve("public/data/pref");
const PREF_NAMES = fs.existsSync(PREF_DIR)
  ? fs.readdirSync(PREF_DIR).filter(f => f.endsWith(".json")).map(f => f.replace(/\.json$/,""))
  : [];

const PREF_CITY_MAP = new Map(); // pref -> [cityName... 長い順]
for (const pref of PREF_NAMES) {
  try {
    const arr = JSON.parse(fs.readFileSync(path.join(PREF_DIR, `${pref}.json`), "utf8"));
    const names = (arr || []).map(ci => typeof ci === "string" ? ci : ci.name);
    // 長い市区名からマッチ（「区」など短い語の誤爆を避ける）
    PREF_CITY_MAP.set(pref, names.sort((a,b)=>b.length - a.length));
  } catch {}
}
function inferPrefCity(address) {
  if (!address) return { pref:"", city:"" };
  const pref = PREF_NAMES.find(p => address.startsWith(p)) || "";
  if (!pref) return { pref:"", city:"" };
  const city = (PREF_CITY_MAP.get(pref) || []).find(c => address.includes(c)) || "";
  return { pref, city };
}

// -------- 入出力パス --------
const facilityCSV = path.resolve(process.argv[2] || "data/mhlw/clinic_facility_latest.csv");
const hoursCSV    = path.resolve(process.argv[3] || "data/mhlw/clinic_hours_latest.csv");
const outBaseDir  = path.resolve("public/data/medical/clinic");
fs.mkdirSync(outBaseDir, { recursive: true });

// -------- 施設票の読み込み --------
const { header: H1, rows: R1 } = readCSV(facilityCSV);
const col = {
  id:   idx(H1, ["ID"]),
  name: idx(H1, ["正式名称"]),
  kana: idx(H1, ["正式名称（フリガナ）"]),
  addr: idx(H1, ["所在地"]),
  lat:  idx(H1, ["所在地座標（緯度）"]),
  lng:  idx(H1, ["所在地座標（経度）"]),
  url:  idx(H1, ["案内用ホームページアドレス"]),
};
for (const [k,v] of Object.entries(col)) {
  if (v === -1) { console.error(`施設票に必要列が見つかりません: ${k}`); process.exit(1); }
}

// 施設マップ id -> オブジェクト（hoursは後で合流）
const facilities = new Map();
for (const row of R1) {
  const id = row[col.id];
  if (!id) continue;
  const name = row[col.name] || "";
  const kana = row[col.kana] || "";
  const address = row[col.addr] || "";
  const lat = row[col.lat] ? Number(row[col.lat]) : null;
  const lng = row[col.lng] ? Number(row[col.lng]) : null;
  const url = row[col.url] || "";

  const { pref, city } = inferPrefCity(address);

  facilities.set(id, {
    id, name, kana, address, lat, lng, url,
    pref, city,
    depts: new Set(), // 後でArrayに
    hours: undefined, // 後で詰める { dept: { consult:{mon:[],...}, accept:{...} } }
  });
}

// -------- 診療時間票の読み込み＆結合 --------
const { header: H2, rows: R2 } = readCSV(hoursCSV);
const dcol = {
  id:   idx(H2, ["ID"]),
  dname:idx(H2, ["診療科目名"]),
  band: idx(H2, ["診療時間帯"]),
  // 診療時間
  mon_s:idx(H2, ["月_診療開始時間"]), mon_e:idx(H2, ["月_診療終了時間"]),
  tue_s:idx(H2, ["火_診療開始時間"]), tue_e:idx(H2, ["火_診療終了時間"]),
  wed_s:idx(H2, ["水_診療開始時間"]), wed_e:idx(H2, ["水_診療終了時間"]),
  thu_s:idx(H2, ["木_診療開始時間"]), thu_e:idx(H2, ["木_診療終了時間"]),
  fri_s:idx(H2, ["金_診療開始時間"]), fri_e:idx(H2, ["金_診療終了時間"]),
  sat_s:idx(H2, ["土_診療開始時間"]), sat_e:idx(H2, ["土_診療終了時間"]),
  sun_s:idx(H2, ["日_診療開始時間"]), sun_e:idx(H2, ["日_診療終了時間"]),
  hol_s:idx(H2, ["祝_診療開始時間"]), hol_e:idx(H2, ["祝_診療終了時間"]),
  // 受付時間
  mon_as:idx(H2, ["月_外来受付開始時間"]), mon_ae:idx(H2, ["月_外来受付終了時間"]),
  tue_as:idx(H2, ["火_外来受付開始時間"]), tue_ae:idx(H2, ["火_外来受付終了時間"]),
  wed_as:idx(H2, ["水_外来受付開始時間"]), wed_ae:idx(H2, ["水_外来受付終了時間"]),
  thu_as:idx(H2, ["木_外来受付開始時間"]), thu_ae:idx(H2, ["木_外来受付終了時間"]),
  fri_as:idx(H2, ["金_外来受付開始時間"]), fri_ae:idx(H2, ["金_外来受付終了時間"]),
  sat_as:idx(H2, ["土_外来受付開始時間"]), sat_ae:idx(H2, ["土_外来受付終了時間"]),
  sun_as:idx(H2, ["日_外来受付開始時間"]), sun_ae:idx(H2, ["日_外来受付終了時間"]),
  hol_as:idx(H2, ["祝_外来受付開始時間"]), hol_ae:idx(H2, ["祝_外来受付終了時間"]),
};
for (const [k,v] of Object.entries(dcol)) {
  if (v === -1) { console.error(`診療時間票に必要列が見つかりません: ${k}`); process.exit(1); }
}

let joinedCount = 0;
for (const row of R2) {
  const id = row[dcol.id];
  const rec = facilities.get(id);
  if (!rec) continue; // 施設票に無いIDは無視
  if ((row[dcol.band] || "") !== "1") {
    // 外来以外はスキップ（必要なら条件を調整）
    continue;
  }
  const dept = canonDept(row[dcol.dname] || "");
  if (!dept) continue;

  rec.depts.add(dept);

  const dayCols = [
    ["mon", dcol.mon_s, dcol.mon_e, dcol.mon_as, dcol.mon_ae],
    ["tue", dcol.tue_s, dcol.tue_e, dcol.tue_as, dcol.tue_ae],
    ["wed", dcol.wed_s, dcol.wed_e, dcol.wed_as, dcol.wed_ae],
    ["thu", dcol.thu_s, dcol.thu_e, dcol.thu_as, dcol.thu_ae],
    ["fri", dcol.fri_s, dcol.fri_e, dcol.fri_as, dcol.fri_ae],
    ["sat", dcol.sat_s, dcol.sat_e, dcol.sat_as, dcol.sat_ae],
    ["sun", dcol.sun_s, dcol.sun_e, dcol.sun_as, dcol.sun_ae],
    ["hol", dcol.hol_s, dcol.hol_e, dcol.hol_as, dcol.hol_ae],
  ];
  for (const [dk, sIdx, eIdx, asIdx, aeIdx] of dayCols) {
    const s  = row[sIdx], e  = row[eIdx];
    const as = row[asIdx], ae = row[aeIdx];
    if (s && e)  putSlot(rec, dept, dk, s,  e,  "consult");
    if (as && ae)putSlot(rec, dept, dk, as, ae, "accept");
  }
  joinedCount++;
}

// -------- 都道府県ごとに出力 --------
const byPref = new Map();
for (const rec of facilities.values()) {
  const pref = rec.pref || "不明";
  if (!byPref.has(pref)) byPref.set(pref, []);
  const outRec = {
    id: rec.id,
    name: rec.name,
    kana: rec.kana,
    address: rec.address,
    lat: rec.lat,
    lng: rec.lng,
    url: rec.url,
    city: rec.city,
    depts: Array.from(rec.depts).sort(),
    hours: rec.hours,
  };
  byPref.get(pref).push(outRec);
}

// ソート（市名→施設名）
for (const [pref, arr] of byPref) {
  arr.sort((a,b) => (a.city || "").localeCompare(b.city || "", "ja") || a.name.localeCompare(b.name, "ja"));
  const file = path.join(outBaseDir, `${pref}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
  console.log(`wrote: ${file} (${arr.length} clinics)`);
}
console.log(`joined ${joinedCount} speciality/hour rows. done.`);