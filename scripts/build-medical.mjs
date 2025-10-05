// scripts/build-medical.mjs
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const ROOT = process.cwd();
const MHLW_DIR = path.join(ROOT, "data", "mhlw");
const OUT = path.join(ROOT, "public", "data", "medical");

const PREFS = ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"];

// ============ util ============

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
    .sort()
    .reverse();
  for (const d of dateDirs) {
    const dir = path.join(MHLW_DIR, d);
    const hit = fs.readdirSync(dir).find(f => f.startsWith(prefix) && f.endsWith(".csv"));
    if (hit) return path.join(dir, hit);
  }
  return null;
};

const toAscii = (s="") =>
  String(s)
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/：/g, ":").replace(/／/g, "/").replace(/　/g, " ");

const toAsciiPhone = (s="") =>
  toAscii(s)
    .replace(/＋/g, "+")
    .replace(/[‐-‒–—―−ー－〜~]/g, "-")
    .replace(/[()\（\）\[\]【】]/g, " ");

const normalize81 = (w="") =>
  w.replace(/^\+81[\s‐-–—－ー-]*/, "0").replace(/^81[\s‐-–—－ー-]*/, "0");

// ★ 電話抽出（route.ts と同等のロジック）
const extractTel = (raw) => {
  let s = toAsciiPhone(String(raw || ""));
  s = normalize81(s);
  const cand = Array.from(s.matchAll(/0\d(?:[\d-]{6,12})\d/g)).map(m => m[0]);
  for (const c of cand) {
    const digits = c.replace(/\D/g, "");
    if (digits.length === 10 || digits.length === 11) {
      return c.replace(/[^0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
    }
  }
  const only = s.replace(/\D/g, "");
  if (only.length === 11) return `${only.slice(0,3)}-${only.slice(3,7)}-${only.slice(7)}`;
  if (only.length === 10) return `${only.slice(0,3)}-${only.slice(3,6)}-${only.slice(6)}`;
  return "";
};

// ★ URL 正規化（route.ts と同等の振る舞い）
const normalizeUrl = (u) => {
  let s = toAscii(String(u || "").trim());
  if (!s) return "";
  if (!/^https?:\/\//i.test(s) && /^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(s)) s = "https://" + s;
  s = s.replace(/[)\]＞＞。、．，）】」』]+$/g, "");
  return s;
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

// ============ 時間ピボット（病院/クリニック/歯科の -2 CSV） ============
const DAY_KEYS = ["月","火","水","木","金","土","日","祝"];
const normDay = (d0="") => {
  const d = String(d0).trim();
  if (DAY_KEYS.includes(d)) return d;
  if (/月/.test(d)) return "月";
  if (/火/.test(d)) return "火";
  if (/水/.test(d)) return "水";
  if (/木/.test(d)) return "木";
  if (/金/.test(d)) return "金";
  if (/土/.test(d)) return "土";
  if (/日/.test(d)) return "日";
  if (/祝/.test(d) || /休日|祭日/.test(d)) return "祝";
  return "";
};
const toHHMM = (v) => {
  const s = toAscii(String(v || "")).replace(/[^\d:]/g, "");
  if (!s) return "";
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h,m] = s.split(":").map(n=>+n);
    if (h<24 && m<60) return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  }
  if (/^\d{3,4}$/.test(s)) {
    const h = +s.slice(0, s.length-2);
    const m = +s.slice(-2);
    if (h<24 && m<60) return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  }
  return "";
};

const buildHoursMap = (rows) => {
  const map = new Map(); // id -> { 月_診療開始時間, ... }
  for (const r of rows) {
    const id = String(firstKey(r, ["医療機関コード","施設ID","機関ID","id","ID"]) || "");
    const d  = normDay(firstKey(r, ["曜日"]));
    const s  = toHHMM(firstKey(r, ["診療開始時間","外来受付開始時間"]));
    const e  = toHHMM(firstKey(r, ["診療終了時間","外来受付終了時間"]));
    if (!id || !d || !s || !e) continue;
    if (!map.has(id)) map.set(id, {});
    const rec = map.get(id);
    // 最速開始・最遅終了を採用
    const ks = `${d}_診療開始時間`;
    const ke = `${d}_診療終了時間`;
    rec[ks] = rec[ks] ? (s < rec[ks] ? s : rec[ks]) : s;
    rec[ke] = rec[ke] ? (e > rec[ke] ? e : rec[ke]) : e;
  }
  return map;
};

// -2 CSV から id -> tel を作る（FAX列は無視し、無ければ全列スキャン）
const buildTelMap = (rows) => {
  const m = new Map();
  for (const r of rows) {
    const id = String(firstKey(r, ["医療機関コード","施設ID","機関ID","id","ID"]) || "");
    if (!id) continue;
    const telRaw = firstKey(r, ["案内用電話番号","連絡先電話番号","電話番号","TEL","Tel","tel"]) || "";
    let tel = extractTel(telRaw);
    if (!tel) {
      for (const [k,v] of Object.entries(r)) {
        if (/fax|ＦＡＸ/i.test(k)) continue;
        tel = extractTel(v);
        if (tel) break;
      }
    }
    if (tel && !m.has(id)) m.set(id, tel);
  }
  return m;
};

// ============ 共通 正規化（★tel/url を強化） ============

const normalizeCommon = (row) => {
  const id = firstKey(row, ["医療機関コード","施設ID","機関ID","id","ID"]) || "";
  const name = firstKey(row, ["医療機関名称","機関名称","名称","name"]);
  const address = firstKey(row, ["所在地","住所","所在地住所","所在地（住所）","address"]);
  const { pref, city } = pickPrefCity(row);

  // ★ 厚労省の医科CSVは「案内用電話番号」名が本命
  const telKeyRaw =
    firstKey(row, ["案内用電話番号","電話番号","電話","TEL","Tel","tel","代表電話","連絡先電話番号"]) || "";
  let tel = extractTel(telKeyRaw);
  if (!tel) {
    // FAX系の列は除外して全列スキャン
    for (const [k, v] of Object.entries(row)) {
      if (/fax|ＦＡＸ/i.test(k)) continue;
      tel = extractTel(v);
      if (tel) break;
    }
  }

  // url：よくあるキー → だめなら簡易スキャン
  // ★ URL も「案内用ホームページアドレス」を優先、薬局CSVは「薬局のホームページアドレス」
  let url = normalizeUrl(firstKey(row, [
    "案内用ホームページアドレス","薬局のホームページアドレス",
    "URL","Url","url","ホームページ","ホームページURL"
  ]));
  
  if (!url) {
    const strs = Object.values(row).filter(x => typeof x === "string");
    for (const s of strs) {
      const m1 = String(s).match(/https?:\/\/[^\s"'<>）)】】、。]+/i);
      if (m1) { url = normalizeUrl(m1[0]); break; }
      const m2 = String(s).match(/\b[\w.-]+\.(?:jp|co\.jp|or\.jp|ne\.jp|go\.jp|ac\.jp|lg\.jp|com|net|org|info|biz|clinic|hospital|pharmacy|co|io)\b/i);
      if (m2) { url = normalizeUrl(m2[0]); break; }
    }
  }

  return {
    id: String(id || name),
    name,
    tel,
    url,
    address,
    pref,
    city
  };
};

// ============ 部門（診療科） ============

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

// ============ 県別出力 ============

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

// ============ builders ============

const buildHospital = () => {
  const fInfo = detectLatest("01-1_hospital_facility_info_");
  if (!fInfo) return console.warn("! hospital facility csv not found");
  const info = readCSV(fInfo);

  const fHours = detectLatest("01-2_hospital_speciality_hours_");
  const hoursRows = fHours ? readCSV(fHours) : [];
  const hoursMap = fHours ? buildHoursMap(hoursRows) : new Map();
  const deptMap  = fHours ? buildDeptMap(hoursRows)  : new Map();
  const telMap   = fHours ? buildTelMap(hoursRows)   : new Map();

  const items = info.map(r => {
    const base = normalizeCommon(r);
    const extra = hoursMap.get(String(base.id)) || {};
    const depts = Array.from(deptMap.get(String(base.id)) || []);
    return { ...base, ...extra, kind:"hospital", departments: depts,
             tel: base.tel || telMap.get(String(base.id)) || "" };
  });
  writeByPref("hospital", items);
};

const buildClinic = () => {
  const fInfo = detectLatest("02-1_clinic_facility_info_");
  if (!fInfo) return console.warn("! clinic facility csv not found");
  const info = readCSV(fInfo);

  const fHours = detectLatest("02-2_clinic_speciality_hours_");
  const hoursRows = fHours ? readCSV(fHours) : [];
  const hoursMap = fHours ? buildHoursMap(hoursRows) : new Map();
  const deptMap  = fHours ? buildDeptMap(hoursRows)  : new Map();
  const telMap   = fHours ? buildTelMap(hoursRows)   : new Map();

  const items = info.map(r => {
    const base = normalizeCommon(r);
    const extra = hoursMap.get(String(base.id)) || {};
    const depts = Array.from(deptMap.get(String(base.id)) || []);
    return { ...base, ...extra, kind:"clinic", departments: depts,
             tel: base.tel || telMap.get(String(base.id)) || "" };
  });
  writeByPref("clinic", items);
};

const buildDental = () => {
  const fInfo = detectLatest("03-1_dental_facility_info_");
  if (!fInfo) return console.warn("! dental facility csv not found");
  const info = readCSV(fInfo);

  // 03-2 が 2025-06-01 に無ければ detectLatest が自動で 2024-12-01 を拾います
  const fHours = detectLatest("03-2_dental_speciality_hours_");
  const hoursRows = fHours ? readCSV(fHours) : [];
  const hoursMap = fHours ? buildHoursMap(hoursRows) : new Map();
  const deptMap  = fHours ? buildDeptMap(hoursRows)  : new Map();
  const telMap   = fHours ? buildTelMap(hoursRows)   : new Map();

  const items = info.map(r => {
    const base = normalizeCommon(r);
    const extra = hoursMap.get(String(base.id)) || {};
    const depts = Array.from(deptMap.get(String(base.id)) || []);
    return { ...base, ...extra, kind:"dental", departments: depts,
             tel: base.tel || telMap.get(String(base.id)) || "" };
  });
  writeByPref("dental", items);
};

const buildPharmacy = () => {
  const f = detectLatest("05_pharmacy_");
  if (!f) return console.warn("! pharmacy csv not found");
  const rows = readCSV(f);

  const items = rows.map(r => {
    const base = normalizeCommon(r);
    // ★ 薬局の曜日×時間帯の列をそのまま持ち越す
    const hourCols = Object.fromEntries(
      Object.entries(r).filter(([k]) =>
        /^(?:月|火|水|木|金|土|日|祝)_開店時間帯\d+_(?:開始|終了)時間$/.test(k)
      )
    );
    return { ...base, ...hourCols, kind:"pharmacy" };
  });
  writeByPref("pharmacy", items);
};

// run
fs.mkdirSync(OUT, { recursive:true });
buildHospital();
buildClinic();
buildDental();
buildPharmacy();
console.log("Done.");