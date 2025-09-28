#!/usr/bin/env node
// scripts/enrich-hospital-json.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { globby } from "globby";
import iconv from "iconv-lite";

if (process.argv.length < 3) {
  console.error("Usage: node scripts/enrich-hospital-json.mjs <public-json> [csv-root]");
  process.exit(1);
}

const jsonPath = path.resolve(process.argv[2]);
const KIND = (() => {
  const m = jsonPath.match(/\/medical\/(hospital|clinic|dental|pharmacy)\//);
  return m ? m[1] : "hospital";
})();
const csvRoot  = path.resolve(process.argv[3] ?? path.join(process.cwd(), "data/mhlw"));

const readJSON = async (p) => JSON.parse(await fs.readFile(p, "utf8"));
const writeJSON = async (p, obj) => fs.writeFile(p, JSON.stringify(obj, null, 2), "utf8");

const toAscii = (s) => (s ?? '').toString().normalize('NFKC').trim();
const digitsOnly = (s) => toAscii(s).replace(/[^\d]/g, '');
function normTel(s="") {
  return toAscii(s).replace(/[‐-‒–—―ー－]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
function looksLikeTel(s="") {
  const t = toAscii(s);
  const d = digitsOnly(t);
  if ((d.length === 10 || d.length === 11) && d.startsWith('0')) return true; // 0始まり10/11桁のみ
  return /0\d{1,4}-\d{2,4}-\d{3,4}/.test(t);
}
function formatJPPhone(raw="") {
  const d = digitsOnly(raw);
  if (!(d.startsWith('0') && (d.length === 10 || d.length === 11))) return '';
  if (d.length === 10 && (d.startsWith('03') || d.startsWith('06'))) return `${d.slice(0,2)}-${d.slice(2,6)}-${d.slice(6)}`;
  if (d.length === 10) return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;
  return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
}
const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

const extractCity = (address="", pref="") => {
  const body = address.replace(pref, "");
  const m = body.match(/([^\d\s\-丁目番地号、。()（）]{1,12}[市区町村郡])/);
  return m ? m[1] : "";
};

const loadCSV = async (file) => {
  const buf = await fs.readFile(file);
  // まずUTF-8で試す → 文字化けの「�」が多い場合はShift_JISとして再読込
  let raw = buf.toString("utf8");
  const bad = (raw.match(/�/g) || []).length;
  if (bad > 5) { // 適当な閾値
    raw = iconv.decode(buf, "Shift_JIS");
  }
  return parse(raw, { skipEmptyLines: true, relaxColumnCount: true });
};

const onlyFiles = async (paths) => {
  const out = [];
  for (const p of paths) {
    try { const st = await fs.stat(p); if (st.isFile()) out.push(p); } catch {}
  }
  return out;
};

const buildMaps = async () => {
  const idCol = 0; // 先頭列がID（厚労省CSV想定）

  // 先に Map を用意（info ループで telMap を使うため）
  const infoMap = new Map(); // id -> {name, address, url}
  const telMap  = new Map(); // id -> tel
  const deptMap = new Map(); // id -> Set<dept>

  // 1) 施設基本情報（名称・住所・URL）
  const infoGlobs = [
    `**/*${KIND}*facility*info*`,
    `**/*_${KIND}_facility_info_*`,
  ];
  const infoFiles = await onlyFiles(await globby(infoGlobs, { cwd: csvRoot, absolute: true }));
  for (const f of infoFiles) {
    const rows = await loadCSV(f);
    for (const r of rows) {
      const id = String((Array.isArray(r) ? r[0] : r.id) ?? "").trim();
      if (!id) continue;
      const name    = String(r[1] ?? r.name ?? r["医療機関名称"] ?? "").trim();
      const address = String(r[3] ?? r.address ?? r["住所"] ?? "").trim();
      const urlCand = [r[6], r.URL, r.url, r["URL"], r["ホームページ"], r["ホームページアドレス"]]
        .map(x => String(x ?? "").trim());
      const url = urlCand.find(u => /^https?:\/\//.test(u)) || "";
      infoMap.set(id, { name, address, url });

      // 施設CSVに電話が入っていればフォールバックで拾う
      const allCells = (Array.isArray(r) ? r : Object.values(r)).map(v => String(v ?? "").trim());
      const telFromInfo = allCells.find(looksLikeTel);
      const formatted = formatJPPhone(telFromInfo || "");
      if (formatted && !telMap.has(id)) telMap.set(id, formatted);
    }
  }

  // 2) 電話（専用CSVがある場合）
  const telGlobs = [
    `**/*_${KIND}_tel_*`,
    `**/*${KIND}*tel*`,
    "**/*tel*",
    "**/*電話*",
  ];
  const telFiles = await onlyFiles(await globby(telGlobs, { cwd: csvRoot, absolute: true }));
  for (const f of telFiles) {
    const rows = await loadCSV(f);
    for (const r of rows) {
      const id = String((Array.isArray(r) ? r[0] : r.id) ?? "").trim();
      if (!id) continue;
      const cand = (Array.isArray(r) ? r : Object.values(r)).map(v => String(v ?? "").trim());
      const formatted = formatJPPhone(cand.find(looksLikeTel) || "");
      if (formatted) telMap.set(id, formatted);
    }
  }

  // 3) 診療科
  const deptGlobs = [
    `**/*_${KIND}_speciality_*`,
    "**/*speciality*hours*",
    "**/*specialty*hours*",
    `**/*_${KIND}_department_*`,
    `**/*${KIND}*department*`,
    "**/*診療科*",
  ];
  const deptFiles = await onlyFiles(await globby(deptGlobs, { cwd: csvRoot, absolute: true }));
  for (const f of deptFiles) {
    const rows = await loadCSV(f);
    for (const r of rows) {
      const idCell = Array.isArray(r) ? r[0] : (r.id ?? r.ID ?? r["医療機関ID"] ?? r["医療機関コード"]);
      const id = String(idCell ?? "").trim();
      if (!id) continue;

      const cols = (Array.isArray(r) ? r : Object.values(r)).map(v => String(v ?? "").trim());
      const deptCells = cols.slice(1).filter(x => /科/.test(x));
      if (!deptCells.length) continue;

      const now = deptMap.get(id) ?? new Set();
      for (const cell of deptCells) {
        cell.split(/[、，,\/・\s]+/).filter(Boolean).forEach(x => now.add(x));
      }
      if (now.size) deptMap.set(id, now);
    }
  }

  const counts = { info: infoFiles.length, tel: telFiles.length, dept: deptFiles.length };
  console.log(`[mhlw] info:${counts.info} tel:${counts.tel} dept:${counts.dept}`);
  return { infoMap, telMap, deptMap, counts };
};

const main = async () => {
  const list = await readJSON(jsonPath); // public 側 JSON
  const { infoMap, telMap, deptMap, counts } = await buildMaps();

  console.log(`[mhlw/main] info:${counts.info} tel:${counts.tel} dept:${counts.dept}`);

  let patchedName = 0, patchedTel = 0, patchedDept = 0, patchedUrl = 0, patchedCity = 0;

  for (const item of list) {
    const id = String(item.id);
    const info = infoMap.get(id);

    if (info) {
      if (!item.name && info.name) { item.name = info.name; patchedName++; }
      if (!item.address && info.address) { item.address = info.address; }
      if (!item.url && info.url) { item.url = info.url; patchedUrl++; }
      if (!item.city && (item.address || info.address)) {
        const city = extractCity(item.address || info.address || "", item.pref || "");
        if (city) { item.city = city; patchedCity++; }
      }
    }

    if (!item.city && item.address) {
      const c = extractCity(item.address, item.pref || "");
      if (c) { item.city = c; patchedCity++; }
    }

    {
      const cur = String(item.tel ?? "");
      const fmt = formatJPPhone(cur);      // 03/06は2-4-4、それ以外は3-3-4等に整形。10/11桁以外は空

      if (cur && !fmt) {
        // 既存値が「1311132…」のような誤値（ID混入など）のケースは捨てる
        item.tel = "";
      } else if (fmt) {
        // 正常なら整形済みで上書き
        item.tel = fmt;
      }

      // まだ空ならCSV由来のtelMapで補完
      const fromMap = telMap.get(id);
      if (!item.tel && fromMap) {
        item.tel = fromMap;
        patchedTel++;
      }
    }

    const depts = deptMap.get(id);
    if (depts && depts.size) {
      const cur = Array.isArray(item.departments) ? item.departments : [];
      const merged = uniq([...cur, ...depts]);
      if (merged.length !== cur.length) { item.departments = merged; patchedDept++; }
    }
  }

  // バックアップ（初回のみ）
  const bak = `${jsonPath}.bak`;
  try { await fs.access(bak); } catch { await fs.copyFile(jsonPath, bak); }

  await writeJSON(jsonPath, list);

  console.log(`✓ Updated: ${path.relative(process.cwd(), jsonPath)}`);
  console.log(`  name: ${patchedName}, tel: ${patchedTel}, dept: ${patchedDept}, url: ${patchedUrl}, city: ${patchedCity}`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});