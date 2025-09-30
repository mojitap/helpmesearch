import Link from "next/link";
import { notFound } from "next/navigation";
import { REGION_PREFS } from "@/app/lib/jp"; // { kansai:{label,prefs:[...]} など

export default function RegionPage({ params }: { params: { region: string } }) {
  const region = REGION_PREFS[params.region];
  if (!region) return notFound(); // 想定外のスラッグは404

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-extrabold">{region.label}</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {region.prefs.map((pref) => (
          <Link
            key={pref}
            href={`/pref/${encodeURIComponent(pref)}`}
            className="aspect-square rounded-2xl border border-black/10 bg-white shadow-sm
                       flex items-center justify-center text-lg font-semibold hover:bg-gray-50"
          >
            {pref}
          </Link>
        ))}
      </div>
    </main>
  );
}