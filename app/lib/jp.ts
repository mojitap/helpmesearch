// app/lib/jp.ts

// 47都道府県
export const PREFS_47 = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県",
  "岐阜県","静岡県","愛知県","三重県",
  "滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県",
  "鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県",
  "福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県",
] as const;
export type PrefValue = typeof PREFS_47[number];

// 医療/介護の選択肢
export const KIND_OPTIONS = [
  // 医療
  { label:"病院", value:"hospital" },
  { label:"クリニック", value:"clinic" },
  { label:"歯科", value:"dental" },
  { label:"薬局", value:"pharmacy" },
  // 介護
  { label:"特養", value:"tokuyou" },
  { label:"老健", value:"rouken" },
  { label:"介護医療院", value:"care_medical_institute" },
  { label:"デイサービス", value:"day_service" },
  { label:"地域密着型通所介護", value:"community_day_service" },
  { label:"訪問介護", value:"home_help" },
  { label:"夜間対応型訪問介護", value:"night_home_help" },
  { label:"定期巡回・随時対応", value:"regular_patrol_nursing" },
] as const;
export type KindValue = typeof KIND_OPTIONS[number]["value"];

// 地方キー＆ラベル
export const REGIONS = [
  { key: "hokkaido_tohoku", label: "北海道・東北" },
  { key: "kanto",            label: "関東" },
  { key: "chubu",            label: "中部" },
  { key: "kinki",            label: "近畿" },
  { key: "chugoku_shikoku",  label: "中国・四国" },
  { key: "kyushu_okinawa",   label: "九州・沖縄" },
] as const;
export type RegionKey = typeof REGIONS[number]["key"];
export const REGION_LABEL: Record<RegionKey, string> =
  Object.fromEntries(REGIONS.map(r => [r.key, r.label])) as Record<RegionKey, string>;

// 地方ごとの都道府県
export const REGION_PREFS: Record<RegionKey, PrefValue[]> = {
  hokkaido_tohoku: ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県"],
  kanto: ["茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県"],
  chubu: ["新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県"],
  kinki: ["三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県"],
  chugoku_shikoku: ["鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県"],
  kyushu_okinawa: ["福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"],
};

// ── 8地方（北海道/東北/関東/中部/近畿/中国/四国/九州） ─────────────────
export const REG8_LABEL = {
  hokkaido: "北海道地方",
  tohoku: "東北地方",
  kanto: "関東地方",
  chubu: "中部地方",
  kinki: "近畿地方",
  chugoku: "中国地方",
  shikoku: "四国地方",
  kyushu: "九州地方",
} as const;
export type Region8Key = keyof typeof REG8_LABEL;

export const REG8_PREFS: Record<Region8Key, PrefValue[]> = {
  hokkaido: ["北海道"],
  tohoku: ["青森県","岩手県","宮城県","秋田県","山形県","福島県"],
  kanto: ["東京都","茨城県","栃木県","群馬県","埼玉県","千葉県","神奈川県"],
  chubu: ["新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県"],
  kinki: ["京都府","大阪府","三重県","滋賀県","兵庫県","奈良県","和歌山県"],
  chugoku: ["鳥取県","島根県","岡山県","広島県","山口県"],
  shikoku: ["徳島県","香川県","愛媛県","高知県"],
  kyushu: ["福岡県","佐賀県","長崎県","大分県","熊本県","宮崎県","鹿児島県","沖縄県"],
};

export const PREF_TO_REG8 = Object.fromEntries(
  (Object.keys(REG8_PREFS) as Region8Key[]).flatMap((key) =>
    REG8_PREFS[key].map((pref) => [pref, key] as const)
  )
) as Record<PrefValue, Region8Key>;

// 都道府県:日本語 → スラッグ
export const PREF_TO_ID: Record<PrefValue, string> = {
  北海道:"hokkaido",
  青森県:"aomori", 岩手県:"iwate", 宮城県:"miyagi", 秋田県:"akita", 山形県:"yamagata", 福島県:"fukushima",
  茨城県:"ibaraki", 栃木県:"tochigi", 群馬県:"gunma", 埼玉県:"saitama", 千葉県:"chiba", 東京都:"tokyo", 神奈川県:"kanagawa",
  新潟県:"niigata", 富山県:"toyama", 石川県:"ishikawa", 福井県:"fukui", 山梨県:"yamanashi", 長野県:"nagano",
  岐阜県:"gifu", 静岡県:"shizuoka", 愛知県:"aichi",
  三重県:"mie", 滋賀県:"shiga", 京都府:"kyoto", 大阪府:"osaka", 兵庫県:"hyogo", 奈良県:"nara", 和歌山県:"wakayama",
  鳥取県:"tottori", 島根県:"shimane", 岡山県:"okayama", 広島県:"hiroshima", 山口県:"yamaguchi",
  徳島県:"tokushima", 香川県:"kagawa", 愛媛県:"ehime", 高知県:"kochi",
  福岡県:"fukuoka", 佐賀県:"saga", 長崎県:"nagasaki", 熊本県:"kumamoto", 大分県:"oita", 宮崎県:"miyazaki", 鹿児島県:"kagoshima",
  沖縄県:"okinawa",
};

// 逆引き（必要なら）
export const ID_TO_PREF = Object.fromEntries(
  Object.entries(PREF_TO_ID).map(([jp, id]) => [id, jp as PrefValue])
) as Record<string, PrefValue>;