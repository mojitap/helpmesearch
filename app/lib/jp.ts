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