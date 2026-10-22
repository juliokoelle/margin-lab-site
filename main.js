/* Margin Lab, Startseite: Navigation, Darstellung, Einblenden, drei Vorführungen,
   Rechner mit Tasse und Tasten, Fragen. Ohne Bibliothek. Alle Zahlen sind Beispieldaten. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };

  var eur2 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var eur0 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  var int = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
  var pct1 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  var MINUS = '−';
  var signed = function (v, f) { return (v > 0.004 ? '+' : v < -0.004 ? MINUS : '± ') + f(Math.abs(v)); };

  /* ── Navigation: schwebt nach dem ersten Scrollen ───────────── */
  var nav = $('nav');
  var onScroll = function () { nav.classList.toggle('floating', window.scrollY > 24); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── Darstellung: System, Hell, Dunkel ─────────────────────── */
  var themeBtn = $('theme');
  var modes = ['system', 'light', 'dark'];
  var labels = { system: 'System', light: 'Hell', dark: 'Dunkel' };
  var currentMode = function () { return root.dataset.theme === 'light' || root.dataset.theme === 'dark' ? root.dataset.theme : 'system'; };
  var showMode = function (m) { themeBtn.dataset.mode = m; themeBtn.setAttribute('aria-label', 'Darstellung: ' + labels[m]); themeBtn.title = 'Darstellung: ' + labels[m]; };
  showMode(currentMode());
  themeBtn.addEventListener('click', function () {
    var next = modes[(modes.indexOf(currentMode()) + 1) % modes.length];
    if (next === 'system') delete root.dataset.theme; else root.dataset.theme = next;
    try { if (next === 'system') localStorage.removeItem('ml-theme'); else localStorage.setItem('ml-theme', next); } catch (e) { /* ohne Speicher gilt die Wahl nur für diesen Besuch */ }
    showMode(next);
  });

  /* ── Einblenden, gestaffelt je Schub ───────────────────────── */
  var staggers = document.querySelectorAll('.stagger');
  if ('IntersectionObserver' in window && !reduce) {
    var sio = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.style.setProperty('--d', (n++ * 90) + 'ms');
        e.target.classList.add('in');
        sio.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    staggers.forEach(function (el) { sio.observe(el); });
  } else {
    staggers.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── Bausteine für die Vorführungen ────────────────────────── */
  /* Zahl gleitet zum Ziel. */
  function count(el, from, to, fmt, dur) {
    if (reduce) { el.textContent = fmt(to); return; }
    var start = performance.now(); dur = dur || 520;
    (function step(now) {
      var k = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    })(start);
  }
  /* Wert über die Zeit fahren, für Regler, die sich selbst bewegen. */
  function drive(scene, dur, fn) {
    return new Promise(function (done) {
      var t = 0, last = performance.now();
      (function step(now) {
        var dt = now - last; last = now;
        if (scene.running()) t += dt;
        var k = Math.min(1, t / dur);
        fn(k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
        if (k < 1) requestAnimationFrame(step); else done();
      })(last);
    });
  }
  /* Eine Vorführung läuft nur, wenn sie zu sehen ist und niemand selbst bedient. */
  function Scene(el, run, still) {
    var self = this;
    this.visible = false; this.paused = false;
    this.running = function () { return self.visible && !self.paused && !document.hidden; };
    this.wait = function (ms) {
      return new Promise(function (done) {
        var t = 0, last = performance.now();
        (function step(now) {
          if (self.running()) t += now - last;
          last = now;
          if (t >= ms) done(); else requestAnimationFrame(step);
        })(last);
      });
    };
    still();
    if (reduce) return;
    var started = false;
    new IntersectionObserver(function (es) {
      self.visible = es[0].isIntersecting;
      if (self.visible && !started) { started = true; (async function loop() { for (;;) { await run(self); } })(); }
    }, { rootMargin: '10% 0px' }).observe(el);
  }
  function rel(el, box) {
    var a = el.getBoundingClientRect(), b = box.getBoundingClientRect();
    return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
  }
  function moveCursor(cur, x, y, instant) {
    if (instant) { cur.style.transition = 'none'; }
    cur.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    if (instant) { void cur.offsetWidth; cur.style.transition = ''; }
  }
  function tap(cur) { cur.classList.remove('click'); void cur.offsetWidth; cur.classList.add('click'); }

  /* Beispielrezepte wie die Vorlagen der App: Kaffee 23 € je kg, Kuhmilch 1,35 € je Liter,
     Hafermilch 1,87 € je Liter. Alles netto. Die Getränke hier sind im Haus verkauft (19 %),
     deshalb ohne Becher und Deckel; die zählen in der App nur außer Haus. */
  var KG = 23, MILCH = 1.35, HAFER = 1.87;
  var DRINKS = [
    { n: 'Espresso', p: 2.40, k: 9, m: 0, h: 0 },
    { n: 'Americano', p: 3.20, k: 18, m: 0, h: 0 },
    { n: 'Cappuccino', p: 3.60, k: 9, m: 200, h: 0 },
    { n: 'Flat White', p: 3.90, k: 18, m: 200, h: 0 },
    { n: 'Latte Macchiato', p: 3.90, k: 18, m: 300, h: 0 },
    { n: 'Hafer Cappuccino', p: 4.10, k: 9, m: 0, h: 200 },
  ];
  function cost(d, kg) { return d.k * (kg || KG) / 1000 + d.m * MILCH / 1000 + d.h * HAFER / 1000; }
  function netto(d, p) { return (p || d.p) / 1.19; }

  /* ── Hero: Datei rein, Deckungsbeitrag je Getränk, Treppe ──── */
  (function hero() {
    var stage = $('hero-stage');
    var rowsEl = $('hs-rows'), stepsEl = $('hs-steps'), pop = $('hs-pop'), cur = $('hs-cursor');
    var drop = $('hs-drop'), file = $('hs-file');
    var maxDb = 3;
    rowsEl.innerHTML = DRINKS.map(function (d, i) {
      return '<button type="button" class="hrow" data-i="' + i + '"><span class="nm">' + d.n + '</span><span class="mut">' + eur2.format(netto(d)) +
        '</span><span class="mut">' + eur2.format(cost(d)) + '</span><span class="db"><span class="v">' + eur2.format(netto(d) - cost(d)) + '</span><span class="bar"><i></i></span></span></button>';
    }).join('');
    var rows = Array.prototype.slice.call(rowsEl.children);

    /* Monat September der Beispieldaten: Nettoumsatz, Wareneinsatz, Personal, übrige Kosten. */
    var STEPS = [
      { l: 'Umsatz', v: 6362.45, t: 'pos' }, { l: 'Ware', v: -1385.58, t: 'neg' }, { l: 'bleibt', v: 4976.87, t: 'sum' },
      { l: 'Personal', v: -2600, t: 'neg' }, { l: 'bleibt', v: 2376.87, t: 'sum' }, { l: 'Übrige', v: -1989, t: 'neg' }, { l: 'Ergebnis', v: 387.87, t: 'sum' },
    ];
    var max = 6362.45, level = 0;
    stepsEl.innerHTML = STEPS.map(function (s) {
      var bottom, height, top;
      if (s.t === 'neg') { height = -s.v; bottom = level - height; top = level; level = bottom; }
      else { height = s.v; bottom = 0; top = s.v; level = s.v; }
      var b = bottom / max * 100, h = Math.max(1.2, height / max * 100), tp = top / max * 100;
      var txt = (s.v < 0 ? MINUS : '') + int.format(Math.abs(s.v));
      return '<div class="stp ' + s.t + '"><div class="stp-col"><span class="stp-bar" style="bottom:' + b + '%;height:' + h + '%"></span><span class="stp-val" style="bottom:calc(' + tp + '% + 4px)">' + txt + '</span></div><span class="stp-lab">' + s.l + '</span></div>';
    }).join('');
    var steps = Array.prototype.slice.call(stepsEl.children);

    function popFor(i) {
      var d = DRINKS[i], c = cost(d);
      var lines = '<p class="pt">' + d.n + '</p><p>Preis ohne Steuer <b>' + eur2.format(netto(d)) + '</b></p>' +
        '<p>Kaffee ' + d.k + ' g <b>' + MINUS + eur2.format(d.k * KG / 1000) + '</b></p>' +
        (d.m ? '<p>Kuhmilch ' + d.m + ' ml <b>' + MINUS + eur2.format(d.m * MILCH / 1000) + '</b></p>' : '') +
        (d.h ? '<p>Hafermilch ' + d.h + ' ml <b>' + MINUS + eur2.format(d.h * HAFER / 1000) + '</b></p>' : '') +
        '<p class="pdb">Deckungsbeitrag <b>' + eur2.format(netto(d) - c) + '</b></p>';
      pop.innerHTML = lines;
      var r = rel(rows[i], stage), sw = stage.clientWidth, sh = stage.clientHeight, ph = pop.offsetHeight, pw = pop.offsetWidth;
      var x, y;
      if (sw > 720) {
        /* Breit: neben der Zeile, über dem rechten Rand der Liste. */
        x = Math.min(r.x + r.w - 56, sw - pw - 12);
        y = Math.min(Math.max(48, r.y + r.h / 2 - ph / 2), sh - ph - 12);
      } else {
        x = Math.min(Math.max(12, r.x + r.w * .3), sw - pw - 12);
        y = r.y + r.h + 6;
        if (y + ph > sh - 8) y = r.y - ph - 6;
      }
      /* Nie über einer Überschrift. Schmal erst unter, dann über der Zeile versuchen (über der Tabelle
         darf sie liegen); sonst rückt sie unter die Überschrift, die sie treffen würde. */
      var heads = Array.prototype.map.call(stage.querySelectorAll('.hs-head, .hl-head, .hs-sub'), function (e) { return rel(e, stage); });
      var hits = function (yy) { return heads.filter(function (hb) { return x < hb.x + hb.w && x + pw > hb.x && yy < hb.y + hb.h && yy + ph > hb.y; }); };
      if (sw <= 720) {
        var below = r.y + r.h + 6, above = r.y - ph - 6;
        if (!hits(below).length && below + ph <= sh - 8) y = below;
        else if (!hits(above).length && above >= 0) y = above;
      }
      for (var h = 0, hh; h < 3 && (hh = hits(y)).length; h++) y = hh[0].y + hh[0].h + 6;
      y = Math.max(8, y); /* nie über den oberen Fensterrand, z.B. während die Fensterhöhe sich anpasst */
      pop.style.left = x + 'px'; pop.style.top = y + 'px';
      rows.forEach(function (row, j) { row.classList.toggle('hl', j === i); });
      pop.classList.add('on');
    }
    function popOff() { pop.classList.remove('on'); rows.forEach(function (row) { row.classList.remove('hl'); }); }
    var resumeT = 0;
    function take() { clearTimeout(resumeT); if (scene) scene.paused = true; cur.classList.remove('on'); }
    function later(ms) { clearTimeout(resumeT); resumeT = setTimeout(function () { popOff(); if (view !== 'uebersicht') setView('uebersicht'); if (scene) scene.paused = false; }, ms); }

    function showRow(row, i, animate) {
      row.classList.add('in');
      var d = DRINKS[i], db = netto(d) - cost(d);
      row.querySelector('.bar i').style.transform = 'scaleX(' + (db / maxDb) + ')';
      if (animate) count(row.querySelector('.v'), 0, db, function (v) { return eur2.format(v); }, 560);
    }
    function still() {
      drop.classList.add('done');
      rows.forEach(function (r, i) { showRow(r, i, false); });
      steps.forEach(function (s) { s.classList.add('in'); });
    }
    function reset() {
      if (typeof setView === 'function') setView('uebersicht');
      if (typeof preisrunde === 'function') { szM.value = '84'; preisrunde(10); rezept(2, false); }
      popOff(); cur.classList.remove('on');
      drop.classList.remove('done', 'hot'); file.className = 'file';
      rows.forEach(function (r) { r.classList.remove('in'); r.querySelector('.bar i').style.transform = 'scaleX(0)'; });
      steps.forEach(function (s) { s.classList.remove('in'); });
    }


    /* ── Weitere Bereiche im Fenster: Importe, Produkte, Rezepte, Kosten, Szenarien ──
       Nachgebaut nach den Ansichten der App, mit denselben Beispieldaten wie Hero, Rechner und Szenen. */
    var tabsBox = $('ws-tabs'), thumb = tabsBox.querySelector('.ws-thumb');
    var tabs = Array.prototype.slice.call(tabsBox.querySelectorAll('.ws-item'));
    var wviews = Array.prototype.slice.call(stage.querySelectorAll('.wview'));
    var view = 'uebersicht';
    var row = function (cells, cls) { return '<div class="wv-row' + (cls ? ' ' + cls : '') + '">' + cells.map(function (c) { return '<span>' + c + '</span>'; }).join('') + '</div>'; };
    var tag = function (cls, text) { return '<span class="tag ' + cls + '"><i></i>' + text + '</span>'; };

    /* Importe: drei Monate, zwei aus Dateien, der laufende aus der Kasse. */
    $('wv-imp-metrics').innerHTML = '<div><span>Monate</span><b>3</b></div><div><span>Verkäufe gesamt</span><b>5.721</b></div><div><span>Umsatz brutto gesamt</span><b>19.508,86 €</b></div>';
    /* Umsatz je Monat wie im Diagramm der Übersicht: Oktober läuft, Rest als Prognose mit dem Tempo aus September. */
    $('wv-imp-chart').innerHTML = [['Aug', 6957, 0, 'aus Datei'], ['Sep', 7417, 0, 'aus Datei'], ['Okt', 5134.86, 7702.29, 'Kasse, läuft']].map(function (m) {
      var MAXI = 8000;
      return '<div class="wm"><span class="wm-col"><i class="wm-ist" style="--h:' + (m[1] / MAXI) + '"></i>' + (m[2] ? '<i class="wm-prog" style="--h:' + ((m[2] - m[1]) / MAXI) + ';--b:' + (m[1] / MAXI) + '"></i>' : '') + '</span><b>' + eur0.format(m[2] || m[1]) + '</b><span class="wm-l">' + m[0] + ' · ' + m[3] + '</span></div>';
    }).join('');
    $('wv-imp-table').className = 'wv-table wv-imp';
    $('wv-imp-table').innerHTML = row(['Monat', 'Quelle', 'Verkäufe', 'Brutto'], 'head') +
      row(['<b>Oktober 2026</b><small>01.10. bis 21.10., läuft</small>', tag('kasse', 'aus der Kasse'), '1.506', '5.134,86 €']) +
      row(['<b>September 2026</b><small>wird angezeigt</small>', tag('', 'beispielcafe_export-2026-09.csv'), '2.175', '7.417,00 €']) +
      row(['<b>August 2026</b><small>01.08. bis 31.08.</small>', tag('', 'beispielcafe_export-2026-08.csv'), '2.040', '6.957,00 €']);

    /* Produkte: Preis und Satz aus der Kasse, was je Stück im Haus bleibt. */
    var QTY = { Espresso: 310, Americano: 245, Cappuccino: 545, 'Flat White': 265, 'Latte Macchiato': 175, 'Hafer Cappuccino': 195 };
    $('wv-prod-table').className = 'wv-table wv-prod';
    $('wv-prod-table').innerHTML = row(['Artikel', 'Preis', 'Steuersatz', 'Verkauft', 'Bleibt je Stück'], 'head') +
      DRINKS.map(function (d) {
        return row(['<b>' + d.n + '</b>', eur2.format(d.p), d.n === 'Cappuccino' ? '19 % und 7 %' : '19 %', int.format(QTY[d.n]), '<span class="db">' + eur2.format(netto(d) - cost(d)) + '</span><span class="wv-bar"><i style="--s:' + ((netto(d) - cost(d)) / 3).toFixed(3) + '"></i></span>']);
      }).join('') +
      row(['<b>Croissant</b>', '2,80 €', '7 %', '215', tag('miss', 'Fehlt noch')]);

    /* Rezepte: Zutaten je Getränk, Becher und Deckel nur außer Haus. */
    var pick = $('wv-rz-pick'), card = $('wv-rz-card'), rzIdx = 2;
    pick.innerHTML = DRINKS.map(function (d, i) { return '<button type="button" data-i="' + i + '" aria-pressed="' + (i === rzIdx) + '">' + d.n + '</button>'; }).join('');
    function rezept(i, animate) {
      rzIdx = i;
      var d = DRINKS[i], c = cost(d);
      pick.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.i) === i)); });
      card.innerHTML = row(['Kaffee', d.k + ' g zu ' + eur2.format(KG) + ' je kg', eur2.format(d.k * KG / 1000)]) +
        (d.m ? row(['Kuhmilch', d.m + ' ml zu ' + eur2.format(MILCH) + ' je l', eur2.format(d.m * MILCH / 1000)]) : '') +
        (d.h ? row(['Hafermilch', d.h + ' ml zu ' + eur2.format(HAFER) + ' je l', eur2.format(d.h * HAFER / 1000)]) : '') +
        row(['Becher und Deckel', 'nur außer Haus', eur2.format(0.10)]) +
        (function () {
          var parts = [['Kaffee', d.k * KG / 1000, 'k'], [d.h ? 'Hafermilch' : 'Milch', (d.m * MILCH + d.h * HAFER) / 1000, 'm'], ['Becher', 0.10, 'b']].filter(function (x) { return x[1] > 0; });
          var tot = parts.reduce(function (t, x) { return t + x[1]; }, 0);
          return '<div class="wv-split" aria-hidden="true"><p class="wv-split-bar">' + parts.map(function (x) { return '<i class="sp-' + x[2] + '" style="flex-grow:' + (x[1] / tot * 100).toFixed(1) + '"></i>'; }).join('') + '</p><p class="wv-split-l">' + parts.map(function (x) { return '<span><i class="sp-' + x[2] + '"></i>' + x[0] + ' ' + Math.round(x[1] / tot * 100) + ' %</span>'; }).join('') + '</p></div>';
        })() +
        '<div class="wv-rz-foot"><div><span>Einkauf im Haus</span><b>' + eur2.format(c) + '</b></div><div><span>Einkauf außer Haus</span><b>' + eur2.format(c + 0.10) + '</b></div></div>';
      if (animate && !reduce) { card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap'); }
      if (typeof wbox !== 'undefined' && wbox && view === 'rezepte') fitHeight(true);
    }
    rezept(rzIdx, false);
    pick.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; take(); rezept(Number(b.dataset.i), true); });

    /* Kosten: Blöcke mit Stand; zusammen 4.589 €, wie in Treppe und Prognose. */
    var KOST = [['Personal', 2600, 'ok'], ['Miete', 1450, 'ok'], ['Wasser', null, 'in'], ['Strom', 180, 'est'], ['Kasse und Software', 59, 'ok'], ['Reinigung und Verbrauch', 120, 'est'], ['Steuerberatung', 180, 'ok']];
    var STAND = { ok: tag('ok', 'Bestätigt'), est: tag('est', 'Geschätzt'), 'in': tag('', 'Enthalten') };
    var KSUM = 4589;
    $('wv-kost-bar').innerHTML = '<p class="kb-head"><span>7 Blöcke mit Stand, keiner fehlt</span><b>' + eur0.format(KSUM) + ' im Monat</b></p><p class="kb-bar">' +
      KOST.filter(function (k) { return k[1]; }).map(function (k) { return '<i class="kb-' + k[2] + '" style="flex-grow:' + k[1] + '" title="' + k[0] + '"></i>'; }).join('') +
      '</p><p class="kb-l"><span><i class="kb-ok"></i>Bestätigt ' + eur0.format(2600 + 1450 + 59 + 180) + '</span><span><i class="kb-est"></i>Geschätzt ' + eur0.format(180 + 120) + '</span></p>';
    $('wv-kost-table').className = 'wv-table wv-kost';
    $('wv-kost-table').innerHTML = row(['Block', 'Im Monat', 'Stand'], 'head') +
      KOST.map(function (k) { return row(['<b>' + k[0] + '</b>', k[1] === null ? '<small>in Miete</small>' : eur2.format(k[1]), STAND[k[2]]]); }).join('') +
      '<div class="wv-sum"><span>Zusammen im Monat</span><span>' + eur2.format(4589) + '</span></div>';

    /* Szenarien wie in der App: ein Monat, zwei Hebel. Preisrunde ändert das Netto je Stück (Menge gleich),
       Getränke je Verkaufstag strecken den Monat. Heute: 387,87 € bei 84 am Tag. */
    var SZ = [['Espresso', 310, .19], ['Americano', 245, .19], ['Cappuccino', 330, .19], ['Cappuccino außer Haus', 215, .07], ['Flat White', 265, .19], ['Latte Macchiato', 175, .19], ['Hafer Cappuccino', 195, .19]];
    var DB1 = 4976.87, FIXK = 4589, HEUTE = 387.87, TAG = 84;
    var szR = $('wv-sz-range'), szOut = $('wv-sz-out'), szM = $('wv-sz-menge'), szMOut = $('wv-sz-menge-out');
    var szPlus = $('wv-sz-plus'), szRes = $('wv-sz-res'), szB = $('wv-sz-b'), szList = $('wv-sz-list'), barA = $('wv-sz-bar-a'), barB = $('wv-sz-bar-b');
    szList.innerHTML = SZ.map(function (z) { return '<p><span>' + z[0] + '</span><i class="wv-bar"><i></i></i><b>± 0 €</b></p>'; }).join('');
    var szRows = Array.prototype.slice.call(szList.children), szShown = { res: 535.69 };
    function paintR(el, min, max) { el.style.setProperty('--p', ((Number(el.value) - min) / (max - min) * 100) + '%'); }
    function szenario(animate) {
      var c = Number(szR.value) / 100, x = Number(szM.value), f = x / TAG, plus = 0;
      szRows.forEach(function (row, i) {
        var z = SZ[i], v = z[1] * c / (1 + z[2]) * f; plus += v;
        row.querySelector('b').textContent = signed(v, function (y) { return eur0.format(y); });
        row.querySelector('.wv-bar i').style.setProperty('--s', Math.min(1, v / 45).toFixed(3));
      });
      var res = (DB1 * f + plus) - FIXK, d = res - HEUTE;
      paintR(szR, 0, 50); paintR(szM, 70, 110);
      szOut.textContent = c ? '+' + Math.round(c * 100) + ' Cent' : '0 Cent';
      szMOut.textContent = int.format(x);
      szPlus.textContent = signed(d, function (y) { return eur0.format(y); }) + ' gegen heute';
      szPlus.className = d > 0.5 ? 'up' : d < -0.5 ? 'down' : '';
      var SCALE = 1200;
      barA.style.setProperty('--s', Math.max(0, HEUTE / SCALE).toFixed(3));
      barB.style.setProperty('--s', Math.max(0, Math.min(1, res / SCALE)).toFixed(3));
      barB.classList.toggle('neg', res < 0);
      var from = szShown.res; szShown.res = res;
      if (!animate || reduce) { szRes.textContent = eur2.format(res); szB.textContent = eur2.format(res); return; }
      var t0 = performance.now();
      (function step(now) { var k = Math.min(1, (now - t0) / 320), e = 1 - Math.pow(1 - k, 3), v = from + (res - from) * e; szRes.textContent = eur2.format(v); szB.textContent = eur2.format(v); if (k < 1 && szShown.res === res) requestAnimationFrame(step); })(t0);
    }
    function preisrunde(cent) { szR.value = String(cent); szenario(true); }
    szenario(false);
    szR.addEventListener('input', function () { take(); szenario(true); });
    szM.addEventListener('input', function () { take(); szenario(true); });

    function placeThumb() {
      var t = tabs.filter(function (b) { return b.dataset.view === view; })[0]; if (!t) return;
      thumb.style.width = t.offsetWidth + 'px'; thumb.style.height = t.offsetHeight + 'px';
      thumb.style.transform = 'translate(' + t.offsetLeft + 'px,' + t.offsetTop + 'px)';
    }
    function setView(v) {
      if (v === view) return;
      view = v; popOff();
      tabs.forEach(function (b) { var on = b.dataset.view === v; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      wviews.forEach(function (w) {
        var on = w.dataset.view === v;
        w.classList.toggle('on', on); w.inert = !on; w.classList.remove('enter');
        if (on && !reduce) { void w.offsetWidth; w.classList.add('enter'); }
      });
      placeThumb();
      fitHeight(true);
    }
    var wbox = stage.querySelector('.wviews');
    function fitHeight(animate) {
      var act = wviews.filter(function (w) { return w.dataset.view === view; })[0]; if (!act) return;
      var to = act.offsetHeight;
      if (!animate || reduce) { wbox.style.transition = 'none'; wbox.style.height = to + 'px'; void wbox.offsetWidth; wbox.style.transition = ''; return; }
      wbox.style.height = to + 'px';
    }
    placeThumb();
    fitHeight(false);
    window.addEventListener('resize', function () { fitHeight(false); });
    window.addEventListener('resize', placeThumb);
    tabs.forEach(function (b, k) {
      b.addEventListener('click', function () { take(); setView(b.dataset.view); if (!hover) later(8000); });
      b.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        var n = (k + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
        take(); setView(tabs[n].dataset.view); tabs[n].focus();
      });
    });

    var hover = window.matchMedia('(hover: hover)').matches;
    var scene = new Scene(stage, async function (sc) {
      reset();
      await sc.wait(500);
      file.className = 'file fly'; await sc.wait(420);
      drop.classList.add('hot'); file.className = 'file land'; await sc.wait(520);
      file.className = 'file gone'; drop.classList.remove('hot'); drop.classList.add('done'); await sc.wait(260);
      for (var i = 0; i < rows.length; i++) { showRow(rows[i], i, true); await sc.wait(130); }
      await sc.wait(200);
      for (var j = 0; j < steps.length; j++) { steps[j].classList.add('in'); await sc.wait(110); }
      await sc.wait(700);
      var order = [2, 5];
      moveCursor(cur, stage.clientWidth * .55, stage.clientHeight + 20, true);
      cur.classList.add('on');
      for (var k = 0; k < order.length; k++) {
        var r = rel(rows[order[k]], stage);
        moveCursor(cur, r.x + r.w * .3, r.y + r.h * .5);
        await sc.wait(760); tap(cur); popFor(order[k]);
        await sc.wait(2600); popOff(); await sc.wait(200);
      }
      /* Kurzer Blick in zwei andere Bereiche, dann zurück zur Übersicht. */
      var visit = async function (name) {
        var t = rel($('wt-' + name), stage);
        moveCursor(cur, t.x + Math.min(t.w * .4, 40), t.y + t.h * .55);
        await sc.wait(700); tap(cur); setView(name);
      };
      await visit('rezepte');
      await sc.wait(900);
      var hb = rel(pick.querySelector('[data-i="5"]'), stage);
      moveCursor(cur, hb.x + Math.min(hb.w * .4, 40), hb.y + hb.h * .55);
      await sc.wait(700); tap(cur); rezept(5, true);
      await sc.wait(2200);
      await visit('szenarien');
      await sc.wait(700);
      var rr = rel(szR, stage);
      moveCursor(cur, rr.x + 4, rr.y + rr.h * .5);
      await sc.wait(600);
      for (var c = 20; c <= 30; c += 10) { moveCursor(cur, rr.x + rr.w * c / 50, rr.y + rr.h * .5); await sc.wait(450); preisrunde(c); }
      await sc.wait(2400);
      await visit('uebersicht');
      await sc.wait(400);
      moveCursor(cur, stage.clientWidth * .9, stage.clientHeight + 30);
      await sc.wait(500); cur.classList.remove('on');
      await sc.wait(2200);
    }, still);

    /* Übernehmen: Maus oder Finger auf einem Artikel hält die Vorführung an. */
    rows.forEach(function (row, i) {
      var takeRow = function () { take(); if (row.classList.contains('in')) popFor(i); };
      row.addEventListener('pointerenter', takeRow);
      row.addEventListener('focus', takeRow);
      row.addEventListener('click', takeRow);
    });
    /* Nach Ruhe weiter: aus einem anderen Bereich erst zurück zur Übersicht. */
    var release = function () { later(view === 'uebersicht' ? 900 : 6000); };
    stage.addEventListener('pointerleave', release);
    rowsEl.addEventListener('focusout', release);
  })();

  /* ── Szene 1: Import mit Prüfung ───────────────────────────── */
  (function importScene() {
    var el = $('sc-import'), csv = $('si-csv'), checks = $('si-checks'), sum = $('si-sum'), btn = $('si-btn'), toast = $('si-toast'), cur = $('si-cursor'), name = $('si-name');
    var HEAD = 'artikel_bezeichnung;artikel_menge;steuer_satz;artikel_summe;artikel_nettoSumme;steuer_summe';
    var GOOD = ['Espresso;310;19;744,00;625,21;118,79', 'Cappuccino;330;19;1188,00;998,32;189,68', 'Cappuccino;215;7;774,00;723,36;50,64', 'Flat White;265;19;1033,50;868,49;165,01', 'Croissant;215;7;602,00;562,62;39,38'];
    var BAD = GOOD.slice(); BAD[3] = 'Flat White;265;19;1033,50;886,49;165,01';
    var ICON = {
      ok: '<svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      warn: '<svg viewBox="0 0 16 16"><path d="M8 4v5M8 11.6v.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      crit: '<svg viewBox="0 0 16 16"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    };
    var round = 0;
    function fill(bad) {
      name.textContent = bad ? 'export-2026-09-bearbeitet.csv' : 'beispielcafe_export-2026-09.csv';
      csv.innerHTML = '<p class="head">' + HEAD + '</p>' + (bad ? BAD : GOOD).map(function (l, i) { return '<p' + (bad && i === 3 ? ' class="bad"' : '') + '>' + l + '</p>'; }).join('');
      var list = bad
        ? [['ok', 'Monat aus der Kasse gelesen'], ['crit', 'Summen passen nicht zur Kasse: Flat White']]
        : [['ok', 'Monat aus der Kasse gelesen'], ['ok', 'Summen stimmen mit der Kasse'], ['warn', 'Cappuccino im Haus und außer Haus: 19 % und 7 %']];
      checks.innerHTML = list.map(function (c) { return '<li class="' + c[0] + '"><span class="ic">' + ICON[c[0]] + '</span>' + c[1] + '</li>'; }).join('');
      sum.textContent = bad ? 'Wird nicht übernommen' : '2.175 Verkäufe · 7.417,00 € brutto';
      btn.classList.toggle('off', bad);
      toast.innerHTML = bad
        ? '<svg viewBox="0 0 16 16" style="color:var(--crit)"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Nicht übernommen, damit nichts falsch gerechnet wird.'
        : '<svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>September 2026 übernommen.';
    }
    function still() {
      fill(false);
      csv.querySelectorAll('p').forEach(function (p) { p.classList.add('in'); });
      checks.querySelectorAll('li').forEach(function (li) { li.classList.add('in'); });
    }
    new Scene(el, async function (sc) {
      var bad = round++ % 2 === 1;
      toast.classList.remove('on'); cur.classList.remove('on');
      fill(bad);
      sum.style.opacity = 0;
      await sc.wait(400);
      var ps = csv.querySelectorAll('p');
      for (var i = 0; i < ps.length; i++) { ps[i].classList.add('in'); await sc.wait(150); }
      await sc.wait(250);
      var lis = checks.querySelectorAll('li');
      for (var j = 0; j < lis.length; j++) { lis[j].classList.add('in'); await sc.wait(420); }
      sum.style.opacity = 1;
      await sc.wait(500);
      if (!bad) {
        moveCursor(cur, el.clientWidth * .5, el.clientHeight + 20, true);
        cur.classList.add('on');
        var r = rel(btn, el);
        moveCursor(cur, r.x + r.w * .55, r.y + r.h * .55);
        await sc.wait(760); tap(cur); btn.classList.add('press'); await sc.wait(130); btn.classList.remove('press');
        await sc.wait(120);
        cur.classList.remove('on');
      }
      toast.classList.add('on');
      await sc.wait(2600);
      toast.classList.remove('on');
      csv.querySelectorAll('p').forEach(function (p) { p.classList.remove('in'); });
      checks.querySelectorAll('li').forEach(function (li) { li.classList.remove('in'); });
      await sc.wait(500);
    }, still);
  })();

  /* ── Szene 2: Hebel Einkauf und Verkaufspreis ──────────────── */
  (function hebelScene() {
    var el = $('sc-hebel'), list = $('sh-drinks'), knob = $('sh-knob'), fill = $('sh-fill'), label = $('sh-label'), value = $('sh-value'), month = $('sh-month'), toggle = $('sh-toggle');
    var five = DRINKS.slice(0, 5);
    /* Mengen im Beispielmonat, für die Wirkung im Monat. Cappuccino ist mit 19 % und 7 % gebucht. */
    var QTY_GRAMS = 310 * 9 + 245 * 18 + 545 * 9 + 265 * 18 + 175 * 18 + 195 * 9 + 130 * 18;
    var CAP_NETTO_PER_EUR = 330 / 1.19 + 215 / 1.07;
    list.innerHTML = five.map(function (d) { return '<div class="drink"><span>' + d.n + '</span><span class="chip">' + '± 0,00 €' + '</span><b>' + eur2.format(netto(d) - cost(d)) + '</b></div>'; }).join('');
    var rows = Array.prototype.slice.call(list.children);
    knob.style.transition = 'none'; fill.style.transition = 'none';
    function setTrack(f) {
      var w = knob.parentNode.clientWidth;
      knob.style.transform = 'translateX(' + (f * w) + 'px)';
      fill.style.transform = 'scaleX(' + f + ')';
    }
    function einkauf(kg) {
      value.textContent = eur2.format(kg);
      setTrack((kg - 15) / 20);
      five.forEach(function (d, i) {
        var base = netto(d) - cost(d), now = netto(d) - cost(d, kg), dd = now - base;
        rows[i].querySelector('b').textContent = eur2.format(now);
        var chip = rows[i].querySelector('.chip');
        chip.textContent = signed(dd, function (v) { return eur2.format(v); });
        chip.className = 'chip' + (dd < -0.004 ? ' down' : dd > 0.004 ? ' up' : '');
      });
      var m = -QTY_GRAMS * (kg - KG) / 1000;
      month.textContent = signed(m, function (v) { return eur0.format(v); });
      month.className = 'delta' + (m < -0.5 ? ' down' : m > 0.5 ? ' up' : '');
    }
    function preis(p) {
      value.textContent = eur2.format(p);
      setTrack((p - 2.5) / 2.5);
      var d = five[2], base = netto(d) - cost(d), now = netto(d, p) - cost(d), dd = now - base;
      rows[2].querySelector('b').textContent = eur2.format(now);
      var chip = rows[2].querySelector('.chip');
      chip.textContent = signed(dd, function (v) { return eur2.format(v); });
      chip.className = 'chip' + (dd > 0.004 ? ' up' : '');
      var m = (p - d.p) * CAP_NETTO_PER_EUR;
      month.textContent = signed(m, function (v) { return eur0.format(v); });
      month.className = 'delta' + (m > 0.5 ? ' up' : '');
    }
    function mode(m) {
      toggle.dataset.pos = m === 'preis' ? '1' : '0';
      label.textContent = m === 'preis' ? 'Cappuccino, Verkaufspreis brutto' : 'Kaffeebohnen je kg, netto';
      rows.forEach(function (r, i) { r.classList.toggle('hl', m === 'preis' && i === 2); });
    }
    function still() { mode('einkauf'); einkauf(KG); }
    window.addEventListener('resize', function () { if (toggle.dataset.pos === '0') einkauf(Number(value.dataset.kg || KG)); });
    new Scene(el, async function (sc) {
      mode('einkauf'); einkauf(KG);
      await sc.wait(900);
      knob.classList.add('grab');
      await drive(sc, 1700, function (k) { var kg = KG + k * 4.6; value.dataset.kg = kg; einkauf(kg); });
      knob.classList.remove('grab');
      await sc.wait(2200);
      knob.classList.add('grab');
      await drive(sc, 900, function (k) { var kg = KG + (1 - k) * 4.6; value.dataset.kg = kg; einkauf(kg); });
      knob.classList.remove('grab');
      await sc.wait(700);
      mode('preis'); preis(3.6);
      await sc.wait(900);
      knob.classList.add('grab');
      await drive(sc, 1300, function (k) { preis(Math.round((3.6 + k * 0.3) * 100) / 100); });
      knob.classList.remove('grab');
      await sc.wait(2400);
      await drive(sc, 800, function (k) { preis(Math.round((3.9 - k * 0.3) * 100) / 100); });
      await sc.wait(500);
    }, still);
  })();

  /* ── Szene 3: Prognose und Gewinnschwelle ──────────────────── */
  (function prognoseScene() {
    var el = $('sc-prognose'), barsEl = $('sp-bars'), poly = $('sp-poly'), cover = $('sp-cover');
    var result = $('sp-result'), now = $('sp-now'), lever = $('sp-lever'), knob = $('sp-knob'), fill = $('sp-fill');
    /* Beispielmonate: Ist August und September; Prognose mit dem Tempo aus September
       (285,27 € brutto je Kassentag) und Montag bis Samstag als Verkaufstage, ohne Feiertage. */
    var MONTHS = [['Aug', 6957, 1], ['Sep', 7417, 1], ['Okt', 27], ['Nov', 25], ['Dez', 27], ['Jan', 26], ['Feb', 24], ['Mär', 27]];
    var MAX = 9000, TEMPO = 285.27;
    var vals = MONTHS.map(function (m) { return m.length === 3 ? m[1] : m[1] * TEMPO; });
    barsEl.innerHTML = MONTHS.map(function (m) { return '<div class="cb ' + (m.length === 3 ? 'ist' : 'prog') + '"><i></i><span>' + m[0] + '</span></div>'; }).join('');
    var bars = Array.prototype.slice.call(barsEl.querySelectorAll('i'));
    poly.setAttribute('points', vals.map(function (v, i) { return i < 2 ? null : ((i + .5) / 8 * 100) + ',' + (100 - v / MAX * 100); }).filter(Boolean).join(' '));
    /* Ergebnis: Deckungsbeitrag I mal Menge minus Fixkosten. Gewinnschwelle bleibt 78, weil
       Deckungsbeitrag je Getränk und Fixkosten gleich bleiben; es steigt nur die Menge. */
    var DB1 = 4976.87, FIX = 4589, PER_DAY = 2175 / 26;
    knob.style.transition = 'none'; fill.style.transition = 'none';
    function setBars(x, live) {
      bars.forEach(function (b, i) {
        b.style.transition = live ? 'none' : '';
        b.style.transform = 'scaleY(' + (vals[i] * (i < 2 ? 1 : 1 + x) / MAX) + ')';
      });
    }
    function lev(x) {
      var w = knob.parentNode.clientWidth, f = .5 + x / .4;
      knob.style.transform = 'translateX(' + (f * w) + 'px)';
      fill.style.transform = 'scaleX(' + f + ')';
      lever.textContent = x > 0.0005 ? '+' + int.format(x * 100) + ' %' : '± 0 %';
      result.textContent = eur2.format(DB1 * (1 + x) - FIX);
      now.textContent = int.format(PER_DAY * (1 + x));
    }
    function still() { setBars(0); lev(0); cover.classList.remove('hide'); cover.style.transform = 'scaleX(0)'; }
    new Scene(el, async function (sc) {
      bars.forEach(function (b) { b.style.transition = 'none'; b.style.transform = 'scaleY(0)'; });
      void el.offsetWidth;
      cover.classList.add('hide'); cover.style.transform = ''; lev(0);
      await sc.wait(400);
      for (var i = 0; i < bars.length; i++) {
        bars[i].style.transition = ''; bars[i].style.transform = 'scaleY(' + (vals[i] / MAX) + ')';
        await sc.wait(i === 1 ? 260 : 90);
      }
      await sc.wait(250);
      cover.classList.remove('hide'); cover.style.transform = 'scaleX(0)';
      await sc.wait(1300);
      knob.classList.add('grab');
      await drive(sc, 1500, function (k) { var x = .1 * k; setBars(x, true); lev(x); });
      knob.classList.remove('grab');
      await sc.wait(2800);
      await drive(sc, 900, function (k) { var x = .1 * (1 - k); setBars(x, true); lev(x); });
      await sc.wait(900);
    }, still);
  })();

  /* ── Im Alltag: Report, Belege, Rezepte als Reiter ─────────── */
  (function alltag() {
    var box = $('moments'); if (!box) return;
    var tabs = Array.prototype.slice.call(box.querySelectorAll('.moment'));
    var bars = tabs.map(function (t) { return t.querySelector('.moment-bar i'); });
    var copies = Array.prototype.slice.call(document.querySelectorAll('.mcopy'));
    var scenes = tabs.map(function (t, i) { return $('mp-' + i); });
    var STOP = {}, tok = { c: false }, idx = 0, auto = !reduce, visible = false, t = 0, D = 11000;
    function wait(ms, tk) {
      return new Promise(function (done, fail) {
        var acc = 0, last = performance.now();
        (function step(now) {
          if (tk.c) { fail(STOP); return; }
          if (visible && !document.hidden) acc += now - last;
          last = now;
          if (acc >= ms) done(); else requestAnimationFrame(step);
        })(last);
      });
    }

    /* Report: Befunde erscheinen, dann PDF sichern. */
    var rp = { finds: Array.prototype.slice.call($('rp-finds').children), sheet: $('rp-sheet'), btn: $('rp-btn'), cur: $('rp-cursor') };
    function rpStill() { rp.finds.forEach(function (f) { f.classList.add('in'); }); rp.sheet.classList.add('on'); rp.btn.textContent = 'Als PDF gesichert'; }
    function rpReset() { rp.finds.forEach(function (f) { f.classList.remove('in'); }); rp.sheet.classList.remove('on'); rp.cur.classList.remove('on'); rp.btn.textContent = 'Als PDF sichern'; }
    async function rpPlay(tk) {
      await wait(400, tk);
      for (var i = 0; i < rp.finds.length; i++) { rp.finds[i].classList.add('in'); await wait(700, tk); }
      await wait(800, tk);
      var el = scenes[0];
      moveCursor(rp.cur, el.clientWidth * .5, el.clientHeight + 20, true); rp.cur.classList.add('on');
      var r = rel(rp.btn, el); moveCursor(rp.cur, r.x + r.w * .5, r.y + r.h * .55);
      await wait(760, tk); tap(rp.cur); rp.btn.classList.add('press'); await wait(130, tk); rp.btn.classList.remove('press');
      rp.cur.classList.remove('on');
      rp.sheet.classList.add('on'); rp.btn.textContent = 'Als PDF gesichert';
    }

    /* Belege: Positionen lesen, Zutaten zuordnen, Summe prüfen, übernehmen. */
    var bl = { rows: Array.prototype.slice.call($('bl-rows').children), checks: $('bl-checks').children[0], btn: $('bl-btn'), toast: $('bl-toast'), cur: $('bl-cursor'), sum: $('bl-sum') };
    function blStill() { bl.rows.forEach(function (r) { r.classList.add('in', 'linked'); }); bl.rows[0].classList.add('changed'); bl.checks.classList.add('in'); bl.sum.style.opacity = 1; }
    function blReset() { bl.rows.forEach(function (r) { r.classList.remove('in', 'linked', 'changed'); }); bl.checks.classList.remove('in'); bl.toast.classList.remove('on'); bl.cur.classList.remove('on'); bl.sum.style.opacity = 0; }
    async function blPlay(tk) {
      await wait(400, tk);
      for (var i = 0; i < bl.rows.length; i++) { bl.rows[i].classList.add('in'); await wait(220, tk); }
      await wait(300, tk);
      for (var j = 0; j < bl.rows.length; j++) { bl.rows[j].classList.add('linked'); await wait(380, tk); }
      bl.rows[0].classList.add('changed');
      await wait(300, tk); bl.checks.classList.add('in'); bl.sum.style.opacity = 1;
      await wait(900, tk);
      var el = scenes[1];
      moveCursor(bl.cur, el.clientWidth * .5, el.clientHeight + 20, true); bl.cur.classList.add('on');
      var r = rel(bl.btn, el); moveCursor(bl.cur, r.x + r.w * .55, r.y + r.h * .55);
      await wait(760, tk); tap(bl.cur); bl.btn.classList.add('press'); await wait(130, tk); bl.btn.classList.remove('press');
      bl.cur.classList.remove('on'); bl.toast.classList.add('on');
    }

    /* Rezepte: Kuhmilch, dann Hafermilch als Variante. Rechnung wie im Hero, im Haus ohne Becher. */
    var rz = { name: $('rz-name'), tog: $('rz-toggle'), milk: $('rz-milk'), milkD: $('rz-milk-d'), milkV: $('rz-milk-v'), price: $('rz-price'), inn: $('rz-in'), out: $('rz-out'), note: $('rz-note') };
    var rzRow = rz.milk.parentNode;
    function rzSet(hafer) {
      var p = hafer ? 4.10 : 3.60, m = hafer ? 0.2 * HAFER : 0.2 * MILCH, k = 9 * KG / 1000, BECHER = 0.10;
      var inHaus = p / 1.19 - k - m, ausser = p / (hafer ? 1.19 : 1.07) - k - m - BECHER;
      rz.tog.dataset.pos = hafer ? '1' : '0';
      rz.name.textContent = hafer ? 'Hafer Cappuccino' : 'Cappuccino';
      rz.milk.textContent = hafer ? 'Hafermilch' : 'Kuhmilch';
      rz.milkD.textContent = '200 ml zu ' + eur2.format(hafer ? HAFER : MILCH) + ' je l';
      rz.milkV.textContent = eur2.format(m);
      rz.price.textContent = eur2.format(p);
      rz.inn.textContent = eur2.format(inHaus); rz.out.textContent = eur2.format(ausser);
      $('rz-out-s').textContent = (hafer ? '19 %' : '7 %') + ', mit Becher';
      rz.out.parentNode.classList.toggle('less', hafer);
      rz.note.textContent = hafer ? 'Außer Haus bleiben trotz 50 Cent Aufpreis weniger als beim Cappuccino mit Kuhmilch (' + eur2.format(3.60 / 1.07 - k - 0.2 * MILCH - BECHER) + '), weil Hafermilch immer mit 19 % zählt.' : '';
      if (!reduce) { rzRow.classList.remove('swap'); void rzRow.offsetWidth; rzRow.classList.add('swap'); }
    }
    async function rzPlay(tk) { rzSet(false); await wait(2600, tk); rzSet(true); }

    var SC = [
      { still: rpStill, reset: rpReset, play: rpPlay },
      { still: blStill, reset: blReset, play: blPlay },
      { still: function () { rzSet(true); }, reset: function () { rzSet(false); }, play: rzPlay },
    ];

    function go(i) {
      tok.c = true; tok = { c: false }; var tk = tok;
      idx = i; t = 0;
      tabs.forEach(function (b, k) { var on = k === i; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; bars[k].style.transform = 'scaleX(' + (on && !auto ? 1 : 0) + ')'; });
      copies.forEach(function (c, k) { c.classList.toggle('on', k === i); });
      scenes.forEach(function (s, k) { s.classList.toggle('on', k === i); });
      if (reduce) { SC[i].still(); return; }
      SC[i].reset();
      SC[i].play(tk).catch(function (e) { if (e !== STOP) throw e; });
    }
    tabs.forEach(function (b, k) {
      b.addEventListener('click', function () { auto = false; go(k); });
      b.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault(); auto = false;
        var n = (k + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length; go(n); tabs[n].focus();
      });
    });
    SC.forEach(function (sc) { sc.still(); });
    if ('IntersectionObserver' in window) {
      var begun = false;
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && !begun) { begun = true; go(0); } }, { threshold: 0.3 }).observe(scenes[0].parentNode);
    } else { visible = true; go(0); }
    var last = performance.now();
    (function tick(now) {
      var dt = now - last; last = now;
      if (auto && visible && !document.hidden) {
        t += dt; bars[idx].style.transform = 'scaleX(' + Math.min(1, t / D) + ')';
        if (t >= D) go((idx + 1) % tabs.length);
      }
      requestAnimationFrame(tick);
    })(last);
  })();

  /* ── Rechner: Tasse und Tasten ─────────────────────────────── */
  var ids = ['preis', 'bohne', 'milch', 'becher', 'menge', 'tage', 'fix'];
  var inputs = {};
  ids.forEach(function (id) { inputs[id] = $(id); });
  var ust = 0.19;

  function fmtInput(el) {
    var v = Number(el.value);
    switch (el.dataset.unit) {
      case 'eur': return eur2.format(v);
      case 'eur0': return eur0.format(v);
      case 'stk': return int.format(v) + ' Stück';
      case 'tage': return int.format(v) + ' Tage';
      default: return String(v);
    }
  }
  function paintRange(el) {
    var p = (Number(el.value) - Number(el.min)) / (Number(el.max) - Number(el.min)) * 100;
    el.style.setProperty('--p', p + '%');
    var out = document.querySelector('output[data-for="' + el.id + '"]');
    if (out) out.textContent = fmtInput(el);
  }

  var tweens = {};
  function tween(key, el, to, format) {
    var t = tweens[key] || (tweens[key] = { value: to });
    if (t.raf) cancelAnimationFrame(t.raf);
    var from = t.value;
    if (reduce || from === to) { t.value = to; el.textContent = format(to); return; }
    var start = performance.now(), dur = 260;
    function step(now) {
      var k = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - k, 3);
      t.value = from + (to - from) * e;
      el.textContent = format(t.value);
      if (k < 1) t.raf = requestAnimationFrame(step); else { t.value = to; t.raf = 0; el.textContent = format(to); }
    }
    t.raf = requestAnimationFrame(step);
  }

  var o = {
    db: $('o-db'), db2: $('o-db2'), quote: $('o-quote'), ust: $('o-ust'), we: $('o-we'), preis: $('o-preis'),
    monat: $('o-monat'), monatMeta: $('o-monat-meta'), schwelle: $('o-schwelle'), schwelleMeta: $('o-schwelle-meta'),
    lDb: $('l-db'), lWe: $('l-we'), lUst: $('l-ust'), cUst: $('cl-ust'), cWe: $('cl-we'), cDb: $('cl-db'),
  };
  var cup = document.querySelector('.cup');

  /* Rechenweg wie in der App: netto = brutto / (1 + Satz); Deckungsbeitrag = netto minus Wareneinsatz.
     Gewinnschwelle wie in der App: Fixkosten durch Deckungsbeitrag je Stück durch Verkaufstage, aufgerundet. */
  function rechne() {
    var brutto = Number(inputs.preis.value);
    var n = brutto / (1 + ust);
    var we = Number(inputs.bohne.value) + Number(inputs.milch.value) + Number(inputs.becher.value);
    var db = n - we;
    var menge = Number(inputs.menge.value), tage = Number(inputs.tage.value), fix = Number(inputs.fix.value);
    return { brutto: brutto, netto: n, steuer: brutto - n, we: we, db: db, menge: menge, tage: tage, fix: fix, monat: db * menge * tage, schwelle: db > 0 ? Math.ceil(fix / db / tage) : null };
  }

  function render() {
    var r = rechne();
    o.preis.textContent = eur2.format(r.brutto);
    tween('db', o.db, r.db, eur2.format);
    o.db.parentNode.classList.toggle('neg', r.db < 0);
    tween('quote', o.quote, r.netto > 0 ? r.db / r.netto * 100 : 0, function (v) { return pct1.format(v) + ' %'; });
    tween('ust', o.ust, r.steuer, eur2.format);
    tween('we', o.we, r.we, eur2.format);
    tween('db2', o.db2, r.db, eur2.format);
    tween('monat', o.monat, r.monat, eur0.format);
    o.monat.classList.toggle('neg', r.monat < 0);
    tween('pdb', $('p-db'), r.db, eur2.format);
    tween('pmonat', $('p-monat'), r.monat, eur0.format);
    o.monatMeta.textContent = int.format(r.menge) + ' Stück an ' + int.format(r.tage) + ' Tagen, vor Fixkosten';
    if (r.schwelle === null) {
      o.schwelle.textContent = 'keine'; o.schwelle.classList.add('neg');
      o.schwelleMeta.textContent = 'Der Einkauf ist höher als der Preis ohne Steuer.'; tweens.schwelle = null;
    } else {
      o.schwelle.classList.remove('neg');
      tween('schwelle', o.schwelle, r.schwelle, function (v) { return int.format(Math.round(v)) + ' am Tag'; });
      var gap = r.schwelle - r.menge;
      o.schwelleMeta.textContent = r.fix === 0 ? 'Ohne Fixkosten trägt jeder Cappuccino.'
        : gap <= 0 ? 'Mit ' + int.format(r.menge) + ' am Tag sind ' + eur0.format(r.fix) + ' gedeckt.'
        : 'Noch ' + int.format(gap) + ' mehr am Tag für ' + eur0.format(r.fix) + '.';
    }

    /* Die Tasse: die Glasur reicht so hoch wie der Bruttopreis (voll bei 6 €), unten der Deckungsbeitrag,
       darüber Einkauf und Umsatzsteuer. Jedes Band gleitet nur senkrecht, die Kante bleibt unverzerrt. */
    var FULL = 6, BOTTOM = 208, SPAN = 166;
    var fDb = Math.max(0, r.db) / FULL, fWe = Math.min(r.we, r.netto) / FULL, fUst = r.steuer / FULL;
    var level = function (frac) { return BOTTOM - Math.min(1, Math.max(0, frac)) * SPAN; };
    var layer = function (el, top) { el.style.transform = 'translateY(' + level(top) + 'px)'; };
    layer(o.lDb, fDb); layer(o.lWe, fDb + fWe); layer(o.lUst, fDb + fWe + fUst);
    var H = cup.offsetHeight, k = H / 220, mid = function (off, f) { return level(off + f / 2) * k - 8; };
    var yDb = mid(0, fDb), yWe = mid(fDb, fWe), yUst = mid(fDb + fWe, fUst);
    yDb = Math.min(yDb, H - 18); yWe = Math.min(yWe, yDb - 22); yUst = Math.min(yUst, yWe - 22);
    o.cDb.style.transform = 'translateY(' + yDb + 'px)';
    o.cWe.style.transform = 'translateY(' + yWe + 'px)';
    o.cUst.style.transform = 'translateY(' + yUst + 'px)';
  }

  ids.forEach(function (id) {
    paintRange(inputs[id]);
    inputs[id].addEventListener('input', function () { paintRange(inputs[id]); render(); });
  });

  var keys = document.querySelectorAll('.key');
  /* Becher und Deckel je Modus: außer Haus 0,10 €, im Haus 0 €. Hat jemand den Regler in einem Modus
     selbst verstellt, gilt beim Zurückwechseln sein Wert. */
  var BECHER_STANDARD = { '0.19': 0, '0.07': 0.10 }, becherEigen = {};
  inputs.becher.addEventListener('input', function () { becherEigen[String(ust)] = Number(inputs.becher.value); });
  function setUst(v) {
    if (v !== ust) {
      var eigen = becherEigen[String(v)];
      inputs.becher.value = String(eigen !== undefined ? eigen : BECHER_STANDARD[String(v)]);
      paintRange(inputs.becher);
    }
    ust = v;
    keys.forEach(function (k) { if (k.dataset.ust) k.setAttribute('aria-pressed', String(Number(k.dataset.ust) === v)); });
    render();
  }
  function stepPrice(d) {
    var el = inputs.preis;
    el.value = String(Math.min(Number(el.max), Math.max(Number(el.min), Math.round((Number(el.value) + d) * 10) / 10)));
    paintRange(el); render();
  }
  function act(key) {
    if (key === '-') stepPrice(-0.1);
    else if (key === '+') stepPrice(0.1);
    else if (key === 'h') setUst(0.19);
    else if (key === 'a') setUst(0.07);
  }
  keys.forEach(function (k) { k.addEventListener('click', function () { act(k.dataset.key); }); });

  /* Echte Tasten: nur, solange der Rechner zu sehen ist. */
  var calcVisible = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { calcVisible = es[0].isIntersecting; }, { threshold: 0.2 }).observe($('rechner'));
  }
  var map = { '-': '-', '_': '-', '+': '+', '=': '+', 'h': 'h', 'H': 'h', 'a': 'a', 'A': 'a' };
  function keyEl(k) { return document.querySelector('.key[data-key="' + (k === '+' ? '\\+' : k) + '"]'); }
  window.addEventListener('keydown', function (e) {
    if (!calcVisible || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target; if (t && (t.isContentEditable || (t.tagName === 'INPUT' && t.type !== 'range'))) return;
    var k = map[e.key]; if (!k) return;
    e.preventDefault();
    var el = keyEl(k); if (el) el.classList.add('down');
    act(k);
  });
  window.addEventListener('keyup', function (e) {
    var k = map[e.key]; if (!k) return;
    var el = keyEl(k); if (el) el.classList.remove('down');
  });
  window.addEventListener('resize', render);
  render();

  /* ── Fragen: Auf- und Zuklappen mit weicher Höhe statt hartem Sprung ── */
  document.querySelectorAll('.faq details').forEach(function (d) {
    var summary = d.querySelector('summary'), answer = d.querySelector('.answer'), anim = null;
    summary.addEventListener('click', function (e) {
      if (reduce || !d.animate) return;
      e.preventDefault();
      var start = d.offsetHeight, closing = d.open && !(anim && anim.closing);
      if (anim) anim.cancel();
      d.style.overflow = 'hidden';
      if (!closing) d.open = true;
      var end = closing ? summary.offsetHeight : summary.offsetHeight + answer.offsetHeight;
      anim = d.animate({ height: [start + 'px', end + 'px'] }, { duration: closing ? 300 : 420, easing: closing ? 'cubic-bezier(0.4, 0, 0.2, 1)' : 'cubic-bezier(0.22, 1, 0.36, 1)' });
      anim.closing = closing;
      answer.animate({ opacity: closing ? [1, 0] : [0, 1] }, { duration: closing ? 200 : 320, easing: 'ease', fill: 'both' });
      anim.onfinish = function () { if (closing) d.open = false; d.style.overflow = ''; anim = null; };
      anim.oncancel = function () { d.style.overflow = ''; };
    });
  });
})();
