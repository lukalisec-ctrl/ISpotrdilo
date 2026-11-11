(function () {
  'use strict';

  var CFG = window.MH_CONFIG || {};

  // ---------- Geometrija (A4 lezece, enote: tocke PDF) ----------
  var PW = 841.8898, PH = 595.2756, MM = 72 / 25.4;
  var CW = 1754, CH = Math.round(CW * PH / PW); // A4 pri 150 dpi
  var S = CW / PW;
  var LEFT = 24 * MM, LEFT_W = 110 * MM;
  var D = 140 * MM;                                // premer motiva
  var CX = PW - 14 * MM - D / 2, CY = PH / 2;     // sredisce motiva (CY od spodaj)

  var COL = { navy: '#0d1b45', violet: '#542867', magenta: '#d63b7c', ink: '#2a2d45', muted: '#6b6e86' };
  var SERIF = 'Caladea, Cambria, Georgia, "Times New Roman", serif';
  var SANS = 'Carlito, Calibri, Lato, "Helvetica Neue", Arial, sans-serif';

  var EVENT = {
    serija: 'HEARTMATH EXPERIENCE SLOVENIA',
    naslov: 'INTELIGENCA SRCA',
    podnaslov: 'Mednarodni HeartMath Forum',
    datum: '28. oktober 2026, od 14:00 do 20:00',
    kraj: 'Odiseja, Ljubljana',
    izvajalci: ['Howard Martin  ·  dr. Deborah Rozman', 'dr. Tanja Pia Metelko  ·  Rob Erdbrink'],
    podpisIme: 'dr. Tanja Pia Metelko',
    podpisOrg: 'Mind & Heart Academy'
  };

  var GDPR_OK = true;

  function $(id) { return document.getElementById(id); }

  // ---------- Nalaganje slikovnih sredstev (kosi) ----------
  function loadParts(prefix, n, mime) {
    var jobs = [];
    for (var i = 0; i < n; i++) {
      jobs.push(fetch('a/' + prefix + i + '.bin').then(function (r) {
        if (!r.ok) { throw new Error('asset'); }
        return r.arrayBuffer();
      }));
    }
    return Promise.all(jobs).then(function (bufs) {
      return new Blob(bufs, { type: mime });
    });
  }
  function blobToImage(blob) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('img')); };
      img.src = url;
    });
  }

  var assetsPromise = null;
  function getAssets() {
    if (assetsPromise) { return assetsPromise; }
    var a = CFG.ASSETS || { p: 9, m: 4, s: 2 };
    assetsPromise = Promise.all([
      loadParts('p', a.p, 'image/jpeg').then(blobToImage),
      loadParts('m', a.m, 'image/jpeg').then(blobToImage),
      loadParts('s', a.s, 'image/png').then(blobToImage)
    ]).then(function (r) {
      return { planet: buildPlanet(r[0], r[1]), sig: r[2] };
    });
    assetsPromise.catch(function () { assetsPromise = null; });
    return assetsPromise;
  }
  // Motiv: barvna slika JPEG + prosojnost iz crno-bele slike
  function buildPlanet(img, maskImg) {
    var w = img.naturalWidth, h = img.naturalHeight;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d');
    g.drawImage(img, 0, 0, w, h);
    var px = g.getImageData(0, 0, w, h);
    var m = document.createElement('canvas'); m.width = w; m.height = h;
    var mg = m.getContext('2d');
    mg.drawImage(maskImg, 0, 0, w, h);
    var md = mg.getImageData(0, 0, w, h).data;
    var d = px.data;
    for (var i = 0; i < d.length; i += 4) { d[i + 3] = md[i]; }
    g.putImageData(px, 0, 0);
    return c;
  }

  // ---------- Pisave ----------
  var fontsDone = false;
  function ensureFonts(text) {
    if (!document.fonts || !document.fonts.load) { return Promise.resolve(); }
    var sample = (text || '') + ' ČŠŽĆĐ čšžćđ ABCabc';
    var specs = ['700 24px Caladea', '400 24px Caladea', 'italic 400 24px Caladea', '400 24px Carlito', '700 24px Carlito'];
    var jobs = specs.map(function (s) { return document.fonts.load(s, sample).catch(function () {}); });
    return Promise.race([
      Promise.all(jobs),
      new Promise(function (r) { setTimeout(r, 6000); })
    ]).then(function () { fontsDone = true; });
  }

  // ---------- Risanje potrdila ----------
  var ctx;
  function Y(y) { return (PH - y) * S; }
  function setFont(style, weight, sizePt, fam) { ctx.font = style + ' ' + weight + ' ' + (sizePt * S) + 'px ' + fam; }
  function widthPt(text, style, weight, sizePt, fam) { setFont(style, weight, sizePt, fam); return ctx.measureText(text).width / S; }
  function text(str, x, y, style, weight, sizePt, fam, color) {
    setFont(style, weight, sizePt, fam); ctx.fillStyle = color; ctx.textBaseline = 'alphabetic';
    ctx.fillText(str, x * S, Y(y));
  }
  function spaced(str, x, y, style, weight, sizePt, fam, spacing, color) {
    setFont(style, weight, sizePt, fam); ctx.fillStyle = color; ctx.textBaseline = 'alphabetic';
    var cx = x;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      ctx.fillText(ch, cx * S, Y(y));
      cx += ctx.measureText(ch).width / S + spacing;
    }
  }
  function hline(x1, x2, y, wPt, color) {
    ctx.strokeStyle = color; ctx.lineWidth = wPt * S; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(x1 * S, Y(y)); ctx.lineTo(x2 * S, Y(y)); ctx.stroke();
  }

  function wrapText(str, sizePt, maxW) {
    var words = str.split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var trial = cur ? cur + ' ' + words[i] : words[i];
      if (widthPt(trial, 'normal', 700, sizePt, SERIF) <= maxW) { cur = trial; }
      else { if (cur) { lines.push(cur); } cur = words[i]; }
    }
    if (cur) { lines.push(cur); }
    return lines;
  }
  function fitName(name) {
    var a = [44, 40, 36, 32, 30], i;
    for (i = 0; i < a.length; i++) {
      if (widthPt(name, 'normal', 700, a[i], SERIF) <= LEFT_W) { return { size: a[i], lines: [name] }; }
    }
    var b = [36, 32, 28, 26];
    for (i = 0; i < b.length; i++) {
      var l = wrapText(name, b[i], LEFT_W);
      if (l.length <= 2) { return { size: b[i], lines: l }; }
    }
    return { size: 24, lines: wrapText(name, 24, LEFT_W).slice(0, 3) };
  }

  function drawPastel() {
    var gw = 320, gh = Math.round(gw * PH / PW);
    var c = document.createElement('canvas'); c.width = gw; c.height = gh;
    var g = c.getContext('2d'), id = g.createImageData(gw, gh), d = id.data, ar = PW / PH;
    var blobs = [
      [0.80, 0.22, 0.30, [252, 214, 228], 0.85],
      [0.62, 0.92, 0.28, [214, 226, 252], 0.75],
      [0.05, 0.10, 0.28, [232, 218, 248], 0.80],
      [0.12, 0.95, 0.26, [253, 228, 214], 0.65],
      [0.98, 0.95, 0.22, [226, 214, 250], 0.60]
    ];
    for (var j = 0; j < gh; j++) {
      for (var i = 0; i < gw; i++) {
        var u = (i + 0.5) / gw, v = (j + 0.5) / gh;
        var r = 247, gr = 242, b = 252;
        for (var k = 0; k < blobs.length; k++) {
          var bl = blobs[k], du = u - bl[0], dv = v - bl[1];
          var e = Math.exp(-((du * du * ar * ar) + dv * dv) / (2 * bl[2] * bl[2])) * bl[4];
          r = r * (1 - e) + bl[3][0] * e; gr = gr * (1 - e) + bl[3][1] * e; b = b * (1 - e) + bl[3][2] * e;
        }
        var o = (j * gw + i) * 4;
        d[o] = r; d[o + 1] = gr; d[o + 2] = b; d[o + 3] = 255;
      }
    }
    g.putImageData(id, 0, 0);
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) { ctx.imageSmoothingQuality = 'high'; }
    ctx.drawImage(c, 0, 0, CW, CH);
  }

  function drawPatterns() {
    var cxp = CX * S, cyp = (PH - CY) * S, k, r, a;
    // koncentricni valovi iz sredisca motiva
    ctx.strokeStyle = 'rgb(120,90,190)'; ctx.lineWidth = 0.6 * S;
    for (k = 0; k < 170; k++) {
      r = 5.2 * (k + 0.25);
      if (r <= D / 2 * 0.9) { continue; }
      var f = 1 - (r - D / 2 * 0.9) / (PW * 0.75);
      if (f <= 0) { break; }
      ctx.globalAlpha = 0.045 * Math.pow(f, 1.3);
      ctx.beginPath(); ctx.arc(cxp, cyp, r * S, 0, Math.PI * 2); ctx.stroke();
    }
    // nezne valovite crte
    ctx.strokeStyle = 'rgb(150,110,210)'; ctx.lineWidth = 0.7 * S; ctx.globalAlpha = 0.05;
    for (k = 0; k < 9; k++) {
      var y0 = (0.06 + 0.115 * k) * PH;
      ctx.beginPath();
      for (var x = 0; x <= PW; x += 2) {
        var yy = y0 + 22 * Math.sin(x / 38 + k * 0.9) + 10 * Math.sin(x / 17 + k);
        if (x === 0) { ctx.moveTo(x * S, yy * S); } else { ctx.lineTo(x * S, yy * S); }
      }
      ctx.stroke();
    }
    // drobne pike na levi
    ctx.fillStyle = 'rgb(140,100,200)';
    for (var gx = 4.5; gx < PW * 0.55; gx += 9) {
      a = Math.pow(1 - gx / (PW * 0.55), 1.5);
      ctx.globalAlpha = 0.07 * a;
      ctx.beginPath();
      for (var gy = 4.5; gy < PH; gy += 9) {
        ctx.moveTo((gx + 0.5) * S, gy * S); ctx.arc(gx * S, gy * S, 0.5 * S, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawGlow() {
    var cxp = CX * S, cyp = (PH - CY) * S, R = D / 2 * 1.02, sg = 14, r1 = R + 2.5 * sg;
    var gr = ctx.createRadialGradient(cxp, cyp, 0, cxp, cyp, r1 * S);
    gr.addColorStop(0, 'rgba(250,190,215,0.353)');
    gr.addColorStop((R - 2.5 * sg) / r1, 'rgba(250,190,215,0.353)');
    gr.addColorStop(R / r1, 'rgba(250,190,215,0.176)');
    gr.addColorStop(1, 'rgba(250,190,215,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, CW, CH);
  }

  function render(canvas, fullName, assets) {
    canvas.width = CW; canvas.height = CH;
    ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CW, CH);

    drawPastel();
    drawPatterns();
    drawGlow();
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) { ctx.imageSmoothingQuality = 'high'; }
    ctx.drawImage(assets.planet, (CX - D / 2) * S, (PH - D) / 2 * S, D * S, D * S);

    // Zgornji pas
    var y = PH - 30 * MM;
    spaced(EVENT.serija, LEFT, y, 'normal', 700, 10, SANS, 2.6, COL.magenta);
    hline(LEFT, LEFT + 34 * MM, y - 7, 1.2, COL.magenta);

    // Naslov
    y -= 15 * MM;
    spaced('POTRDILO O UDELEŽBI', LEFT, y, 'normal', 400, 17, SERIF, 3.2, COL.violet);

    // Uvod
    y -= 20 * MM;
    text('Potrjujemo udeležbo osebe', LEFT, y, 'italic', 400, 14, SERIF, COL.muted);

    // Ime
    var fit = fitName(fullName), size = fit.size, lines = fit.lines, i;
    y -= size * 1.15 + 4;
    for (i = 0; i < lines.length; i++) {
      text(lines[i], LEFT, y - i * size * 1.12, 'normal', 700, size, SERIF, COL.navy);
    }
    y -= (lines.length - 1) * size * 1.12;
    var wname = 0;
    for (i = 0; i < lines.length; i++) { wname = Math.max(wname, widthPt(lines[i], 'normal', 700, size, SERIF)); }
    y -= 11;
    hline(LEFT, LEFT + wname, y, 0.8, COL.violet);

    // Dogodek
    y -= 17 * MM;
    text('na dogodku', LEFT, y, 'italic', 400, 14, SERIF, COL.muted);
    y -= 11 * MM;
    text(EVENT.naslov, LEFT, y, 'normal', 700, 27, SERIF, COL.navy);
    y -= 7.5 * MM;
    text(EVENT.podnaslov, LEFT, y, 'normal', 400, 12.5, SANS, COL.ink);

    // Datum in ura, pod njima kraj
    y -= 12 * MM;
    text(EVENT.datum, LEFT, y, 'normal', 700, 12.5, SANS, COL.ink);
    y -= 6.2 * MM;
    text(EVENT.kraj, LEFT, y, 'normal', 400, 12.5, SANS, COL.ink);

    // Izvajalci
    y -= 9 * MM;
    var indent = widthPt('Izvajalci: ', 'normal', 400, 10, SANS);
    text('Izvajalci:', LEFT, y, 'normal', 400, 10, SANS, COL.muted);
    for (i = 0; i < EVENT.izvajalci.length; i++) {
      text(EVENT.izvajalci[i], LEFT + indent, y - i * 13, 'normal', 400, 10, SANS, COL.muted);
    }

    // Podpis
    var sy = 24 * MM, lineY = sy + 9 * MM, sigH = 15 * MM;
    var sigW = sigH * (assets.sig.naturalWidth / assets.sig.naturalHeight);
    ctx.drawImage(assets.sig, (LEFT + 2 * MM) * S, (PH - (lineY - 1.2 * MM + sigH)) * S, sigW * S, sigH * S);
    hline(LEFT, LEFT + 62 * MM, lineY, 0.6, COL.ink);
    text(EVENT.podpisIme, LEFT, sy + 4 * MM, 'normal', 700, 12.5, SERIF, COL.navy);
    text(EVENT.podpisOrg, LEFT, sy - 0.5 * MM, 'normal', 400, 10, SANS, COL.muted);
  }

  // ---------- PDF (ena stran, slika JPEG) ----------
  function buildPdf(jpeg, w, h, title) {
    var parts = [], pos = 0, offs = [];
    function ascii(s) { var u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) { u[i] = s.charCodeAt(i) & 255; } return u; }
    function push(x) { var u = typeof x === 'string' ? ascii(x) : x; parts.push(u); pos += u.length; }
    function hex16(s) { var o = 'FEFF'; for (var i = 0; i < s.length; i++) { o += ('0000' + s.charCodeAt(i).toString(16)).slice(-4); } return o.toUpperCase(); }
    var pw = PW.toFixed(2), ph = PH.toFixed(2);
    var content = 'q ' + pw + ' 0 0 ' + ph + ' 0 0 cm /Im0 Do Q';

    push('%PDF-1.4\n');
    offs[1] = pos; push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    offs[2] = pos; push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    offs[3] = pos; push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pw + ' ' + ph + '] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\nendobj\n');
    offs[4] = pos; push('4 0 obj\n<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream\nendobj\n');
    offs[5] = pos; push('5 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + w + ' /Height ' + h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpeg.length + ' >>\nstream\n');
    push(jpeg); push('\nendstream\nendobj\n');
    offs[6] = pos; push('6 0 obj\n<< /Title <' + hex16(title) + '> /Producer (Mind & Heart Academy) >>\nendobj\n');
    var xref = pos;
    var x = 'xref\n0 7\n0000000000 65535 f \n';
    for (var i = 1; i <= 6; i++) { x += ('0000000000' + offs[i]).slice(-10) + ' 00000 n \n'; }
    x += 'trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    push(x);
    return new Blob(parts, { type: 'application/pdf' });
  }
  function blobToBytes(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(new Uint8Array(fr.result)); };
      fr.onerror = function () { reject(new Error('read')); };
      fr.readAsArrayBuffer(blob);
    });
  }
  function canvasToJpeg(canvas) {
    return new Promise(function (resolve, reject) {
      if (canvas.toBlob) {
        canvas.toBlob(function (b) { b ? resolve(b) : reject(new Error('blob')); }, 'image/jpeg', 0.92);
      } else {
        var u = atob(canvas.toDataURL('image/jpeg', 0.92).split(',')[1]), a = new Uint8Array(u.length);
        for (var i = 0; i < u.length; i++) { a[i] = u.charCodeAt(i); }
        resolve(new Blob([a], { type: 'image/jpeg' }));
      }
    });
  }

  // ---------- Pomozne funkcije ----------
  var NAME_RE;
  try { NAME_RE = new RegExp('^[\\p{L}][\\p{L}\\p{M}\'’.\\- ]{0,59}$', 'u'); }
  catch (e) { NAME_RE = /^[A-Za-zÀ-ſ][A-Za-zÀ-ſ'’.\- ]{0,59}$/; }

  function normName(s) {
    s = String(s || '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    if (s && (s === s.toLowerCase() || s === s.toUpperCase())) {
      s = s.toLocaleLowerCase('sl').replace(/(^|[\s\-'’])(\S)/g, function (m, p, c) { return p + c.toLocaleUpperCase('sl'); });
    }
    return s;
  }
  function slug(s) {
    var t = s;
    if (t.normalize) { t = t.normalize('NFD').replace(/[̀-ͯ]/g, ''); }
    t = t.replace(/[Đđ]/g, 'd').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return t || 'oseba';
  }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var TYPOS = {
    'gmail.con': 'gmail.com', 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.co': 'gmail.com',
    'gmail.si': 'gmail.com', 'gmal.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmail.cm': 'gmail.com',
    'hotmail.con': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'yahoo.con': 'yahoo.com', 'yaho.com': 'yahoo.com',
    'siol.ne': 'siol.net', 'siol.nt': 'siol.net', 'telemach.ne': 'telemach.net', 'outlook.con': 'outlook.com'
  };

  function device() {
    var ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) { return 'ios'; }
    if (/Android/i.test(ua)) { return 'android'; }
    return 'racunalnik';
  }

  // ---------- Zapis v tabelo ----------
  function sendToSheet(d) {
    if (!CFG.SHEET_URL) { return; }
    var key = 'mh_sent_' + (d.email + '|' + d.ime + ' ' + d.priimek).toLowerCase();
    try { if (sessionStorage.getItem(key)) { return; } } catch (e) { /* ni shrambe */ }
    try {
      fetch(CFG.SHEET_URL, {
        method: 'POST', mode: 'no-cors', keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ token: CFG.TOKEN, ime: d.ime, priimek: d.priimek, email: d.email, naprava: d.naprava })
      }).then(function () { try { sessionStorage.setItem(key, '1'); } catch (e) { } }, function () { });
    } catch (e) { /* zapis ne sme ovirati prenosa */ }
  }

  // ---------- Vmesnik ----------
  var urls = [];
  var state = { email: '', typoConfirmed: false };

  function setErr(id, msg, inputId) {
    var el = $(id); el.textContent = msg || '';
    if (inputId) { var inp = $(inputId); if (msg) { inp.classList.add('invalid'); inp.setAttribute('aria-invalid', 'true'); } else { inp.classList.remove('invalid'); inp.removeAttribute('aria-invalid'); } }
  }
  function clearErrors() {
    setErr('err-ime', '', 'ime'); setErr('err-priimek', '', 'priimek'); setErr('err-email', '', 'email');
    setErr('err-gdpr', ''); setErr('err-general', ''); $('suggest').hidden = true;
  }
  function showView(id) {
    $('view-form').hidden = id !== 'view-form';
    $('view-result').hidden = id !== 'view-result';
    window.scrollTo(0, 0);
  }

  function setBusy(busy) {
    var b = $('submit');
    b.disabled = busy;
    b.textContent = busy ? 'Pripravljam potrdilo ...' : 'Pripravi moje potrdilo';
  }

  function submit() {
    clearErrors();
    var ime = normName($('ime').value), pri = normName($('priimek').value);
    var mail = String($('email').value || '').replace(/\s+/g, '').toLowerCase();
    var first = null, ok = true;

    if (!ime) { setErr('err-ime', 'Vpišite svoje ime.', 'ime'); first = first || 'ime'; ok = false; }
    else if (!NAME_RE.test(ime)) { setErr('err-ime', 'Ime lahko vsebuje samo črke.', 'ime'); first = first || 'ime'; ok = false; }
    if (!pri) { setErr('err-priimek', 'Vpišite svoj priimek.', 'priimek'); first = first || 'priimek'; ok = false; }
    else if (!NAME_RE.test(pri)) { setErr('err-priimek', 'Priimek lahko vsebuje samo črke.', 'priimek'); first = first || 'priimek'; ok = false; }
    if (!mail) { setErr('err-email', 'Vpišite svoj e-naslov.', 'email'); first = first || 'email'; ok = false; }
    else if (!EMAIL_RE.test(mail)) { setErr('err-email', 'E-naslov ni veljaven. Primer: ime@gmail.com', 'email'); first = first || 'email'; ok = false; }
    if (!$('gdpr').checked) { setErr('err-gdpr', 'Za nadaljevanje potrdite soglasje.'); first = first || 'gdpr'; ok = false; }
    if (!ok) { $(first).focus(); return; }

    // Predlog popravka pogostih napak v e-naslovu
    var dom = mail.split('@')[1];
    if (!state.typoConfirmed && TYPOS[dom]) {
      var fixed = mail.split('@')[0] + '@' + TYPOS[dom];
      $('sug-addr').textContent = fixed; $('suggest').hidden = false;
      $('sug-yes').onclick = function () { $('email').value = fixed; state.typoConfirmed = true; $('suggest').hidden = true; submit(); };
      $('sug-no').onclick = function () { state.typoConfirmed = true; $('suggest').hidden = true; submit(); };
      $('suggest').scrollIntoView && $('suggest').scrollIntoView({ block: 'center' });
      return;
    }

    // Past za robote: izpolnjeno skrito polje
    var bot = !!$('website').value;
    var full = ime + ' ' + pri;
    setBusy(true);

    Promise.all([getAssets(), ensureFonts(full)]).then(function (r) {
      var canvas = $('preview');
      render(canvas, full, r[0]);
      return canvasToJpeg(canvas).then(function (jpgBlob) {
        return blobToBytes(jpgBlob).then(function (bytes) {
          var pdf = buildPdf(bytes, CW, CH, 'Potrdilo o udeležbi: ' + full);
          return { jpg: jpgBlob, pdf: pdf };
        });
      });
    }).then(function (files) {
      var base = 'Potrdilo_' + slug(pri) + '_' + slug(ime);
      for (var i = 0; i < urls.length; i++) { URL.revokeObjectURL(urls[i]); }
      urls = [URL.createObjectURL(files.pdf), URL.createObjectURL(files.jpg)];
      bindDownload($('dl-pdf'), urls[0], base + '.pdf');
      bindDownload($('dl-img'), urls[1], base + '.jpg');
      renderHelp();

      if (!bot) {
        sendToSheet({ ime: ime, priimek: pri, email: mail, naprava: device() });
      }
      state.email = mail;
      setBusy(false);
      showView('view-result');
      $('result-title').focus();
    }).catch(function () {
      setBusy(false);
      setErr('err-general', 'Potrdila trenutno ni bilo mogoče pripraviti. Preverite internetno povezavo in poskusite znova.');
    });
  }

  function bindDownload(a, url, filename) {
    a.href = url; a.setAttribute('download', filename);
    a.onclick = function (ev) {
      // Starejši brskalniki ne podpirajo atributa download: odpri datoteko v novem zavihku
      if (!('download' in document.createElement('a'))) { ev.preventDefault(); window.open(url, '_blank'); }
    };
  }

  function renderHelp() {
    var d = device(), h = $('help'), t = '';
    if (d === 'ios') {
      t = '<p><strong>Kje bo potrdilo?</strong></p>' +
        '<p>Pritisnite »Prenesi potrdilo (PDF)«. Če se pojavi vprašanje o prenosu, pritisnite »Prenesi«. Datoteko najdete v aplikaciji »Datoteke«, v mapi »Prenosi«.</p>' +
        '<p>Če se potrdilo odpre na zaslonu, pritisnite ikono za deljenje (kvadrat s puščico navzgor) in izberite »Shrani v Datoteke«.</p>' +
        '<p>Za shranitev v galerijo pritisnite »Shrani kot sliko«, pridržite prst na sliki in izberite »Dodaj v Fotografije«.</p>';
    } else if (d === 'android') {
      t = '<p><strong>Kje bo potrdilo?</strong></p>' +
        '<p>Potrdilo se shrani v mapo »Prenosi« v vašem telefonu. Odprete ga z obvestilom na vrhu zaslona ali z aplikacijo »Datoteke«.</p>' +
        '<p>Za shranitev v galerijo pritisnite »Shrani kot sliko«.</p>';
    } else {
      t = '<p><strong>Kje bo potrdilo?</strong></p>' +
        '<p>Potrdilo se shrani v mapo »Prenosi« na vašem računalniku. Prikazano je tudi v zgornjem ali spodnjem delu okna brskalnika.</p>';
    }
    h.innerHTML = t;
  }

  function init() {
    $('form').addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    ['ime', 'priimek', 'email'].forEach(function (id) {
      $(id).addEventListener('input', function () {
        setErr('err-' + id, '', id);
        if (id === 'email') { state.typoConfirmed = false; $('suggest').hidden = true; }
      });
    });
    $('gdpr').addEventListener('change', function () { setErr('err-gdpr', ''); });
    $('edit').addEventListener('click', function () { showView('view-form'); $('ime').focus(); });
    $('another').addEventListener('click', function () {
      $('ime').value = ''; $('priimek').value = '';
      showView('view-form'); $('ime').focus();
    });

    // Priprava v ozadju: sredstva, pisave in okrasna krogla
    getAssets().then(function (a) {
      var c = $('deco'), g = c.getContext('2d');
      g.imageSmoothingEnabled = true;
      g.drawImage(a.planet, 0, 0, c.width, c.height);
    }).catch(function () { });
    ensureFonts('');
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
