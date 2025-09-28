'use client';
import React, { useMemo, useState, useEffect } from "react";

/** ─────────────────────────────────────────
 * モバイル：アコーディオン開閉
 * デスクトップ：常時展開（lg以上）
 * 丸いピルボタン＆影でスクショ風
 * ───────────────────────────────────────── */

const REGION_PREFS: Record<string, { label: string; prefs: string[] }> = {
  hokkaido: { label: "北海道", prefs: ["北海道"] },
  tohoku: { label: "東北", prefs: ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"] },
  kitakanto: { label: "北関東", prefs: ["茨城県", "栃木県", "群馬県"] },
  kanto: { label: "関東", prefs: ["東京都", "神奈川県", "埼玉県", "千葉県"] },
  hokushinetsu: { label: "北陸・甲信越", prefs: ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県"] },
  tokai: { label: "東海", prefs: ["岐阜県", "静岡県", "愛知県", "三重県"] },
  kansai: { label: "関西", prefs: ["大阪府", "兵庫県", "京都府", "奈良県", "滋賀県", "和歌山県"] },
  chugoku: { label: "中国", prefs: ["鳥取県", "島根県", "岡山県", "広島県", "山口県"] },
  shikoku: { label: "四国", prefs: ["徳島県", "香川県", "愛媛県", "高知県"] },
  kyushu: { label: "九州・沖縄", prefs: ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"] },
};

// デモ：大阪のみ市区を仮置き
const OSAKA_CITIES = [
  "大阪市", "堺市", "吹田市", "豊中市", "東大阪市", "枚方市", "高槻市", "八尾市", "茨木市",
  "寝屋川市", "箕面市", "守口市", "門真市", "岸和田市", "泉大津市", "泉佐野市", "和泉市",
  "柏原市", "大東市", "四條畷市", "藤井寺市", "松原市", "羽曳野市", "富田林市", "大阪狭山市",
];

const GYO_GROUPS = [
  { key: "あ行", chars: ["あ", "い", "う", "え", "お"] },
  { key: "か行", chars: ["か", "き", "く", "け", "こ"] },
  { key: "さ行", chars: ["さ", "し", "す", "せ", "そ"] },
  { key: "た行", chars: ["た", "ち", "つ", "て", "と"] },
  { key: "な行", chars: ["な", "に", "ぬ", "ね", "の"] },
  { key: "は行", chars: ["は", "ひ", "ふ", "へ", "ほ"] },
  { key: "ま行", chars: ["ま", "み", "む", "め", "も"] },
  { key: "や行", chars: ["や", "ゆ", "よ"] },
  { key: "ら行", chars: ["ら", "り", "る", "れ", "ろ"] },
  { key: "わ行", chars: ["わ", "を", "ん"] },
];

type CityItem = string | { name: string; yomi?: string };

// 介護データの表示用アイテム
type CareItem = {
  id: string;
  name: string;
  kana?: string;
  service?: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  tel?: string;
  url?: string;
  pref?: string;
  city?: string;
};

const getName = (ci: CityItem) => (typeof ci === "string" ? ci : ci.name);
const getYomi = (ci: CityItem) => (typeof ci === "string" ? "" : (ci.yomi || ""));

const toHiraganaInitial = (text?: string) => {
  const c = (text || "").trim().charAt(0) || "";
  if (!c) return "";
  const code = c.charCodeAt(0);
  // カタカナ→ひらがな（先頭1文字）
  if (code >= 0x30a1 && code <= 0x30f6) return String.fromCharCode(code - 0x60);
  return c.toLowerCase();
};

// === 市区名ゆるめ一致 ===
const normalizeCity = (s?: string) =>
  (s || "")
    .replace(/[ \u3000]/g, "")
    .replace(/(都|道|府|県)/g, "")
    .replace(/(市|区|町|村|郡)$/, "");

// 値を先勝ちで拾う
const pick = (...vals: any[]) => vals.find(v => v !== undefined && v !== null && String(v).trim() !== "");

// 電話正規化（全角ダッシュ等）
const normalizeTel = (s?: string) =>
  (s || "")
    // 全角数字 → 半角
    .replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFF10 + 0x30))
    // 全角/長音などのダッシュ類 → 半角ハイフン
    .replace(/[‐-‒–—―ー－]/g, "-")
    // 余計な文字を除去（表示用はハイフンと+は残す）
    .replace(/[^\d\-+]/g, "")
    // ハイフン連続 → 単一
    .replace(/-+/g, "-")
    // 先頭末尾のハイフン除去
    .replace(/^-|-$/g, "");

// 電話正規化（全角ダッシュ等）の直後に追記
const digitsOnly = (s: string = "") =>
  s.replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0)-0xFF10+0x30))
   .replace(/\D/g, "");

const formatJPPhone = (raw: string = "") => {
  const d = digitsOnly(raw);
  if (!/^0\d{9,10}$/.test(d)) return ""; // 0始まり10/11桁のみ有効
  if (d.length === 10 && (d.startsWith("03") || d.startsWith("06")))
    return `${d.slice(0,2)}-${d.slice(2,6)}-${d.slice(6)}`;
  if (d.length === 10)
    return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;
  return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
};

// 診療科 → 配列
const toDeptArray = (v: any): string[] => {
  if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);
  const s = String(v || "");
  if (!s) return [];
  return s.split(/[、，,\/・\s]+/).map(t => t.trim()).filter(Boolean);
};

// ★ 施設名セル（URLがあればリンク、なければテキスト）
function NameCell({ name, url }: { name?: string; url?: string }) {
  const nameText = (name ?? "").toString().trim() || "（名称不明）";
  return url
    ? <a href={url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{nameText}</a>
    : <span>{nameText}</span>;
}

// === 医療（病院/クリニック/歯科/薬局）: フィールド名のゆらぎ吸収 ===
function coerceHealth(raw: any, kind: HealthItem["kind"]): HealthItem {
  const name = pick(
    raw.name, raw.facility_name, raw.hospital_name, raw.clinic_name, raw.dental_name,
    raw["医療機関名称"], raw["医療機関名"], raw["病院名"], raw["名称"], raw["施設名"]
  ) || "";

  const tel = normalizeTel(pick(
    raw.tel, raw.phone, raw.tel_no, raw["電話"], raw["TEL"],
    raw["電話番号"], raw["外来受付電話番号"], raw["代表電話番号"], raw["連絡先電話番号"]
  ));

  const url = pick(
    raw.url, raw.website, raw.homepage, raw["URL"], raw["HP"], raw["ホームページ"], raw["ホームページアドレス"]
  ) || "";

  const address = pick(raw.address, raw.addr, raw["住所"]) || "";
  const pref    = pick(raw.pref, raw.prefecture, raw["都道府県"]) || "";
  const city    = pick(raw.city, raw.municipality, raw["市区町村"], raw["市町村名"]) || "";

  let departments = toDeptArray(pick(
    raw.departments, raw.deps, raw.department,
    raw["診療科"], raw["診療科目"], raw["標榜科"], raw["標榜診療科"], raw["診療領域"]
  ));
  departments = Array.from(new Set(departments)); // 重複除去

  const idBase = String(pick(raw.id, raw.ID, `${pref}-${city}-${name}-${address}`)).replace(/\s+/g, "");
  const id = `med:${kind}:${idBase}`;

  return { id, name, tel, url, address, pref, city, kind, departments };
}

// === 介護（特養/老健/デイ/訪問…）: フィールド名のゆらぎ吸収 ===
type CareItemCoerced = CareItem & { kindLabel?: string };

function coerceCare(raw: any, fallbackLabel?: string): CareItem & { kindLabel?: string } {
  const name =
    raw.name ?? raw.facility_name ?? raw.office_name ??
    raw["施設名"] ?? raw["事業所名"] ?? "";

  // ★ 日本語の「サービスの種類」を最優先
  const serviceJP =
    raw.serviceType ?? raw["サービスの種類"] ?? raw["サービス種別"] ?? raw["種別"];

  // 英語スラッグを日本語に変換（無ければそのまま）
  const fromSlug = KIND_LABELS[raw.category as string];

  const service =
    serviceJP || fromSlug ||
    raw.service || raw.service_type || raw.category ||
    fallbackLabel || "";

  const tel = normalizeTel(
    raw.tel ?? raw.phone ?? raw.tel_no ?? raw["電話"] ?? raw["TEL"] ?? ""
  );

  const url =
    raw.url ?? raw.website ?? raw.homepage ?? raw["URL"] ?? raw["HP"] ?? "";

  const address =
    raw.address ?? raw.addr ?? raw["住所"] ?? "";

  const pref =
    raw.pref ?? raw.prefecture ?? raw["都道府県"] ?? "";

  const city =
    raw.city ?? raw.municipality ?? raw["市区町村"] ?? raw["市区町村名"] ?? "";

  const idBase = String(
    raw.id ?? raw.ID ?? `${pref}-${city}-${name}-${address}`.replace(/\s+/g, "")
  );
  const svc = (raw.category as string) || "care";
  const id = `care:${svc}:${idBase}`;

  return { id, name, service, tel, url, address, pref, city, kindLabel: service };
}

// 医療の種類→日本語ラベル
const HEALTH_KIND_LABEL: Record<HealthItem["kind"], string> = {
  hospital: "病院",
  clinic: "クリニック",
  dental: "歯科",
  pharmacy: "調剤薬局",
};

// 「全て」用の統合行（表示テーブルで使う）
type CombinedItem = {
  id: string;
  name: string;
  kindLabel: string; // 例: 病院 / クリニック / 歯科 / 調剤薬局 / 特養 / デイサービス 等
  tel?: string;
  address?: string;
  url?: string;
};

const DEMO_ROWS = [
  { region: "関西", pref: "大阪府", city: "大阪市",   name: "渋谷（デモ）整骨院 梅田院", category: "整骨院",    phone: "06-1234-5678", hours: "10:00-20:00", station: "梅田（徒歩5分）", website: "https://example.com", listing: "free" },
  { region: "関西", pref: "大阪府", city: "吹田市",   name: "すいだ動物病院",             category: "動物病院",  phone: "06-2222-0000", hours: "09:00-18:30", station: "JR吹田（徒歩7分）", website: "https://example.com", listing: "sponsored" },
  { region: "関西", pref: "大阪府", city: "豊中市",   name: "豊中市民病院",               category: "病院（総合）", phone: "06-3333-9999", hours: "24H（科により異なる）", station: "少路（徒歩10分）", website: "https://example.com", listing: "free" },
  { region: "関西", pref: "大阪府", city: "東大阪市", name: "東大阪 接骨院 本院",         category: "接骨院",    phone: "06-4444-5678", hours: "10:00-22:00", station: "布施（徒歩4分）", website: "https://example.com", listing: "sponsored" },
  { region: "関西", pref: "大阪府", city: "大阪市",   name: "おおさか中央薬局",           category: "調剤薬局",  phone: "06-5555-1111", hours: "08:30-21:00", station: "谷町四丁目（徒歩2分）", website: "https://example.com", listing: "free" },
  { region: "関西", pref: "大阪府", city: "堺市",     name: "堺郵便局",                   category: "郵便局",    phone: "0570-000-000", hours: "09:00-17:00", station: "堺東（徒歩8分）", website: "https://example.com", listing: "free" },
];

const CATEGORIES = [
  "全て",
  "病院",         // ← hospital
  "クリニック",   // ← clinic（診療所）
  "歯科",         // ← dental（歯科医院）
  "薬局",         // ← pharmacy（調剤薬局）
  // 介護はそのまま
  "特養","老健","介護医療院",
  "デイサービス","地域密着型通所介護",
  "訪問介護","夜間対応型訪問介護","定期巡回・随時対応",
];

// 介護カテゴリ → ディレクトリ名の対応
const CARE_CATEGORY_MAP: Record<string, string> = {
  "特養": "tokuyou",
  "老健": "rouken",
  "介護医療院": "care_medical_institute",
  "デイサービス": "day_service",
  "地域密着型通所介護": "community_day_service",
  "訪問介護": "home_help",
  "夜間対応型訪問介護": "night_home_help",
  "定期巡回・随時対応": "regular_patrol_nursing",
};

// 医療カテゴリ → ディレクトリ名 & 診療科フィルタ
type HealthItem = {
  id: string; name: string;
  tel?: string; url?: string; address?: string;
  pref?: string; city?: string;
  kind: "hospital" | "clinic" | "dental" | "pharmacy";
  departments?: string[];
};

// これで固定。診療科はここでは持たない
const HEALTH_CATEGORY_MAP: Record<string, { dir: "hospital"|"clinic"|"dental"|"pharmacy" }> = {
  "病院":      { dir: "hospital" },
  "クリニック":{ dir: "clinic" },
  "歯科":      { dir: "dental" },
  "薬局":      { dir: "pharmacy" },
};

// 診療科のドロップダウン候補
const DEPT_OPTIONS: Record<"hospital"|"clinic"|"dental", string[]> = {
  hospital: ["内科","小児科","外科","整形外科","皮膚科","耳鼻咽喉科","眼科","産婦人科","精神科","リハビリテーション科","口腔外科"],
  clinic:   ["内科","小児科","皮膚科","耳鼻咽喉科","眼科","整形外科","婦人科","心療内科","在宅医療","リハビリテーション科"],
  dental:   ["一般歯科","小児歯科","矯正歯科","口腔外科"],
};

// 丸ボタンのクラス（スクショ風）
const pill =
  "rounded-full px-6 py-4 text-lg font-bold bg-white shadow-[0_10px_24px_rgba(0,0,0,0.15)] border border-black/5 active:scale-[0.98] transition";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}


// モバイル専用アコーディオン（lg以上は常に展開）
function AccordionMobile({
  id, openId, setOpenId, title, children
}: { id: string; openId: string; setOpenId: (s: string)=>void; title: string; children: React.ReactNode }) {
  const isOpen = openId === id;
  return (
    <section className="rounded-2xl border border-black/10 bg-white">
      {/* ヘッダー（モバイル表示） */}
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setOpenId(isOpen ? "" : id)}
        className="w-full flex items-center justify-between px-4 py-3 lg:hidden"
      >
        <span className="text-base font-bold">{title}</span>
        {/* ＋ボタン（開くと×に） */}
        <span className={`inline-block h-6 w-6 rounded-full border border-black/20 relative transition`}>
          <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[2px] w-3.5 bg-black/70`}/>
          <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-[2px] bg-black/70 transition ${isOpen ? "scale-y-0" : "scale-y-100"}`}/>
        </span>
      </button>
      {/* 内容：モバイルは開閉 / PCは常時表示 */}
      <div className={`${isOpen ? "block" : "hidden"} lg:block border-t border-black/5`}>
        <div className="p-4">{children}</div>
      </div>
    </section>
  );
}

function RegionGrid({ onPick }: { onPick: (k: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Object.entries(REGION_PREFS).map(([key, val]) => (
        <button key={key} onClick={() => onPick(key)} className={pill}>
          {val.label}
        </button>
      ))}
    </div>
  );
}

function PrefPicker({ regionKey, pref, onPick }: { regionKey: string; pref?: string; onPick: (p: string) => void }) {
  const list = REGION_PREFS[regionKey]?.prefs ?? [];
  if (!regionKey) return null;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      {list.map((p) => (
        <button
          key={p}
          onClick={() => onPick(p)}
          className={`${pill} ${p === pref ? "!bg-black !text-white shadow-[0_10px_24px_rgba(0,0,0,0.25)]" : "text-gray-900"}`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

function CityIndex({
  pref, cities, current, onPick
}: { pref?: string; cities: CityItem[]; current?: string; onPick: (c: string) => void }) {

  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // モバイル：開いている五十音（1つだけ開く）
  const [openGyo, setOpenGyo] = useState<string>("");

  // A) その場フィルタ（漢字・カナ）
  const [cityQuery, setCityQuery] = useState("");

  // 五十音ごとにグルーピング（yomi優先）＋フィルタ対応
  const grouped = useMemo(() => {
    const map: Record<string, string[]> = {};
    GYO_GROUPS.forEach((g) => (map[g.key] = []));

    const q = cityQuery.trim();
    const list = q
      ? cities.filter((it) => {
          const kanji = getName(it);
          const kana  = (getYomi(it) || "").toUpperCase();
          const qq    = q.toUpperCase();
          return kanji.includes(q) || kana.includes(qq);
        })
      : cities;

    list.forEach((item) => {
      const label = getName(item);              // 表示名（漢字）
      const yomi  = getYomi(item) || label;     // 索引用（カナがあれば優先）
      const initial = toHiraganaInitial(yomi);  // 先頭1文字→ひらがな
      const gyo = GYO_GROUPS.find((g) => g.chars.some((ch) => initial.startsWith(ch)));
      (map[gyo ? gyo.key : "わ行"] as string[]).push(label);
    });

    Object.keys(map).forEach((k) => map[k].sort((a, b) => a.localeCompare(b, "ja")));
    return map;
  }, [cities, cityQuery]);

  // 県や検索語が変わったら、最初に要素がある行を自動で開く
  useEffect(() => {
    if (isDesktop) {
      const first = GYO_GROUPS.find((g) => (grouped[g.key] ?? []).length > 0)?.key || "";
      setOpenGyo(first);
    } else {
      setOpenGyo("");
    }
  }, [pref, cities, cityQuery, isDesktop]);

  if (!pref) return null;

  return (
    <div className="space-y-4">
      {/* A) 検索ボックス（漢字・カナどちらでもOK） */}
      <div className="mb-3">
        <input
          value={cityQuery}
          onChange={(e) => setCityQuery(e.target.value)}
          placeholder="市区町村名で検索（漢字・カナ）"
          className="w-full max-w-md border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {GYO_GROUPS.map((g) => {
        const items = grouped[g.key] || [];
        if (items.length === 0) return null;      // 空の行は非表示でスリムに
        const isOpen = openGyo === g.key;

        return (
          <div key={g.key}>
            {/* 見出し：モバイルはトグル、PCは常時展開 */}
            <button
              type="button"
              aria-expanded={isOpen}
              className={`w-full flex items-center justify-between text-sm font-semibold mb-2 lg:cursor-default
                ${isOpen ? "text-blue-700" : "text-gray-600"}`}
              onClick={() => setOpenGyo((prev) => (prev === g.key ? "" : g.key))}
            >
              <span>《 {g.key} 》</span>
              <span className="lg:hidden text-xs">{isOpen ? "－" : "＋"}</span>
            </button>

            {/* B) 中身：モバイルは isOpen の時だけ表示、PCは常時表示／グリッド化 */}
            <div className={`${isOpen ? "block" : "hidden"} lg:block`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {items.map((label) => (
                  <button
                    key={label}
                    onClick={() => onPick(label)}
                    aria-pressed={current === label}
                    className={`px-4 py-2 rounded-full border text-sm transition
                      ${current === label
                        ? "bg-blue-600 text-white border-blue-600"             // 選択：強い配色
                        : "bg-white text-gray-900 hover:bg-gray-50 border-gray-300"}` // 非選択
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CategoryPicker({
  category, setCategory
}: { category: string; setCategory: (c: string)=>void }) {
  return (
    <>
      {/* モバイル：丸ボタン縦並び */}
      <div className="flex flex-col gap-3 sm:hidden">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`${pill} text-base ${category === c ? "bg-black text-white" : ""}`}
          >
            {c}
          </button>
        ))}
      </div>
      {/* タブレット以上：ドロップダウン */}
      <div className="hidden sm:flex items-center gap-2">
        <label className="text-sm text-gray-600">業種で絞り込む</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="border rounded px-2 py-1">
          {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
        </select>
      </div>
    </>
  );
}

// 診療科セレクタ（医療カテゴリのときだけ使う）
function DeptPicker({
  dir, value, onChange
}:{ dir: "hospital"|"clinic"|"dental"; value: string; onChange:(v:string)=>void }) {
  const opts = DEPT_OPTIONS[dir] || [];
  return (
    <div className="hidden sm:flex items-center gap-2">
      <label className="text-sm text-gray-600">診療科で絞り込む</label>
      <select value={value} onChange={(e)=>onChange(e.target.value)} className="border rounded px-2 py-1">
        <option value="">指定なし</option>
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function BannerSlot({
  slot, pref, city, href = "/ads"
}: { slot: "top" | "pref" | "listTop"; pref?: string; city?: string; href?: string }) {
  return (
    <a href={href} className="block">
      {/* PC：115x140 の縦長例 */}
      <div className="hidden sm:flex items-center justify-center w-[115px] h-[140px] rounded-2xl border border-black/10 shadow bg-white text-xs text-gray-600">
        広告掲載はこちら<br/>({slot}){pref ? ` / ${pref}` : ""}{city ? ` / ${city}` : ""}
      </div>
      {/* スマホ：横長例（~320x100の雰囲気） */}
      <div className="sm:hidden h-[100px] w-full rounded-2xl border border-black/10 shadow bg-white flex items-center justify-center text-sm text-gray-700">
        広告掲載はこちら（{slot}）
      </div>
    </a>
  );
}

function ResultTable({ rows }: { rows: typeof DEMO_ROWS }) {
  return (
    <div className="overflow-auto rounded-xl border border-gray-200">
      <table className="table-auto w-full text-sm">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left">施設名</th>
            <th className="px-3 py-2 text-left">種別</th>
            <th className="px-3 py-2 text-left">電話</th>
            <th className="px-3 py-2 text-left">住所</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="px-3 py-2 align-top">{r.name}</td>
              <td className="px-3 py-2 align-top">{r.category}</td>
              <td className="px-3 py-2 align-top whitespace-nowrap">
                {r.phone ? <a href={`tel:${r.phone.replace(/[^\d+]/g,"")}`} className="underline-offset-2 hover:underline">{normalizeTel(r.phone)}</a> : "-"}
              </td>
              <td className="px-3 py-2 align-top whitespace-normal break-words min-w-[32%]">
                {(r.pref || "") + (r.city ? r.city : "")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CareTable({ items }: { items: CareItem[] }) {
  const telClean = (s?: string) => (s || "").replace(/[^\d+]/g, "");
  return (
    <div className="overflow-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="text-left p-3">施設名</th>
            <th className="text-left p-3">種別</th>
            <th className="text-left p-3">電話</th>
            <th className="text-left p-3">住所</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r, i) => (
            <tr key={`${r.id}-${i}`} className="odd:bg-white even:bg-gray-50">
              {/* 施設名 */}
              <td className="p-3"><NameCell name={r.name} url={r.url} /></td>
              {/* 種別 */}
              <td className="p-3">{r.service || "-"}</td>
              {/* 電話 */}
              <td className="p-3 whitespace-nowrap">
                {r.tel
                  ? <a href={`tel:${telClean(r.tel)}`} className="underline-offset-2 hover:underline">
                      {normalizeTel(r.tel)}
                    </a>
                  : "-"}
              </td>
              {/* 住所 */}
              <td className="p-3 whitespace-normal break-words min-w-[32%]">{r.address || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HealthTable({ items }: { items: HealthItem[] }) {
  return (
    <div className="overflow-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-sm table-fixed">
        {/* 列幅のバランスを固定 */}
        <colgroup><col className="w-[26%]"/><col className="w-[8%]"/><col className="w-[34%]"/><col className="w-[12%]"/><col className="w-[20%]"/></colgroup>

        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="text-left p-3">施設名</th>
            <th className="text-left p-3">種別</th>
            <th className="text-left p-3">診療科</th>
            <th className="text-left p-3">電話</th>
            <th className="text-left p-3">住所</th>
          </tr>
        </thead>

        <tbody>
          {items.map((r, i) => {
            const disp = formatJPPhone(r.tel || "");     // 不正値は空に
            const telHref = disp ? digitsOnly(disp) : ""; // tel:は数字のみ
            return (
              <tr key={`${r.id}-${i}`} className="odd:bg-white even:bg-gray-50">
                <td className="p-3"><NameCell name={r.name} url={r.url} /></td>
                <td className="p-3">{HEALTH_KIND_LABEL[r.kind]}</td>

                {/* 2行クランプ（Tailwindプラグイン不要の任意プロパティ） */}
                <td className="p-3 leading-relaxed overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
                  {(r.departments || []).join("、") || (r.kind === "pharmacy" ? "薬局" : "-")}
                </td>

                <td className="p-3 whitespace-nowrap">
                  {disp
                    ? <a href={`tel:${telHref}`} className="underline-offset-2 hover:underline">{disp}</a>
                    : "-"}
                </td>

                <td className="p-3 break-words">{r.address || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CombinedTable({ items }: { items: CombinedItem[] }) {
  return (
    <div className="overflow-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="text-left p-3">名称</th>
            <th className="text-left p-3">種別</th>
            <th className="text-left p-3">電話</th>
            <th className="text-left p-3">住所</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => {
            const disp = formatJPPhone(r.tel || "");
            const href = disp ? digitsOnly(disp) : "";
            return (
              <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                <td className="p-3"><NameCell name={r.name} url={r.url} /></td>
                <td className="p-3">{r.kindLabel}</td>
                <td className="p-3 whitespace-nowrap">
                  {disp ? <a href={`tel:${href}`} className="underline-offset-2 hover:underline">{disp}</a> : "-"}
                </td>
                <td className="p-3 whitespace-normal break-words min-w-[32%]">{r.address || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// 表示用（英語→日本語）
const KIND_LABELS: Record<string, string> = {
  // 医療
  hospital: "病院",
  clinic: "診療所",
  dental: "歯科",
  pharmacy: "調剤薬局",
  // 介護
  tokuyou: "特別養護老人ホーム",
  rouken: "介護老人保健施設",
  care_medical_institute: "介護医療院",
  day_service: "通所介護",
  community_day_service: "地域密着型通所介護",
  home_help: "訪問介護",
  night_home_help: "夜間対応型訪問介護",
  regular_patrol_nursing: "定期巡回・随時対応型訪問介護看護",
};

const showKind = (item: any) =>
  item.kindLabel ?? KIND_LABELS[item.category] ?? item.kind ?? "-";

const showTel = (t?: string) => (t && t.trim() ? t : "-");

export default function DirectoryPrototype() {
  const [regionKey, setRegionKey] = useState<string>("");
  const [pref, setPref]         = useState<string>("");
  const [city, setCity]         = useState<string>("");
  const [category, setCategory] = useState<string>("全て");
  const [careItems, setCareItems] = useState<CareItem[] | null>(null);
  const [healthItems, setHealthItems] = useState<HealthItem[] | null>(null);

  const [allItems, setAllItems] = useState<CombinedItem[] | null>(null);
  // 2) 置き換え：cities の型をユニオン型に
  const [cities, setCities] = useState<CityItem[]>([]);

  const [openId, setOpenId]     = useState<string>("area");

  const cityList: CityItem[] = cities.length
    ? cities
    : (pref === "大阪府" ? OSAKA_CITIES : []) as CityItem[];

  const filteredRows = useMemo(() => {
    return DEMO_ROWS.filter((r) => {
      if (regionKey && REGION_PREFS[regionKey] && !REGION_PREFS[regionKey].prefs.includes(r.pref)) return false;
      if (pref && r.pref !== pref) return false;
      if (city && r.city !== city) return false;
      if (category !== "全て" && r.category !== category) return false;
      return true;
    }).sort((a, b) => (a.listing === "sponsored" ? -1 : 0) - (b.listing === "sponsored" ? -1 : 0));
  }, [regionKey, pref, city, category]);

  const [dept, setDept] = useState<string>("");
  useEffect(() => { setDept(""); }, [category, pref, city]);

  useEffect(() => {
    setCity("");
    setCareItems(null);
    setHealthItems(null);
    setAllItems(null);
    if (!pref) { setCities([]); return; }
    fetch(`/data/pref/${encodeURIComponent(pref)}.json`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : []))
      .then(arr => setCities(Array.isArray(arr) ? (arr as CityItem[]) : []))
      .catch(() => setCities([]));
  }, [pref]);

  // 介護カテゴリを選んだら /public/data/care/<key>/<pref>.json を取得
  useEffect(() => {
    const key = CARE_CATEGORY_MAP[category];
    if (!pref || !key) { setCareItems(null); return; }

    const url = `/data/care/${key}/${encodeURIComponent(pref)}.json`;
    fetch(url, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then((arr: any[]) => {
        // ★ 取得データを正規化。カテゴリ名をフォールバックとして渡す
        const list = arr.map(row => coerceCare(row, category));
        const filtered = city
          ? list.filter(a => {
              const want = normalizeCity(city);
              const inCity = normalizeCity(a.city) ? normalizeCity(a.city) === want : false;
              const inAddr = (a.address || "").includes(city);
              return inCity || inAddr;
            })
          : list;
        setCareItems(filtered);
      })
      .catch(() => setCareItems([]));
  }, [pref, city, category]);

  // 医療カテゴリを選んだら /public/data/medical/<dir>/<pref>.json を取得
  useEffect(() => {
    const m = HEALTH_CATEGORY_MAP[category];
    if (!pref || !m) { setHealthItems(null); return; }

    const url = `/data/medical/${m.dir}/${encodeURIComponent(pref)}.json`;
    fetch(url, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then((arr: any[]) => {
        // 正規化
        let list: HealthItem[] = arr.map(row => coerceHealth(row, m.dir));

        // 市区町村で絞り込み
        if (city) {
          const want = normalizeCity(city);
          list = list.filter(a =>
            (normalizeCity(a.city) ? normalizeCity(a.city) === want : false) ||
            (a.address || "").includes(city)
          );
        }

        // ★診療科で絞り込み（選択されているときだけ）
        if (dept) {
          list = list.filter(a => (a.departments || []).some(d => d.includes(dept)));
        }

        setHealthItems(list);
      })
      .catch(() => setHealthItems([]));
  }, [pref, city, category, dept]); // ← dept を追加

  // 「全て」= 医療(4種) + 介護(全種) を合体表示
  useEffect(() => {
    if (!pref || category !== "全て") { setAllItems(null); return; }

    const encPref = encodeURIComponent(pref);

    // 医療 4種
    const medKinds: HealthItem["kind"][] = ["hospital", "clinic", "dental", "pharmacy"];
    const medUrls = medKinds.map(k => `/data/medical/${k}/${encPref}.json`);

    // 介護 全ディレクトリ
    const careDirs = Object.values(CARE_CATEGORY_MAP);
    const careUrls = careDirs.map(d => `/data/care/${d}/${encPref}.json`);

    // フェッチ（医療）
    const medPromises = medUrls.map((u, i) =>
      fetch(u, { cache: "no-store" })
        .then(r => r.ok ? r.json() : [])
        .then((arr: any[]) => arr.map(row => coerceHealth(row, medKinds[i])))
        .catch(() => [] as HealthItem[])
    );

    // フェッチ（介護）
    const carePromises = careUrls.map((u, i) =>
      fetch(u, { cache: "no-store" })
        .then(r => r.ok ? r.json() : [])
        .then((arr: any[]) => {
          const labelByDir: Record<string, string> = {
            tokuyou: "特養",
            rouken: "老健",
            care_medical_institute: "介護医療院",
            day_service: "デイサービス",
            community_day_service: "地域密着型通所介護",
            home_help: "訪問介護",
            night_home_help: "夜間対応型訪問介護",
            regular_patrol_nursing: "定期巡回・随時対応",
          };
          const dir = careDirs[i];
          return arr.map(row => coerceCare(row, labelByDir[dir]));
        })
        .catch(() => [] as CareItemCoerced[])
    );

    Promise.all([...medPromises, ...carePromises]).then((chunks) => {
      const medList = (chunks.slice(0, medPromises.length) as HealthItem[][]).flat();
      const careList = (chunks.slice(medPromises.length) as CareItemCoerced[][]).flat();

      const filterByCity = <T extends { city?: string; address?: string }>(list: T[]) => {
        if (!city) return list;
        const want = normalizeCity(city);
        return list.filter((a) => {
          const inCity = normalizeCity(a.city) ? normalizeCity(a.city) === want : false;
          const inAddr = (a.address || "").includes(city);
          return inCity || inAddr;
        });
      };

      const medFiltered = filterByCity(medList);
      const careFiltered = filterByCity(careList);

      const medCombined: CombinedItem[] = medFiltered.map(m => ({
        id: m.id,
        name: m.name,
        tel: m.tel,
        address: m.address,
        url: m.url,
        kindLabel: HEALTH_KIND_LABEL[m.kind],
      }));
      const careCombined: CombinedItem[] = careFiltered.map(c => ({
        id: c.id,
        name: c.name,
        tel: c.tel,
        address: c.address,
        url: c.url,
        kindLabel: c.service || c.kindLabel || "介護",
      }));

      setAllItems([...medCombined, ...careCombined]);
    }).catch(() => setAllItems([]));
  }, [pref, city, category]);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* ① エリア（地方） */}
      <div className="flex justify-center mb-2">
        <BannerSlot slot="top" />
      </div>

      <AccordionMobile id="area" openId={openId} setOpenId={(id)=>setOpenId(id)} title="エリアから探す（地方）">
        <RegionGrid onPick={(key) => { setRegionKey(key); setPref(""); setCity(""); setOpenId("pref"); }} />
      </AccordionMobile>

      {/* ② 都道府県 */}
      {regionKey && (
        <AccordionMobile id="pref" openId={openId} setOpenId={setOpenId} title="地域を選ぶ（都道府県）">
          {/* 都道府県ページ用バナー（県が未選択でも枠は表示OK） */}
          <div className="mb-4">
            <BannerSlot slot="pref" pref={pref} />
          </div>

          <PrefPicker regionKey={regionKey} pref={pref} onPick={(p) => { setPref(p); setCity(""); setOpenId("city"); }} />
        </AccordionMobile>
      )}

      {/* ③ 市区町村 */}
      {pref && (
        <AccordionMobile id="city" openId={openId} setOpenId={setOpenId} title={`市区町村を選ぶ（${pref}）`}>
          {/* ← PCもスマホも、五十音ブロックのみ */}
          <CityIndex
            pref={pref}
            cities={cityList}
            current={city}
            onPick={(c) => { setCity(c); setOpenId("category"); }}
          />
        </AccordionMobile>
      )}

      {/* ④ 業種 */}
      {(pref || city) && (
        <AccordionMobile id="category" openId={openId} setOpenId={setOpenId} title="業種から探す">
          <CategoryPicker category={category} setCategory={setCategory} />

          {["病院","クリニック","歯科"].includes(category) && (
            <div className="mt-3">
              <DeptPicker
                dir={HEALTH_CATEGORY_MAP[category].dir}
                value={dept}
                onChange={setDept}
              />
            </div>
          )}
        </AccordionMobile>
      )}

      {/* ⑤ 一覧 */}
      {(pref || city) && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">一覧</h2>
            <BannerSlot slot="listTop" pref={pref} city={city} />
          </div>

          {category === "全て" ? (
            allItems !== null ? (
              allItems.length ? <CombinedTable items={allItems} /> :
              <div className="p-6 text-center text-sm text-gray-500 border rounded-xl">該当する施設が見つかりませんでした。</div>
            ) : (
              <ResultTable rows={filteredRows} />
            )
          ) : healthItems !== null ? (
            healthItems.length ? <HealthTable items={healthItems} /> :
            <div className="p-6 text-center text-sm text-gray-500 border rounded-xl">該当する施設が見つかりませんでした。</div>
          ) : careItems !== null ? (
            careItems.length ? <CareTable items={careItems} /> :
            <div className="p-6 text-center text-sm text-gray-500 border rounded-xl">該当する施設が見つかりませんでした。</div>
          ) : (
            <ResultTable rows={filteredRows} />
          )}
        </section>
      )}

      <section className="text-xs text-gray-500">
        ※ 本デモはダミーデータです。実運用は CSV/DB から静的生成（SSG）し、URLは <code>/{'{pref}/{city}/{category}'}</code> を推奨。
      </section>
    </div>
  );
}