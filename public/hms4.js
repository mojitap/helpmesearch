/* public/hms4.js */
(function () {
  function boot() {
    // 1) CSS 注入（mapbox も文字列の中に入れる）
    const css = `
.hms4-fab{position:fixed;right:20px;bottom:24px;z-index:2147483000;background:#ef476f;color:#fff;border:none;border-radius:999px;padding:12px 16px;font-weight:800;font-size:15px;box-shadow:0 6px 18px rgba(0,0,0,.16);cursor:pointer}
.hms4-fab:active{transform:translateY(1px)}
.hms4-ov{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;z-index:2147483001}
.hms4-ov.is-open{display:block}
.hms4-md{position:absolute;inset:auto 0 0 0;margin:auto;background:#fff;border-radius:16px 16px 0 0;max-width:960px;height:min(85vh,720px);overflow:auto;padding:16px}
@media(min-width:720px){.hms4-md{top:6vh;bottom:auto;border-radius:16px;height:auto;padding:20px 22px}}
.hms4-t{margin:0 0 8px;font:800 20px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans JP",sans-serif}
.hms4-h{margin:0 0 14px;color:#6b7280;font:400 12px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans JP",sans-serif}
.hms4-g8{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
@media(min-width:640px){.hms4-g8{grid-template-columns:repeat(4,1fr)}}
.hms4-card{display:block;text-align:center;text-decoration:none;color:#111;background:#f6f7fb;border:1px solid #ececf1;border-radius:14px;padding:14px 12px;font:700 16px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans JP",sans-serif;cursor:pointer;user-select:none;touch-action:manipulation;-webkit-tap-highlight-color: rgba(0,0,0,.12)}
.hms4-b{display:inline-flex;gap:6px;align-items:center;padding:8px 10px;margin:6px 0 10px;border-radius:10px;background:#eef2ff;color:#1e40af;text-decoration:none;font:700 14px system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans JP",sans-serif}
.hms4-pg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
@media(min-width:768px){.hms4-pg{grid-template-columns:repeat(3,1fr)}}
.hms4-pref{display:block;text-align:center;text-decoration:none;color:#111;background:#fbfbfd;border:1px solid #ececf1;border-radius:12px;padding:12px 10px;font:700 16px system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans JP",sans-serif}
.hms4-mapbox{margin:10px 0 16px;background:#fff;border:1px solid #ececf1;border-radius:12px;padding:8px}
.hms4-mapbox img{width:100%;height:auto;display:block;border-radius:8px}
`;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    // 2) HTML を body 末尾に追加
    const wrap = document.createElement("div");
    wrap.innerHTML = `
<button class="hms4-fab" id="hms4-open">地域から探す</button>
<div class="hms4-ov" id="hms4-ov" aria-hidden="true">
  <div class="hms4-md" role="dialog" aria-modal="true" aria-labelledby="hms4-title">
    <h2 class="hms4-t" id="hms4-title">地域から探す</h2>
    <p class="hms4-h">スマホは「地方 → 都道府県」の2ステップが押しやすく見やすいです。</p>
    <div class="hms4-mapbox">
      <img src="/img/japan-regions.png" alt="日本地図">
    </div>
    <div id="hms4-list"><div class="hms4-g8" id="hms4-grid"></div></div>
    <div id="hms4-detail" style="display:none">
      <a href="#" class="hms4-b" id="hms4-back">← 地方一覧へ</a>
      <h3 class="hms4-t" id="hms4-ttl" style="font-size:18px"></h3>
      <div class="hms4-pg" id="hms4-pg"></div>
    </div>
  </div>
</div>`;
    document.body.appendChild(wrap);

    // 3) データ
    const DATA = {
      hokkaido: { name: "北海道", prefs: [["hokkaido", "北海道"]] },
      tohoku:   { name: "東北",   prefs: [["aomori","青森"],["iwate","岩手"],["miyagi","宮城"],["akita","秋田"],["yamagata","山形"],["fukushima","福島"]] },
      kanto:    { name: "関東",   prefs: [["ibaraki","茨城"],["tochigi","栃木"],["gunma","群馬"],["saitama","埼玉"],["chiba","千葉"],["tokyo","東京"],["kanagawa","神奈川"]] },
      chubu:    { name: "中部",   prefs: [["niigata","新潟"],["toyama","富山"],["ishikawa","石川"],["fukui","福井"],["yamanashi","山梨"],["nagano","長野"],["gifu","岐阜"],["shizuoka","静岡"],["aichi","愛知"]] },
      kansai:   { name: "関西",   prefs: [["mie","三重"],["shiga","滋賀"],["kyoto","京都"],["osaka","大阪"],["hyogo","兵庫"],["nara","奈良"],["wakayama","和歌山"]] },
      chugoku:  { name: "中国",   prefs: [["tottori","鳥取"],["shimane","島根"],["okayama","岡山"],["hiroshima","広島"],["yamaguchi","山口"]] },
      shikoku:  { name: "四国",   prefs: [["tokushima","徳島"],["kagawa","香川"],["ehime","愛媛"],["kochi","高知"]] },
      kyushu:   { name: "九州",   prefs: [["fukuoka","福岡"],["saga","佐賀"],["nagasaki","長崎"],["kumamoto","熊本"],["oita","大分"],["miyazaki","宮崎"],["kagoshima","鹿児島"]/*,["okinawa","沖縄"]*/] }
    };

    // 4) ふるまい
    const ov    = document.getElementById("hms4-ov");
    const open  = document.getElementById("hms4-open");
    const list  = document.getElementById("hms4-list");
    const detail= document.getElementById("hms4-detail");
    const grid  = document.getElementById("hms4-grid");
    const back  = document.getElementById("hms4-back");
    const ttl   = document.getElementById("hms4-ttl");
    const pg    = document.getElementById("hms4-pg");

    grid.innerHTML = Object.entries(DATA)
      .map(([k, v]) => `<button type="button" class="hms4-card" data-k="${k}">${v.name}</button>`)
      .join("");

    open.addEventListener("click", () => ov.classList.add("is-open"));
    ov.addEventListener("click", (e) => { if (e.target === ov) ov.classList.remove("is-open"); });
    back.addEventListener("click", (e) => { e.preventDefault(); detail.style.display = "none"; list.style.display = "block"; });

    const goDetail = (e) => {
      const el = (e.target as HTMLElement).closest(".hms4-card"); if (!el) return;
      const r = DATA[(el as HTMLElement).dataset.k!];
      ttl.textContent = r.name;
      pg.innerHTML = r.prefs.map(([id,label]) => `<a class="hms4-pref" href="/?pref=${id}">${label}</a>`).join('');
      list.style.display = "none";
      detail.style.display = "block";
    };
    grid.addEventListener("click", goDetail, { passive: true });
    grid.addEventListener("touchend", goDetail, { passive: true });
  }

  // DOM 準備前後どちらでも動くように
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();