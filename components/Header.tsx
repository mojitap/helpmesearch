// components/Header.tsx
export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <a href="/" className="font-extrabold text-lg tracking-tight">
          Help<span className="text-blue-600">Me</span>Search
        </a>
        <nav aria-label="グローバル">
          <button
            className="rounded-full border px-3 py-1.5 text-sm hover:bg-neutral-50"
            aria-label="メニュー"
          >
            メニュー
          </button>
        </nav>
      </div>
    </header>
  );
}