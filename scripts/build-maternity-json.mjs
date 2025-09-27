// scripts/build-maternity-json.mjs
import fs from "node:fs";
import path from "node:path";

// ---------- CSV utils ----------
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

// ---------- 五十音辞書による 県/市 推定（既存の pref JSON を利用） ----------
const PREF_DIR = path.resolve("public/data/pref");
const PREFS = fs.existsSync(PREF_DIR)
  ? fs.readdirSync(PREF_DIR).filter(f => f.endsWith(".json")).map(f => f.replace(/\.json$/,""))
  : [];
const PREF_CITY_MAP = new Map();
for (const pref of PREFS) {
  try {
    const arr = JSON.parse(fs.readFileSync(path.join(PREF_DIR, `${pref}.json`), "utf8"));
    const names = (arr || []).map(ci => typeof ci === "string" ? ci : ci.name);
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

// ---------- hours のヘルパ ----------
function putSlot(obj, dept, kind /* consult|accept */, dayKey, start, end) {
  if (!start || !end) return;
  obj.hours ??= {};
  obj.hours[dept] ??= { consult:{}, accept:{} };
  const bag = obj.hours[dept][kind];
  bag[dayKey] ??= [];
  bag[dayKey].push([start, end]);
}

// ---------- 入出力 ----------
const inCSV = path.resolve(process.argv[2] || "data/mhlw/maternity_latest.csv");
const outDir = path.resolve("public/data/medical/maternity");
fs.mkdirSync(outDir, { recursive: true });

const { header, rows } = readCSV(inCSV);

// 必須カラム
const COL = {
  id:   idx(header, "ID"),
  name: idx(header, "正式名称"),
  kana: idx(header, "正式名称（フリガナ）"),
  addr: idx(header, "所在地"),
  lat:  idx(header, "所在地座標（緯度）"),
  lng:  idx(header, "所在地座標（経度）"),
  url:  header.indexOf("案内用ホームページアドレス"), // 無くてもOK
};

// 日/スロット → ヘッダ名を作る
const DAYS = [
  { k:"mon", j:"月" }, { k:"tue", j:"火" }, { k:"wed", j:"水" }, { k:"thu", j:"木" },
  { k:"fri", j:"金" }, { k:"sat", j:"土" }, { k:"sun", j:"日" }, { k:"hol", j:"祝" },
];
function hWorkStart(jDay, n) { return `${jDay}_就業時間帯${n}_開始時間`; }
function hWorkEnd(jDay, n)   { return `${jDay}_就業時間帯${n}_終了時間`; }
function hAccStart(jDay, n)  { return `${jDay}_外来受付時間帯${n}_開始時間`; }
function hAccEnd(jDay, n)    { return `${jDay}_外来受付時間帯${n}_終了時間`; }

// 1パスで県ごと配列を構築
const byPref = new Map();

for (const r of rows) {
  const id = r[COL.id];
  if (!id) continue;

  const name = r[COL.name] || "";
  const kana = r[COL.kana] || "";
  const address = r[COL.addr] || "";
  // 0 or 空は null に
  const lat = r[COL.lat] ? Number(r[COL.lat]) || null : null;
  const lng = r[COL.lng] ? Number(r[COL.lng]) || null : null;
  const url = (COL.url >= 0 ? (r[COL.url] || "") : "");

  const { pref, city } = inferPrefCity(address);
  const rec = {
    id, name, kana, address, lat, lng, url, pref, city,
    // 助産所は科概念が無いので擬似科で揃える
    hours: undefined
  };

  // 時間帯（就業=consult、外来受付=accept）
  for (const d of DAYS) {
    for (let n = 1; n <= 3; n++) {
      const ws = header.indexOf(hWorkStart(d.j, n));
      const we = header.indexOf(hWorkEnd(d.j, n));
      const as = header.indexOf(hAccStart(d.j, n));
      const ae = header.indexOf(hAccEnd(d.j, n));

      if (ws !== -1 && we !== -1) {
        const s = r[ws], e = r[we];
        if (s && e) putSlot(rec, "助産所", "consult", d.k, s, e);
      }
      if (as !== -1 && ae !== -1) {
        const s = r[as], e = r[ae];
        if (s && e) putSlot(rec, "助産所", "accept", d.k, s, e);
      }
    }
  }

  const key = pref || "不明";
  if (!byPref.has(key)) byPref.set(key, []);
  byPref.get(key).push(rec);
}

// 出力
for (const [pref, arr] of byPref) {
  arr.sort((a,b) =>
    (a.city||"").localeCompare(b.city||"", "ja") ||
    a.name.localeCompare(b.name, "ja")
  );
  const file = path.join(outDir, `${pref}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
  console.log(`wrote: ${file} (${arr.length} maternity homes)`);
}
console.log("done.");