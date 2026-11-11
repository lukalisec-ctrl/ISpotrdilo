// Mind & Heart Academy: zapis prijav za potrdila v Google tabelo.
// Namestitev: v tabeli Razširitve > Apps Script, prilepite to kodo, shranite,
// nato Uvedi > Nova uvedba > Spletna aplikacija (Izvajaj kot: jaz, Dostop: kdorkoli).

var TOKEN = 'afe03002e617798ce9bb9984';

function clean_(v, max) {
  var s = String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) { s = "'" + s; }
  return s;
}

function out_(txt) {
  return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  var d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out_('bad'); }
  if (!d || d.token !== TOKEN) { return out_('denied'); }

  var ime = clean_(d.ime, 60), pri = clean_(d.priimek, 60), mail = clean_(d.email, 120).toLowerCase();
  if (!ime || !pri || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) { return out_('invalid'); }
  var novice = d.novice === true;
  var naprava = clean_(d.naprava, 20);

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var last = sh.getLastRow();
    if (last >= 2) {
      var rows = sh.getRange(2, 2, last - 1, 3).getValues(); // B:D = ime, priimek, e-naslov
      var key = mail + '|' + (ime + ' ' + pri).toLowerCase();
      for (var i = 0; i < rows.length; i++) {
        var k = String(rows[i][2]).toLowerCase() + '|' + (String(rows[i][0]) + ' ' + String(rows[i][1])).toLowerCase();
        if (k === key) {
          if (novice) { sh.getRange(i + 2, 5).setValue('DA'); }
          return out_('dup');
        }
      }
    }
    sh.appendRow([new Date(), ime, pri, mail, novice ? 'DA' : 'NE', naprava]);
  } finally {
    lock.releaseLock();
  }
  return out_('ok');
}

function doGet() { return out_('ok'); }
