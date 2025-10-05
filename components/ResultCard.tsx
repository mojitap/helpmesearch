// components/ResultCard.tsx（差し替え）
type Item = {
  id: string;
  name: string;
  kind: string;
  tel?: string;
  address?: string;
  tags?: string[];
  url?: string;
  hours?: string;
  nightLabel?: string; // "救急：20:00〜09:00" or "〜23:00" 等
  closed?: string;
};

// 英語 -> 日本語ラベル
const KIND_LABEL: Record<string, string> = {
  hospital: "病院",
  clinic: "クリニック",
  dental: "歯科",
  pharmacy: "薬局",
  day_service: "デイサービス",
  community_day_service: "地域密着型通所介護",
  home_help: "訪問介護",
  night_home_help: "夜間対応型訪問介護",
  rouken: "老健",
  tokuyou: "特別養護老人ホーム",
  care_medical_institute: "介護医療院",
  regular_patrol_nursing: "定期巡回・随時対応",
};

const formatJPPhone = (raw?: string) => {
  const digits0 = (raw ?? "").replace(/[^\d]/g, "");
  if (!digits0) return "";
  let s = digits0;
  if (s[0] !== "0" && s.length >= 9 && s.length <= 11) s = "0" + s;
  if (s.startsWith("0120") && s.length === 10) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6)}`;
  if (s.length === 11) return `${s.slice(0,3)}-${s.slice(3,7)}-${s.slice(7)}`;
  if (s.length === 10) {
    if (s.startsWith("03") || s.startsWith("06")) return `${s.slice(0,2)}-${s.slice(2,6)}-${s.slice(6)}`;
    return `${s.slice(0,3)}-${s.slice(3,6)}-${s.slice(6)}`;
  }
  return s;
};
const telHref = (raw?: string) => `tel:${(raw ?? "").replace(/[^\d+]/g, "")}`;

export default function ResultCard({ item }: { item: Item }) {
  const phone = formatJPPhone(item.tel);
  const kindJp = KIND_LABEL[item.kind] ?? ""; // わかりにくければ非表示でもOK

  // 「通常時間 ／ 救急：…」の結合表示（救急のときだけ結合）
  const combinedHours =
    item.hours && item.nightLabel?.startsWith("救急：")
      ? `${item.hours} ／ ${item.nightLabel}`
      : item.hours || (item.nightLabel?.startsWith("救急：") ? item.nightLabel : "");

  // 夜間対応行は「救急」以外（〜23:00 / 対応あり など）だけを表示
  const nightRow =
    item.nightLabel && !item.nightLabel.startsWith("救急：")
      ? item.nightLabel
      : "";

  return (
    <article className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      {/* タイトル行（名前はクリック不可に） */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold leading-snug">{item.name}</h3>
          <p className="mt-1 text-sm text-neutral-600">{item.address || "-"}</p>
        </div>

        {kindJp ? (
          <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-neutral-700">
            {kindJp}
          </span>
        ) : null}
      </div>

      {/* 情報行：縦並び */}
      <div className="mt-3 space-y-1.5 text-sm">
        <p className="flex items-center gap-2">
          <span className="inline-flex min-w-16 justify-center rounded bg-neutral-100 px-2 py-0.5 text-xs">🕘 通常時間</span>
          <span className="text-neutral-800">{combinedHours || "—"}</span>
        </p>

        <p className="flex items-center gap-2">
          <span className={`inline-flex min-w-16 justify-center rounded px-2 py-0.5 text-xs ${nightRow ? "bg-emerald-100" : "bg-neutral-100"}`}>
            🌙 夜間対応
          </span>
          <span className={nightRow ? "text-emerald-700 font-medium" : "text-neutral-500"}>
            {nightRow || "—"}
          </span>
        </p>

        <p className="flex items-center gap-2">
          <span className="inline-flex min-w-16 justify-center rounded bg-neutral-100 px-2 py-0.5 text-xs">🚫 休診日</span>
          <span className="text-neutral-800">{item.closed || "—"}</span>
        </p>
      </div>

      {/* アクション（※ラベルは削除） */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 hover:bg-neutral-50"
          >
            <span aria-hidden>🌐</span> Webサイト
          </a>
        ) : (
          <span className="rounded border px-2 py-1 text-neutral-500">Webサイト -</span>
        )}

        {phone ? (
          <a
            href={telHref(item.tel)}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 hover:bg-neutral-50"
          >
            <span aria-hidden>📞</span>
            {phone}
          </a>
        ) : (
          <span className="rounded border px-2 py-1 text-neutral-500">電話番号 -</span>
        )}
      </div>
    </article>
  );
}