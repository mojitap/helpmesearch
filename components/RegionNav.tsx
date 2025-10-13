"use client";

import Link from "next/link";
import { REG8_LABEL, type Region8Key } from "@/app/lib/jp";

const ORDER: Region8Key[] = [
  "hokkaido", "tohoku", "kanto", "chubu",
  "kinki", "chugoku", "shikoku", "kyushu",
];

// 地方色（東北=青 / 関東=黄）
const COLORS: Record<Region8Key, string> = {
  hokkaido: "#7ACB7A",
  tohoku:   "#5DA8E8",
  kanto:    "#F4D35E",
  chubu:    "#F29B77",
  kinki:    "#60C2C9",
  chugoku:  "#A58AD8",
  shikoku:  "#9DA4F0",
  kyushu:   "#E89AB5",
};

export default function RegionNav({ className = "" }: { className?: string }) {
  return (
    <nav className={`mx-auto w-full max-w-5xl ${className}`}>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ORDER.map((key) => (
          <li key={key}>
            <Link
              href={`/region8/${key}`}
              style={{ backgroundColor: COLORS[key] }}
              className="block min-h-[64px] rounded-2xl border border-black/10 p-4
                         text-center text-base font-semibold text-white shadow-sm
                         hover:shadow-md focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-blue-400 sm:text-lg"
              aria-label={REG8_LABEL[key]}
            >
              {REG8_LABEL[key]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}