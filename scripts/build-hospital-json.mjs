// scripts/build-hospital-json.mjs
import fs from "node:fs";
import path from "node:path";

/* ───── CSV utils ───── */
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
  const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(l => parseCSVLine(l));
  return { header, rows };
}
function idx(header, name) {
  const i = header.indexOf(name);
  if (i === -1) throw new Error(`列が見つかりません: ${name}`);
  return i;
}

/* ───── 県/市 推定（pref/city JSONを利用） ───── */
const PREF_DIR = path.resolve("public/data/pref");
const PREFS = fs.existsSync(PREF_DIR)
  ? fs.readdirSync(PREF_DIR).filter(f => f.endsWith(".json")).map(f => f.replace(/\.json$/,""))
  : [];
const PREF_CITY_MAP = new Map();
for (const pref of PREFS) {
  try {
    const arr = JSON.parse(fs.readFileSync(path.join(PREF_DIR, `${pref}.json`), "utf8"));
    const names = (arr || []).map(ci => typeof ci === "string" ? ci : ci.name);
    // 長い市区町村名優先でマッチ（例: "札幌市中央区" が "札幌市" より先）
    PREF_CITY_MAP.set(pref, names.sort((a,b)=>b.length - a.length));
  } catch {}
}
function inferPrefCity(address) {
  if (!address) return { pref:"", city:"" };
  const pref = PREFS.find(p => address.startsWith(p)) || "";
  if (!pref) return { pref:"", city:"" };
  const city = (PREF_CITY_MAP.get(pref) || []).find(c => address.includes(c)) || "";
  return { pref, city };
}

/* ───── hours 追加ヘルパ ───── */
function putSlot(obj, dept, kind /* "consult" | "accept" */, dayKey, start, end) {
  if (!start || !end) return;
  obj.hours ??= {};
  obj.hours[dept] ??= { consult: {}, accept: {} };
  const bag = obj.hours[dept][kind];
  bag[dayKey] ??= [];
  bag[dayKey].push([start, end]);
}

/* ───── 入出力 ───── */
const facilityCSV = path.resolve(process.argv[2] || "data/mhlw/hospital_facility_latest.csv");
const hoursCSV    = path.resolve(process.argv[3] || "data/mhlw/hospital_hours_latest.csv");
const outDir      = path.resolve("public/data/medical/hospital");
fs.mkdirSync(outDir, { recursive: true });

/* ───── 施設票 読み込み ───── */
const { header: F, rows: fRows } = readCSV(facilityCSV);
const FCOL = {
  id:   idx(F, "ID"),
  name: idx(F, "正式名称"),
  kana: idx(F, "正式名称（フリガナ）"),
  addr: idx(F, "所在地"),
  lat:  idx(F, "所在地座標（緯度）"),
  lng:  idx(F, "所在地座標（経度）"),
  url:  F.indexOf("案内用ホームページアドレス"), // 無くてもOK
};
// ID -> レコード
const recById = new Map();
for (const r of fRows) {
  const id = r[FCOL.id];
  if (!id) continue;
  const name = r[FCOL.name] || "";
  const kana = r[FCOL.kana] || "";
  const address = r[FCOL.addr] || "";
  const lat = r[FCOL.lat] ? (Number(r[FCOL.lat]) || null) : null; // 0.0 → null 扱い
  const lng = r[FCOL.lng] ? (Number(r[FCOL.lng]) || null) : null;
  const url = (FCOL.url >= 0 ? (r[FCOL.url] || "") : "");
  const { pref, city } = inferPrefCity(address);

  recById.set(id, { id, name, kana, address, lat, lng, url, pref, city, hours: undefined });
}

/* ───── 診療科・診療時間票 読み込み ───── */
const { header: H, rows: hRows } = readCSV(hoursCSV);
const HCOL = {
  id:   idx(H, "ID"),
  dept: idx(H, "診療科目名"),
  band: idx(H, "診療時間帯"), // 1,2,3...（時間帯番号）
};
const DAYS = [
  { k:"mon", j:"月" }, { k:"tue", j:"火" }, { k:"wed", j:"水" }, { k:"thu", j:"木" },
  { k:"fri", j:"金" }, { k:"sat", j:"土" }, { k:"sun", j:"日" }, { k:"hol", j:"祝" },
];
function hConsultStart(jDay) { return `${jDay}_診療開始時間`; }
function hConsultEnd(jDay)   { return `${jDay}_診療終了時間`; }
function hAcceptStart(jDay)  { return `${jDay}_外来受付開始時間`; }
function hAcceptEnd(jDay)    { return `${jDay}_外来受付終了時間`; }

for (const r of hRows) {
  const id   = r[HCOL.id];
  const dept = r[HCOL.dept] || "";
  if (!id || !dept) continue;
  const rec = recById.get(id);
  if (!rec) continue; // 施設票に無いIDはスキップ

  // 各曜日の「診療（consult）」＆「外来受付（accept）」を追加
  for (const d of DAYS) {
    // 診療時間
    const csIdx = H.indexOf(hConsultStart(d.j));
    const ceIdx = H.indexOf(hConsultEnd(d.j));
    if (csIdx !== -1 && ceIdx !== -1) {
      const s = r[csIdx], e = r[ceIdx];
      if (s && e) putSlot(rec, dept, "consult", d.k, s, e);
    }
    // 外来受付
    const asIdx = H.indexOf(hAcceptStart(d.j));
    const aeIdx = H.indexOf(hAcceptEnd(d.j));
    if (asIdx !== -1 && aeIdx !== -1) {
      const s = r[asIdx], e = r[aeIdx];
      if (s && e) putSlot(rec, dept, "accept", d.k, s, e);
    }
  }
}

/* ───── 都道府県ごとに出力 ───── */
const byPref = new Map();
for (const rec of recById.values()) {
  const key = rec.pref || "不明";
  if (!byPref.has(key)) byPref.set(key, []);
  byPref.get(key).push(rec);
}
for (const [pref, arr] of byPref) {
  arr.sort((a,b) =>
    (a.city||"").localeCompare(b.city||"", "ja") ||
    a.name.localeCompare(b.name, "ja")
  );
  const file = path.join(outDir, `${pref}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
  console.log(`wrote: ${file} (${arr.length} hospitals)`);
}
console.log("done.");