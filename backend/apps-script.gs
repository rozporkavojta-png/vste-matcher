/**
 * VŠTE Matcher: příjem kontaktů a odeslání výsledku e-mailem.
 *
 * Běží jako Google Apps Script navázaný na Google tabulku (Rozšíření → Apps Script).
 * Appka sem pošle kontakt (POST), skript ho zapíše do listu „Kontakty“
 * a uchazeči pošle e-mail s výsledkem. Postup nasazení je v README (sekce „Odesílání e-mailů“).
 *
 * GDPR: tabulka je jediné místo, kde údaje po odeslání ze stánku leží.
 * Sdílej ji jen pověřeným lidem z VŠTE a nastav denní úklid (funkce nastavUklid).
 */

// ===== NASTAVENÍ (vyplnit) =====
const KLIC = 'vste-matcher-2026';           // stejný jako ODESILANI.klic v index.html
const LIST = 'Kontakty';
const ODESILATEL_JMENO = 'VŠTE Matcher';
const ODPOVEDI_NA = '';                      // např. studijni@vstecb.cz, sem půjdou odpovědi a odvolání souhlasu
const ODESILAT_Z = '';                       // z jaké adresy e-maily odcházejí; prázdné = z účtu, pod kterým skript běží. Jiná adresa musí být v Gmailu přidaná jako „Odesílat poštu jako“ (návod v README)
// Postmark: když je ve Vlastnostech skriptu uložený POSTMARK_TOKEN, e-maily jdou přes Postmark z adresy POSTMARK_OD.
// Token nikdy nepiš sem do kódu (Nastavení projektu → Vlastnosti skriptu). Návod v README.
const POSTMARK_OD = '';                      // ověřená adresa v Postmarku (Sender Signature), např. matcher@vstecb.cz
const POSTMARK_STREAM = 'outbound';          // transakční stream; novinky by patřily do zvláštního Broadcast streamu
const UPOZORNENI_NA = '';                    // kam poslat upozornění na každý nový kontakt (víc adres odděl čárkou); prázdné = neposílat
const ODKAZ_ZASADY = 'https://rozporkavojta-png.github.io/vste-matcher/#zasady';
const ODKAZ_WEB = 'https://www.vstecb.cz';
const KONEC_UCELU = new Date('2027-10-31T23:59:59+01:00');   // stejné datum jako ZASADY.uchovatDo
const NOVINKY_MAX_DNI = 730;                                   // 2 roky

const SLOUPCE = ['id', 'prijato', 'cas_souhlasu', 'jmeno', 'prijmeni', 'email', 'obor', 'uroven', 'shoda',
  'druhy_obor', 'novinky', 'verze_souhlasu', 'text_souhlasu', 'text_novinky', 'mail_odeslan'];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.klic !== KLIC) return vystup({ ok: false, chyba: 'klic' });
    const k = data.kontakt || {};
    const chyba = zkontroluj(k);
    if (chyba) return vystup({ ok: false, chyba: chyba });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    let radek;
    try {
      const sh = list();
      const ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().flat() : [];
      if (ids.indexOf(k.id) !== -1) return vystup({ ok: true, duplicita: true });   // stánek posílá znovu
      sh.appendRow([k.id, new Date(), k.souhlas.cas, k.jmeno, k.prijmeni, k.email, k.obor, k.uroven, k.shoda,
        k.druhyObor, k.novinky ? 'ano' : 'ne', k.souhlas.verze, k.souhlas.text, k.souhlas.novinkyText || '', '']);
      radek = sh.getLastRow();
    } finally {
      lock.releaseLock();
    }

    posliVysledek(k);
    list().getRange(radek, SLOUPCE.indexOf('mail_odeslan') + 1).setValue(new Date());
    if (UPOZORNENI_NA) posliUpozorneni(k);
    return vystup({ ok: true });
  } catch (err) {
    return vystup({ ok: false, chyba: String(err) });
  }
}

function zkontroluj(k) {
  if (!k.id || !k.souhlas || !k.souhlas.verze) return 'chybi souhlas';
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(k.email || '')) return 'email';
  if (!k.jmeno || !k.prijmeni || String(k.jmeno).length > 60 || String(k.prijmeni).length > 80) return 'jmeno';
  if (!k.obor) return 'obor';
  return '';
}

function posliVysledek(k) {
  const predmet = 'Tvůj obor na VŠTE: ' + k.obor;
  const html =
    '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#17121B;max-width:560px">' +
    '<p>Ahoj ' + esc(k.jmeno) + ',</p>' +
    '<p>díky, že sis na stánku VŠTE zahrál/a Matcher. Tady je tvůj výsledek:</p>' +
    '<div style="border:2px solid #C61517;border-radius:16px;padding:16px 18px;margin:16px 0">' +
    '<div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#9E1B19">' + esc(k.uroven) + ' · shoda ' + esc(k.shoda) + ' %</div>' +
    '<div style="font-size:22px;font-weight:bold;margin:4px 0 8px">' + esc(k.obor) + '</div>' +
    '<div>' + esc(k.popis || '') + '</div>' +
    (k.tagy ? '<div style="margin-top:8px;color:#5F5864">' + esc(k.tagy) + '</div>' : '') +
    '</div>' +
    '<p>Druhá nejbližší shoda: <b>' + esc(k.druhyObor || '') + '</b></p>' +
    '<p>Víc o oborech, přijímačkách a termínech najdeš na <a href="' + ODKAZ_WEB + '">' + ODKAZ_WEB.replace('https://', '') + '</a>.</p>' +
    '<p>Ať se daří,<br>tým VŠTE</p>' +
    '<hr style="border:0;border-top:1px solid #ddd;margin:24px 0">' +
    '<p style="font-size:12px;color:#5F5864">Tento e-mail ti posíláme, protože jsi na stánku VŠTE dal/a souhlas se zasláním výsledku. ' +
    'Správce údajů: Vysoká škola technická a ekonomická v Českých Budějovicích, Okružní 517/10, 370 01 České Budějovice, IČO 75081431. ' +
    'Souhlas můžeš kdykoli odvolat odpovědí na tento e-mail nebo na dpo.vstecb@fairdata.cz. ' +
    '<a href="' + ODKAZ_ZASADY + '">Zásady zpracování osobních údajů</a>.</p>' +
    '</div>';
  const text = 'Ahoj ' + k.jmeno + ',\n\ntvůj obor na VŠTE: ' + k.obor + ' (' + k.uroven + ', shoda ' + k.shoda + ' %)\n\n' +
    (k.popis || '') + '\n\nDruhá nejbližší shoda: ' + (k.druhyObor || '') + '\n\nVíc na ' + ODKAZ_WEB +
    '\n\nSouhlas můžeš kdykoli odvolat odpovědí na tento e-mail nebo na dpo.vstecb@fairdata.cz.\nZásady: ' + ODKAZ_ZASADY;
  const opt = { to: k.email, subject: predmet, htmlBody: html, body: text, name: ODESILATEL_JMENO };
  if (ODPOVEDI_NA) opt.replyTo = ODPOVEDI_NA;
  posli(opt);
}

/** Upozornění pro tým VŠTE: kdo se ozval a jaký obor mu vyšel. */
function posliUpozorneni(k) {
  const radky = [
    ['Jméno', k.jmeno + ' ' + k.prijmeni],
    ['E-mail', k.email],
    ['Obor', k.obor + ' (' + k.uroven + ')'],
    ['Shoda', k.shoda + ' %'],
    ['Druhá shoda', k.druhyObor || ''],
    ['Chce novinky', k.novinky ? 'ano' : 'ne'],
    ['Souhlas', 'verze ' + k.souhlas.verze + ', ' + k.souhlas.cas]
  ];
  const html = '<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">' +
    radky.map(r => '<tr><td style="padding:4px 12px 4px 0;color:#5F5864">' + esc(r[0]) + '</td><td style="padding:4px 0"><b>' + esc(r[1]) + '</b></td></tr>').join('') +
    '</table><p style="font-family:Arial,sans-serif;font-size:12px;color:#5F5864">Všechny kontakty jsou v tabulce: ' +
    SpreadsheetApp.getActiveSpreadsheet().getUrl() + '<br>Osobní údaje: nepřeposílej mimo pověřené lidi a e-mail smaž, až ho nebudeš potřebovat.</p>';
  posli({
    to: UPOZORNENI_NA,
    subject: 'Matcher: ' + k.jmeno + ' ' + k.prijmeni + ' → ' + k.obor,
    htmlBody: html,
    body: radky.map(r => r[0] + ': ' + r[1]).join('\n'),
    name: ODESILATEL_JMENO,
    replyTo: k.email
  });
}

/** Smaže záznamy po uplynutí doby uchování (bod 4 zásad). Spouští se denně. */
function uklid() {
  const sh = list();
  if (sh.getLastRow() < 2) return;
  const data = sh.getRange(2, 1, sh.getLastRow() - 1, SLOUPCE.length).getValues();
  const ted = new Date();
  const iPrijato = SLOUPCE.indexOf('prijato'), iNovinky = SLOUPCE.indexOf('novinky');
  for (let r = data.length - 1; r >= 0; r--) {
    const prijato = new Date(data[r][iPrijato]);
    const novinky = data[r][iNovinky] === 'ano';
    const vyprselo = novinky
      ? (ted - prijato) / 86400000 > NOVINKY_MAX_DNI
      : ted > KONEC_UCELU;
    if (vyprselo) sh.deleteRow(r + 2);
  }
}

/** Jednou spusť ručně: nastaví denní úklid ve 3 ráno. */
function nastavUklid() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'uklid').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('uklid').timeBased().everyDays(1).atHour(3).create();
}

/** Jednou spusť ručně před nasazením: ověří oprávnění a pošle testovací e-mail tobě. */
function test() {
  posliVysledek({
    jmeno: 'Test', email: Session.getActiveUser().getEmail(), obor: 'Podniková ekonomika', uroven: 'Bakalářské studium',
    shoda: 91, popis: 'Testovací e-mail z VŠTE Matcheru.', tagy: 'Finance, Management', druhyObor: 'Business Analytik'
  });
}

/** Pošle e-mail: přes Postmark (je-li nastavený token), jinak přes Gmail alias (ODESILAT_Z), jinak přes MailApp. */
function posli(opt) {
  const token = PropertiesService.getScriptProperties().getProperty('POSTMARK_TOKEN');
  if (token) { posliPostmark(token, opt); return; }
  if (!ODESILAT_Z) { MailApp.sendEmail(opt); return; }
  if (GmailApp.getAliases().indexOf(ODESILAT_Z) === -1) {
    throw new Error('Adresa ' + ODESILAT_Z + ' není v Gmailu nastavená jako „Odesílat poštu jako“.');
  }
  const o = { htmlBody: opt.htmlBody, name: opt.name, from: ODESILAT_Z };
  if (opt.replyTo) o.replyTo = opt.replyTo;
  GmailApp.sendEmail(opt.to, opt.subject, opt.body, o);
}

function posliPostmark(token, opt) {
  if (!POSTMARK_OD) throw new Error('Vyplň POSTMARK_OD (ověřenou adresu v Postmarku).');
  const zprava = {
    From: (opt.name ? '"' + opt.name.replace(/"/g, '') + '" ' : '') + '<' + POSTMARK_OD + '>',
    To: opt.to,
    Subject: opt.subject,
    HtmlBody: opt.htmlBody,
    TextBody: opt.body,
    MessageStream: POSTMARK_STREAM,
    Tag: 'vste-matcher',
    TrackOpens: false,          // bez sledování otevření a kliknutí (méně osobních údajů)
    TrackLinks: 'None'
  };
  if (opt.replyTo) zprava.ReplyTo = opt.replyTo;
  const res = UrlFetchApp.fetch('https://api.postmarkapp.com/email', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Postmark-Server-Token': token, 'Accept': 'application/json' },
    payload: JSON.stringify(zprava),
    muteHttpExceptions: true
  });
  const odp = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() !== 200 || odp.ErrorCode) {
    throw new Error('Postmark ' + res.getResponseCode() + ': ' + (odp.Message || res.getContentText()));
  }
}

function list() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(LIST);
  if (!sh) {
    sh = ss.insertSheet(LIST);
    sh.appendRow(SLOUPCE);
    sh.setFrozenRows(1);
  }
  return sh;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function vystup(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
