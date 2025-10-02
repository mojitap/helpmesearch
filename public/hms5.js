// 地域から探す（hms5：外部JS・defer実行・自己復元）
(function(){
  // SPA等で消されても復活させる
  function mountUI(){
    if(document.getElementById('hms5-open')) return; // 既にあれば何もしない

    // ボタン＋モーダルを作成
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <button class="hms5-fab" id="hms5-open">地域から探す</button>
      <div class="hms5-ov" id="hms5-ov" aria-hidden="true">
        <div class="hms5-md" role="dialog" aria-modal="true" aria-labelledby="hms5-title">
          <h2 class="hms5-t" id="hms5-title">地域から探す</h2>
          <p class="hms5-h">スマホは「地方 → 都道府県」の2ステップが押しやすく見やすいです。</p>
          <div id="hms5-list"><div class="hms5-g8" id="hms5-grid"></div></div>
          <div id="hms5-detail" style="display:none">
            <a href="#" class="hms5-b" id="hms5-back">← 地方一覧へ</a>
            <h3 class="hms5-t" id="hms5-ttl" style="font-size:18px"></h3>
            <div class="hms5-pg" id="hms5-pg"></div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    const DATA={
      hokkaido:{name:"北海道",prefs:[["hokkaido","北海道"]]},
      tohoku:{name:"東北",prefs:[["aomori","青森"],["iwate","岩手"],["miyagi","宮城"],["akita","秋田"],["yamagata","山形"],["fukushima","福島"]]},
      kanto:{name:"関東",prefs:[["ibaraki","茨城"],["tochigi","栃木"],["gunma","群馬"],["saitama","埼玉"],["chiba","千葉"],["tokyo","東京"],["kanagawa","神奈川"]]},
      chubu:{name:"中部",prefs:[["niigata","新潟"],["toyama","富山"],["ishikawa","石川"],["fukui","福井"],["yamanashi","山梨"],["nagano","長野"],["gifu","岐阜"],["shizuoka","静岡"],["aichi","愛知"]]},
      kansai:{name:"関西",prefs:[["mie","三重"],["shiga","滋賀"],["kyoto","京都"],["osaka","大阪"],["hyogo","兵庫"],["nara","奈良"],["wakayama","和歌山"]]},
      chugoku:{name:"中国",prefs:[["tottori","鳥取"],["shimane","島根"],["okayama","岡山"],["hiroshima","広島"],["yamaguchi","山口"]]},
      shikoku:{name:"四国",prefs:[["tokushima","徳島"],["kagawa","香川"],["ehime","愛媛"],["kochi","高知"]]},
      kyushu:{name:"九州",prefs:[["fukuoka","福岡"],["saga","佐賀"],["nagasaki","長崎"],["kumamoto","熊本"],["oita","大分"],["miyazaki","宮崎"],["kagoshima","鹿児島"]/*,["okinawa","沖縄"]*/]}
    };
    const COLORS={hokkaido:"#9BD38A",tohoku:"#5AA0E8",kanto:"#FFD676",chubu:"#7CC6F2",kansai:"#B8E986",chugoku:"#A9D08E",shikoku:"#7FD9D4",kyushu:"#FFA07A"};

    const ov=document.getElementById('hms5-ov');
    const openBtn=document.getElementById('hms5-open');
    const list=document.getElementById('hms5-list');
    const detail=document.getElementById('hms5-detail');
    const grid=document.getElementById('hms5-grid');
    const back=document.getElementById('hms5-back');
    const ttl=document.getElementById('hms5-ttl');
    const pg=document.getElementById('hms5-pg');

    grid.innerHTML = Object.entries(DATA).map(([k,v]) =>
      `<a class="hms5-card" data-k="${k}" style="background:${(COLORS[k]||'#f6f7fb')}1a">${v.name}</a>`
    ).join('');

    openBtn.addEventListener('click', ()=> ov.classList.add('is-open'));
    ov.addEventListener('click', e=>{ if(e.target===ov) ov.classList.remove('is-open'); });
    back.addEventListener('click', e=>{ e.preventDefault(); detail.style.display='none'; list.style.display='block'; });

    grid.addEventListener('click', e=>{
      const el=e.target.closest('.hms5-card'); if(!el) return;
      const r = DATA[el.dataset.k];
      ttl.textContent = r.name;
      pg.innerHTML = r.prefs.map(([id,label]) => `<a class="hms5-pref" href="/pref/${id}">${label}</a>`).join('');
      list.style.display='none'; detail.style.display='block';
    });
  }

  // 初回：完全ロード後に実行（SPAの初期描画が終わってから）
  window.addEventListener('load', mountUI);

  // 念のため、DOMがごっそり差し替えられても復活
  const mo = new MutationObserver(()=>{ if(!document.getElementById('hms5-open')) mountUI(); });
  mo.observe(document.documentElement, {childList:true,subtree:true});
})();