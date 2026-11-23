/*
 * Campus Flow  T-14「滞在時間内に行けるお店を提案する」
 *
 * 追加ファイル。元のコードは変更しない。index.html の最後でこのファイルを読み込むと、
 * メイン画面に「時間内に行けるお店」ボタンが出て、押すとお店の提案画面が開く。
 * 生成AIは使わない（計算と言葉の照合だけで提案する）。
 *
 * しくみ
 *  1. 行けるお店の絞り込み
 *     ・使う時間：アプリの「滞在可能時間」（compute() の avail）
 *     ・条件：駅のバス停⇔お店の往復の徒歩 ＋ 店での目安時間 ≦ 滞在可能時間、かつ営業時間内
 *       今いる場所から駅のバス停まで歩き（設定の徒歩時間）、そこからお店へ行く、として安全側に見積もる
 *  2. おすすめの選び方（最大3店）
 *     ・予算を超えるお店は除く
 *     ・「どう過ごしたい？」の文に、お店のジャンルやタグ（パン、カフェなど）や
 *       言い換え（昼ごはん → ラーメン・そば など）が含まれるお店を優先する
 *     ・希望に合うお店が少ないときは、ジャンルが重ならないように選ぶ
 *
 * お店のデータ：T-14 で調べた八王子みなみ野駅周辺の店（2026-11-16時点・チーム確認前）
 */
(function () {
  "use strict";
  if (window.CampusShop) return;

  var STATION = "みなみ野駅";
  var STORES = [
    {"id": "m01", "name": "ベン ベン カフェ 八王子みなみ野店", "category": "カフェ", "walkMin": 2, "stayMin": 20, "budget": "〜500円", "open": null, "close": null, "tags": ["安い", "ソフトクリーム"], "description": "駅前のホームセンター内にある、安く利用できるカフェ。", "source": "https://tabelog.com/tokyo/A1329/A132904/R7922/rstLst/"},
    {"id": "m02", "name": "DCM 八王子みなみ野店", "category": "ホームセンター", "walkMin": 2, "stayMin": 15, "budget": "", "open": "09:30", "close": "20:00", "tags": ["日用品", "工具"], "description": "駅前の大きなホームセンター（旧DCMホーマック）。日用品や工具がそろう。", "source": "https://tokubai.co.jp/DCM/prefectures/13"},
    {"id": "m03", "name": "長崎らーめん 西海製麺所 八王子みなみ野店", "category": "ラーメン", "walkMin": 3, "stayMin": 25, "budget": "〜1,000円", "open": null, "close": null, "tags": ["一人OK", "ちゃんぽん"], "description": "駅近くの長崎らーめんの店。手頃な値段で食べられる。", "source": "https://tabelog.com/tokyo/A1329/A132904/R7922/rstLst/"},
    {"id": "m04", "name": "さんじ庵", "category": "そば", "walkMin": 2, "stayMin": 35, "budget": "1,000〜2,000円", "open": null, "close": null, "tags": ["和食"], "description": "駅近くのそば・和食の店。落ち着いて食事したいときに。", "source": "https://tabelog.com/tokyo/A1329/A132904/R7922/rstLst/"},
    {"id": "m05", "name": "ペンギンベーカリー 八王子みなみ野店", "category": "ベーカリー", "walkMin": 3, "stayMin": 10, "budget": "〜1,000円", "open": null, "close": null, "tags": ["パン", "テイクアウト"], "description": "北海道産小麦の焼きたてパンが人気のベーカリー。", "source": "https://www.enjoytokyo.jp/theme/area1340/cat0101/"},
    {"id": "m06", "name": "けいの家 八王子みなみ野店", "category": "和食・海鮮", "walkMin": 1, "stayMin": 40, "budget": "1,000〜1,500円", "open": null, "close": null, "tags": ["海鮮"], "description": "駅前の海鮮・居酒屋。昼に営業しているか要確認。", "source": "https://www.hotpepper.jp/SA11/Y110/XA7B/U012/"},
    {"id": "m07", "name": "Trattoria Shun", "category": "イタリアン", "walkMin": 5, "stayMin": 45, "budget": "〜1,000円（ランチ）", "open": null, "close": null, "tags": ["パスタ", "ランチ"], "description": "手打ちパスタのイタリアン。時間に余裕があるときに。", "source": "https://www.hotpepper.jp/SA11/Y110/XA7B/U012/"},
    {"id": "m08", "name": "ファミリーマート 八王子みなみ野店", "category": "コンビニ", "walkMin": 4, "stayMin": 5, "budget": "〜500円", "open": null, "close": null, "tags": ["ATM", "飲み物"], "description": "西口のコンビニ。ゆうちょATMがある。", "source": "https://map.yahoo.co.jp/v3/place/0DvPCaLAvmM"},
    {"id": "m09", "name": "クイックカットBB 三和八王子みなみ野店", "category": "ヘアカット", "walkMin": 3, "stayMin": 25, "budget": "", "open": null, "close": null, "tags": ["短時間"], "description": "短時間のヘアカット専門店。待ち時間によっては間に合わないので注意。", "source": "https://map.yahoo.co.jp/v3/place/MTp1Zspr0dU"},
    {"id": "m10", "name": "八王子南郵便局", "category": "郵便局", "walkMin": 5, "stayMin": 10, "budget": "", "open": null, "close": null, "tags": ["用事", "ゆうちょ"], "description": "郵便や振込などの用事に。", "source": "https://map.yahoo.co.jp/v3/place/0DvPCaLAvmM"},
    {"id": "m11", "name": "くまざわ書店 八王子みなみ野店", "category": "書店", "walkMin": 2, "stayMin": 20, "budget": "", "open": "10:00", "close": "21:00", "tags": ["本", "参考書"], "description": "駅近くの書店。参考書や雑誌を見たいときに。", "source": "https://tokubai.co.jp/transit/rail_lines/station_groups/1289"},
    {"id": "m12", "name": "三和 八王子みなみ野店", "category": "スーパー", "walkMin": 4, "stayMin": 10, "budget": "〜500円", "open": "09:00", "close": "22:00", "tags": ["食料品", "飲み物"], "description": "駅近くのスーパー。飲み物や軽食を安く買える。", "source": "https://tokubai.co.jp/transit/rail_lines/station_groups/1289"}
  ];

  // ───────── 計算 ─────────
  function m(s) {
    var x = /^(\d{1,2}):(\d{2})$/.exec(s || "");
    return x ? +x[1] * 60 + +x[2] : null;
  }
  function hhmm(n) {
    n = ((n % 1440) + 1440) % 1440;
    return String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0");
  }

  /** compute() の結果から、時間内に行けるお店の候補を出す */
  function findStores(r) {
    if (!r || r.kind !== "ok") {
      var why = {
        none: "間に合う帰りのバスがないため、お店には行けません。",
        off: "今日はバスが運休です。",
        past: "講義の時刻を確認してください（⚙ から設定）。",
        missing: "講義の時刻と歩く時間を設定してください（⚙ から設定）。"
      };
      return { ok: false, reason: why[r && r.kind] || why.missing, cands: [] };
    }
    var dep = m(r.bus[0]);              // 帰りのバスの発車時刻
    var toStop = dep - r.leave;          // 今いる場所 → 駅のバス停の徒歩
    var atStation = r.now + toStop;      // 駅のバス停の近くに着く時刻
    var cands = [];
    STORES.forEach(function (s) {
      var arrive = atStation + s.walkMin;        // お店に着く時刻
      var leaveStore = dep - s.walkMin;          // お店を出る時刻
      var o = m(s.open), c = m(s.close), known = o !== null && c !== null;
      if (known) {
        if (c <= o) c += 1440;                   // 深夜0時をまたぐ営業
        arrive = Math.max(arrive, o);            // 開店前なら開店まで待つ
        leaveStore = Math.min(leaveStore, c);    // 閉店が先なら閉店まで
      }
      var inStore = leaveStore - arrive;
      if (inStore < s.stayMin) return;           // 店での目安時間が取れない
      cands.push({
        id: s.id, name: s.name, category: s.category, walkMin: s.walkMin, stayMin: s.stayMin,
        budget: s.budget, tags: s.tags, description: s.description, source: s.source,
        arriveAt: hhmm(arrive), leaveStoreBy: hhmm(leaveStore), minutesInStore: inStore,
        hours: known ? s.open + "〜" + s.close : "要確認", hoursKnown: known
      });
    });
    cands.sort(function (a, b) { return a.walkMin - b.walkMin || (a.name < b.name ? -1 : 1); });
    return { ok: true, avail: r.avail, busDep: r.bus[0], cands: cands,
      reason: cands.length ? "" : "滞在可能時間（" + r.avail + "分）では、行けるお店がありません。" };
  }

  function budgetMax(text) {
    var nums = String(text || "").replace(/,/g, "").match(/\d+/g);
    return nums ? Math.max.apply(null, nums.map(Number)) : null;
  }

  // 希望の文に出てきそうな言葉 → 合うジャンル・タグ
  var SYNONYMS = {
    "ごはん": ["ラーメン", "そば", "和食・海鮮", "イタリアン"], "ご飯": ["ラーメン", "そば", "和食・海鮮", "イタリアン"],
    "ランチ": ["ラーメン", "そば", "和食・海鮮", "イタリアン"], "食事": ["ラーメン", "そば", "和食・海鮮", "イタリアン"],
    "軽食": ["ベーカリー", "カフェ", "コンビニ"], "課題": ["カフェ"], "勉強": ["カフェ", "書店"], "休憩": ["カフェ"],
    "本": ["書店"], "参考書": ["書店"], "飲み物": ["コンビニ", "スーパー"], "買い物": ["スーパー", "ホームセンター"],
    "安く": ["安い"], "安い": ["安い"], "髪": ["ヘアカット"], "郵便": ["郵便局"]
  };

  /** おすすめの選び方：希望の文に合うジャンル・タグの店を優先し、最大3店 */
  function simpleSuggest(cands, pref, budget) {
    var limit = budgetMax(budget), text = String(pref || "");
    var wanted = {};
    Object.keys(SYNONYMS).forEach(function (w) {
      if (text.indexOf(w) >= 0) SYNONYMS[w].forEach(function (k) { wanted[k] = true; });
    });
    var list = cands.filter(function (x) {
      var b = budgetMax(x.budget);
      return limit === null || b === null || b <= limit;
    }).map(function (x) {
      var keys = [x.category].concat(x.tags), score = 0;
      keys.forEach(function (k) {
        if (text.indexOf(k) >= 0) score += 3;     // 希望の文にジャンル・タグがそのまま出てくる
        else if (wanted[k]) score += 2;           // 言い換えで合う
      });
      return { x: x, score: score };
    });
    list.sort(function (a, b) { return b.score - a.score || b.x.minutesInStore - a.x.minutesInStore; });
    var matched = list.filter(function (it) { return it.score > 0; });
    var picked = [], cats = {};
    if (matched.length) {                                  // 希望に合う店があれば、その店だけ
      picked = matched.slice(0, 3).map(function (it) { return it.x; });
    } else {                                               // なければ、ジャンルが重ならないように
      list.forEach(function (it) {
        if (picked.length >= 3 || cats[it.x.category]) return;
        picked.push(it.x); cats[it.x.category] = true;
      });
    }
    picked.matched = matched.length > 0;
    return picked;
  }

  // ───────── 画面 ─────────
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text !== undefined) e.textContent = text;
    return e;
  }
  var ui = {};

  function buildUI() {
    var css = el("style");
    css.textContent =
      ".shopbtn{display:block;margin:12px auto 0;min-height:48px;padding:0 22px;border-radius:24px;border:1px solid var(--acc);" +
      "background:#ffffff1f;color:#fff;font:700 15px var(--sans);cursor:pointer}" +
      ".shopbtn[disabled]{opacity:.45;cursor:default}" +
      "#shopSheet .sum{font-size:14px;color:#13233a;background:#eef4fa;border-radius:12px;padding:10px 12px;margin:10px 0 0}" +
      "#shopSheet .ai{white-space:pre-wrap;font-size:15px;line-height:1.6;background:#f8fafd;border:1px solid #d5dfeb;border-radius:14px;padding:12px;margin-top:14px}" +
      "#shopSheet .ai:empty{display:none}" +
      "#shopSheet .src{font-size:12px;color:#566a82;margin:6px 0 0}" +
      "#shopSheet ul{list-style:none;padding:0;margin:8px 0 0}" +
      "#shopSheet li{border-top:1px solid #e3e9f1;padding:10px 2px;font-size:14px}" +
      "#shopSheet li b{display:block;font-size:15px}" +
      "#shopSheet li small{display:block;color:#566a82;margin-top:2px}" +
      "";
    document.head.appendChild(css);

    ui.btn = el("button", { type: "button", "class": "shopbtn", id: "shopBtn" }, "🍽 時間内に行けるお店");
    var note = document.getElementById("note");
    note.parentNode.insertBefore(ui.btn, note.nextSibling);

    var d = ui.sheet = el("dialog", { id: "shopSheet", "aria-labelledby": "shopTitle" });
    d.appendChild(el("h2", { id: "shopTitle" }, "時間内に行けるお店"));
    ui.sum = d.appendChild(el("p", { "class": "sum" }));
    d.appendChild(el("label", { "for": "shopPref" }, "どう過ごしたい？"));
    ui.pref = d.appendChild(el("input", { id: "shopPref", type: "text", placeholder: "例：カフェで課題、安く昼ごはん" }));
    d.appendChild(el("label", { "for": "shopBudget" }, "予算"));
    ui.budget = d.appendChild(el("input", { id: "shopBudget", type: "text", placeholder: "例：1000円まで" }));
    ui.ask = d.appendChild(el("button", { type: "button", "class": "main" }, "✨ おすすめのお店を出す"));
    ui.ai = d.appendChild(el("div", { "class": "ai", role: "status", "aria-live": "polite" }));
    ui.aiSrc = d.appendChild(el("p", { "class": "src" }));
    d.appendChild(el("h3", {}, "行けるお店の一覧（計算結果）"));
    ui.list = d.appendChild(el("ul"));
    d.appendChild(el("p", { "class": "hint" }, "徒歩は駅のバス停からの分数です。営業時間が「要確認」の店は、お店の情報で確かめてください。お店の情報はチームの確認前のものです。"));

    ui.close = d.appendChild(el("button", { type: "button", "class": "main" }, "閉じる"));
    document.body.appendChild(d);

    // 元のコードは <body data-s> にもデモ用のクリック処理が付いていて、クリックが body まで届くと
    // デモモードに切り替わってしまう。このファイルで足した部品のクリックは body まで届かないようにする。
    [ui.btn, d].forEach(function (x) { x.addEventListener("click", function (e) { e.stopPropagation(); }); });
    ui.btn.addEventListener("click", openSheet);
    ui.close.addEventListener("click", function () { if (d.close) d.close(); else d.removeAttribute("open"); });
    ui.ask.addEventListener("click", suggest);
  }

  function current() { return findStores(window.compute()); }

  function updateButton() {
    if (!ui.btn) return;
    var f = current();
    ui.btn.disabled = !f.ok || !f.cands.length;
    ui.btn.textContent = f.ok && f.cands.length ? "🍽 時間内に行けるお店（" + f.cands.length + "件）" : "🍽 時間内に行けるお店";
  }

  function renderList(f) {
    ui.list.textContent = "";
    f.cands.forEach(function (x) {
      var li = el("li");
      li.appendChild(el("b", {}, x.name));
      li.appendChild(el("small", {}, x.category + "・徒歩" + x.walkMin + "分・" + x.arriveAt + "着 → " + x.leaveStoreBy + "までに出る（店に約" + x.minutesInStore + "分）"));
      li.appendChild(el("small", {}, "予算 " + (x.budget || "不明") + "・営業時間 " + x.hours));
      ui.list.appendChild(li);
    });
  }

  function openSheet() {
    var f = current();
    ui.sum.textContent = f.ok
      ? STATION + "周辺で " + f.avail + "分 使えます。" + f.busDep + "発の帰りのバスまでに、駅のバス停へ戻ってください。"
      : f.reason;
    ui.ai.textContent = ""; ui.aiSrc.textContent = "";
    ui.ask.disabled = !f.ok || !f.cands.length;
    renderList(f);
    if (ui.sheet.showModal) ui.sheet.showModal(); else ui.sheet.setAttribute("open", "");
  }

  /** 選んだお店を表示する（時刻・徒歩・営業時間はアプリの計算結果） */
  function showPicks(picks, note) {
    ui.ai.textContent = picks.map(function (p, i) {
      var x = p.c;
      return "①②③".charAt(i) + " " + x.name + "（" + x.category + "・徒歩" + x.walkMin + "分）\n" +
        "　" + x.arriveAt + "着 → " + x.leaveStoreBy + "までに店を出る\n" +
        "　" + (p.reason ? "おすすめ理由：" + p.reason : "特徴：" + x.description) +
        (x.hoursKnown ? "" : "\n　営業時間はお店の情報で確認してください");
    }).join("\n");
    ui.aiSrc.textContent = note;
  }

  function suggest() {
    var f = current();
    if (!f.ok || !f.cands.length) { ui.ai.textContent = f.reason; ui.aiSrc.textContent = ""; return; }
    var pref = ui.pref.value.trim();
    var picks = simpleSuggest(f.cands, pref, ui.budget.value);
    if (!picks.length) { ui.ai.textContent = "予算に合うお店がありません。"; ui.aiSrc.textContent = ""; return; }
    showPicks(picks.map(function (x) { return { c: x, reason: "" }; }),
      picks.matched ? "「" + pref + "」に合うお店です。時刻はアプリの計算です。"
      : pref ? "「" + pref + "」に合うお店が見つからなかったため、ジャンルが重ならないように選びました。"
             : "ジャンルが重ならないように選びました。「どう過ごしたい？」を入れると、合うお店を優先します。");
  }

  // ───────── 起動 ─────────
  window.CampusShop = { STORES: STORES, findStores: findStores, simpleSuggest: simpleSuggest };
  if (typeof window.compute !== "function" || !document.getElementById("note")) return;
  buildUI();
  if (typeof window.render === "function") {
    var originalRender = window.render;
    window.render = function () { var out = originalRender.apply(this, arguments); updateButton(); return out; };
  }
  // 元のコードは設定欄の変更時に render を直接登録しているため、上の置き換えでは呼ばれない。
  // 設定欄が変わったときにも、ボタンの件数を更新する（元の処理の後に動く）。
  ["classTime", "toStop", "toClass", "margin", "dateIn", "nowSlider"].forEach(function (id) {
    var input = document.getElementById(id);
    if (input) input.addEventListener("input", updateButton);
  });
  updateButton();
})();
