// components/ResultCard.tsx
type Item = {
  id: string;
  name: string;
  kind: string;
  tel?: string;
  address?: string;
  tags?: string[];
  url?: string;
};

export default function ResultCard({ item }: { item: Item }) {
  return (
    <article className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold">
            {item.url ? (
              <a className="underline-offset-2 hover:underline" href={item.url} target="_blank">
                {item.name}
              </a>
            ) : item.name}
          </h3>
          <p className="mt-1 text-sm text-neutral-600">{item.address ?? "-"}</p>
        </div>
        <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs">{item.kind}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {item.tel ? (
          <a href={`tel:${item.tel.replace(/[^\d+]/g,"")}`} className="rounded border px-2 py-1 hover:bg-neutral-50">
            📞 {item.tel}
          </a>
        ) : <span className="rounded border px-2 py-1 text-neutral-500">電話 -</span>}
        {(item.tags ?? []).slice(0,4).map(t => (
          <span key={t} className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{t}</span>
        ))}
      </div>
    </article>
  );
}