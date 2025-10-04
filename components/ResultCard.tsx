// components/ResultCard.tsx（丸ごと差し替えでもOK）

type Item = {
  id: string;
  name: string;
  kind: string;
  tel?: string;
  address?: string;
  tags?: string[];
  url?: string;
  hours?: string;
  nightLabel?: string;
  closed?: string;
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

  return (
    <article className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      {/* タイトル行 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold leading-snug">
            {item.url ? (
              <a className="underline-offset-2 hover:underline" href={item.url} target="_blank" rel="noreferrer">
                {item.name}
              </a>
            ) : (
              item.name
            )}
          </h3>
          <p className="mt-1 text-sm text-neutral-600">{item.address || "-"}</p>
        </div>
        <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-neutral-700">
          {item.kind || "-"}
        </span>
      </div>

      {/* 情報行：縦並び */}
      <div className="mt-3 space-y-1.5 text-sm">
        <p className="flex items-center gap-2">
          <span className="inline-flex w-20 justify-center rounded bg-neutral-100 px-2 py-0.5 text-xs">🕘 通常時間</span>
          <span className="text-neutral-800">{item.hours || "—"}</span>
        </p>
        <p className="flex items-center gap-2">
          <span className={`inline-flex w-20 justify-center rounded px-2 py-0.5 text-xs ${item.nightLabel ? "bg-emerald-100" : "bg-neutral-100"}`}>
            🌙 夜間対応
          </span>
          <span className={item.nightLabel ? "text-emerald-700 font-medium" : "text-neutral-500"}>{item.nightLabel || "—"}</span>
        </p>
        <p className="flex items-center gap-2">
          <span className="inline-flex w-20 justify-center rounded bg-neutral-100 px-2 py-0.5 text-xs">🚫 休診日</span>
          <span className="text-neutral-800">{item.closed || "—"}</span>
        </p>
      </div>

      {/* アクション／タグ */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
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
        {(item.tags ?? []).slice(0, 4).map((t) => (
          <span key={t} className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
            {t}
          </span>
        ))}
      </div>
    </article>
  );
}