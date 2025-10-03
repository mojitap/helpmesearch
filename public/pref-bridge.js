/* public/pref-bridge.js */
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
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    sel.dispatchEvent(new Event("input",  { bubbles: true }));
  }

  function selectAndSearch() {
    const p = new URLSearchParams(location.search).get("pref");
    if (!p) return false;

    const sel =
      document.querySelector('select[name="prefecture"]') ||
      document.querySelector("#prefecture") ||
      document.querySelector('select[aria-label="都道府県"]') ||
      document.querySelector('select[data-role="prefecture"]');

    if (!sel) return false;

    let matched = false;
    if ([...sel.options].some(o => o.value === p)) {
      setSelectValue(sel, p); matched = true;
    } else {
      const jp = PREF_JP[p];
      if (jp && [...sel.options].some(o => o.value === jp || o.textContent.trim() === jp)) {
        setSelectValue(sel, jp); matched = true;
      }
    }
    if (!matched) return false;

    const btn =
      document.querySelector("[data-search]") ||
      document.querySelector('button[type="submit"]') ||
      document.querySelector('button[aria-label="検索"]');
    btn && btn.click();
    return true;
  }

  function waitAndRun() {
    if (selectAndSearch()) return;
    // セレクトがまだ DOM にない場合は監視して、出てきたら実行
    const obs = new MutationObserver(() => {
      if (selectAndSearch()) obs.disconnect();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 7000); // 安全に自動停止
  }

  if (document.readyState === "complete") {
    waitAndRun();
  } else {
    window.addEventListener("load", waitAndRun);
  }
})();