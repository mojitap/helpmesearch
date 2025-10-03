/* public/pref-bridge.js (robust) */
(function () {
  const PREF_JP = {
    hokkaido:"北海道",
    aomori:"青森県", iwate:"岩手県", miyagi:"宮城県", akita:"秋田県", yamagata:"山形県", fukushima:"福島県",
    ibaraki:"茨城県", tochigi:"栃木県", gunma:"群馬県", saitama:"埼玉県", chiba:"千葉県", tokyo:"東京都", kanagawa:"神奈川県",
    niigata:"新潟県", toyama:"富山県", ishikawa:"石川県", fukui:"福井県", yamanashi:"山梨県", nagano:"長野県",
    gifu:"岐阜県", shizuoka:"静岡県", aichi:"愛知県",
    mie:"三重県", shiga:"滋賀県", kyoto:"京都府", osaka:"大阪府", hyogo:"兵庫県", nara:"奈良県", wakayama:"和歌山県",
    tottori:"鳥取県", shimane:"島根県", okayama:"岡山県", hiroshima:"広島県", yamaguchi:"山口県",
    tokushima:"徳島県", kagawa:"香川県", ehime:"愛媛県", kochi:"高知県",
    fukuoka:"福岡県", saga:"佐賀県", nagasaki:"長崎県", kumamoto:"熊本県", oita:"大分県", miyazaki:"宮崎県", kagoshima:"鹿児島県",
    okinawa:"沖縄県"
  };

  function setSelectValue(sel, value) {
    sel.value = value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    sel.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function findPrefSelect() {
    const byLabel = Array.from(document.querySelectorAll('label'))
      .find(l => /都道府県/.test(l.textContent || ''));
    if (byLabel) {
      const forId = byLabel.getAttribute('for');
      const el = forId && document.getElementById(forId);
      if (el && el.tagName === 'SELECT') return el;
    }
    const selects = Array.from(document.querySelectorAll('select'));
    selects.sort((a,b)=> b.options.length - a.options.length);
    return selects.find(s => s.options.length > 30) || selects[0] || null;
  }

  function run() {
    const p = new URLSearchParams(location.search).get('pref');
    if (!p) return;

    const sel =
      document.querySelector('select[name="prefecture"]') ||
      document.querySelector('#prefecture') ||
      document.querySelector('select[aria-label="都道府県"]') ||
      document.querySelector('select[data-role="prefecture"]') ||
      findPrefSelect();

    if (!sel) return;

    if ([...sel.options].some(o => o.value === p)) {
      setSelectValue(sel, p);
    } else {
      const jp = PREF_JP[p];
      if (jp && [...sel.options].some(o => o.value === jp || (o.textContent||'').trim() === jp)) {
        setSelectValue(sel, jp);
      } else {
        return;
      }
    }

    setTimeout(() => {
      const btn =
        document.querySelector('[data-search]') ||
        document.querySelector('button[type="submit"]') ||
        document.querySelector('button[aria-label="検索"]');
      btn && btn.click();
    }, 50);
  }

  window.addEventListener('load', run);
})();