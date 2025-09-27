import fs from "node:fs";
import path from "node:path";

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

const inPath = path.resolve(process.argv[2] || "data/jis-munis.csv");
const outDir = path.resolve(process.argv[3] || "public/data/pref");
fs.mkdirSync(outDir, { recursive: true });

const lines  = fs.readFileSync(inPath, "utf8").split(/\r?\n/).filter(Boolean);
const header = parseCSVLine(lines[0]);

const prefKeys = ["都道府県名","都道府県","pref","pref_name"];
const cityKeys = ["市区町村名","市区町村","city","city_name","Municipality"];
const yomiKeys = ["市区町村名カナ","市区町村名かな","市区町村名よみ","市区町村名（カナ）","市区町村名ｶﾅ","city_kana","city_yomi"];

const prefIdx = header.findIndex(h => prefKeys.includes(h));
const cityIdx = header.findIndex(h => cityKeys.includes(h));
let yomiIdx = header.findIndex(h => yomiKeys.includes(h)); // 無ければ -1
// ヘッダーが2列しかないのに実データが3列以上ある場合、3列目を読みとみとして推測
const useThirdColAsYomi = (yomiIdx === -1 && header.length < 3);

if (prefIdx === -1 || cityIdx === -1) {
  console.error("CSVヘッダーに『都道府県名』『市区町村名』が必要です。");
  process.exit(1);
}

const map = new Map(); // pref -> Set or Array
for (let i = 1; i < lines.length; i++) {
  const row  = parseCSVLine(lines[i]);
  const pref = row[prefIdx];
  const name = row[cityIdx];
  if (!pref || !name) continue;
  const yomi = useThirdColAsYomi
    ? (row[2] || "")                // 3列目をカナとして採用
    : (yomiIdx !== -1 ? (row[yomiIdx] || "") : "");

  if (!map.has(pref)) map.set(pref, new Map()); // name -> yomi（重複防止）
  if (!map.get(pref).has(name)) map.get(pref).set(name, yomi);
}

// 出力：yomiが1つでも存在する県は {name,yomi} の配列、無ければ name の配列
for (const [pref, inner] of map.entries()) {
  const entries = Array.from(inner.entries()).sort((a, b) => a[0].localeCompare(b[0], "ja"));
  const hasYomi = entries.some(([, y]) => y && y.length > 0);

  const out = hasYomi
    ? entries.map(([name, yomi]) => ({ name, yomi }))
    : entries.map(([name]) => name);

  const file = path.join(outDir, `${pref}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`wrote: ${file} (${entries.length} items, yomi: ${hasYomi ? "yes" : "no"})`);
}

console.log("done.");