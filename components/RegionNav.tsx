// components/RegionNav.tsx
"use client";

import Link from "next/link";
import { REG8_LABEL, type Region8Key } from "@/app/lib/jp";

const ORDER: Region8Key[] = [
  "hokkaido","tohoku","kanto","chubu","kinki","chugoku","shikoku","kyushu",
];

const COLORS: Record<Region8Key, string> = {
  hokkaido:"#7ACB7A", tohoku:"#5DA8E8", kanto:"#F4D35E", chubu:"#F29B77",
  kinki:"#60C2C9", chugoku:"#A58AD8", shikoku:"#9DA4F0", kyushu:"#E89AB5",
};

export default function RegionNav() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h2 className="mb-4 text-center text-xl font-bold">エリアから探す</h2>
      <ul className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        {ORDER.map((k) => (
          <li key={k}>
            <Link
              href={`/region8/${k}`}
              style={{ backgroundColor: COLORS[k] }}
              className="block rounded-xl px-4 py-6 text-center text-base font-semibold text-white shadow-sm outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-black/30 sm:text-lg"
            >
              {REG8_LABEL[k]}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}