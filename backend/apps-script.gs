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

/* ===== Obsah e-mailu: obory a škola =====
   Převzato z webu VŠTE (https://www.vstecb.cz/studijni-programy/ a stránky jednotlivých programů), stav 9. 10. 2026.
   Když se na webu něco změní, uprav to tady. Klíče odpovídají kódům oborů v appce. */
const WEB_VSTE = 'https://www.vstecb.cz';
const OBORY = {
  BA:  { url: '/business-analytik/', forma: 'prezenční i kombinovaná', delka: '3 roky',
         popis: 'Naučíš se analyzovat, hodnotit a zlepšovat firemní procesy v době digitalizace.',
         uci: ['Analýza a optimalizace firemních procesů', 'Informační systémy a IT ve firmě', 'Řízení dodavatelského řetězce s pomocí IT', 'Práce s daty a čísly'],
         uplatneni: 'Business analytik, datový nebo procesní analytik, IT business analyst, webový analytik, střední management.' },
  PE:  { url: '/podnikova-ekonomika-bc/', forma: 'prezenční i kombinovaná', delka: '3 roky',
         popis: 'Profesně zaměřený program, který z tebe udělá odborníka na to, jak firma funguje.',
         uci: ['Zásobování, výroba, obchod a investice', 'Účetnictví a finance', 'Marketing a inovace', 'Personální činnost'],
         uplatneni: 'Nákupčí, plánovač výroby, obchodník, finančník, marketér, účetní, manažer nebo vlastní podnikání.' },
  RLZ: { url: '/rizeni-lidskych-zdroju/', forma: 'prezenční i kombinovaná (o víkendech)', delka: '3 roky',
         popis: 'Pevný ekonomický základ a na něm všechno o vedení a rozvoji lidí.',
         uci: ['Pracovní právo a psychologie práce', 'Komunikační a prezentační dovednosti', 'Manažerské kompetence', 'Semestrální praxe přímo ve firmě'],
         uplatneni: 'Specialista nebo manažer HR ve firmách i ve veřejné správě, ve vzdělávacích a poradenských firmách.' },
  TRD: { url: '/technologie-a-rizeni-dopravy/', forma: 'prezenční i kombinovaná', delka: '3 roky',
         popis: 'Připraví tě na práci v dopravních, logistických a průmyslových firmách i ve veřejné správě.',
         uci: ['Specializace Nákladní doprava: přeprava, intermodální přeprava, zasílatelství', 'Specializace Osobní doprava: MHD a integrované dopravní systémy'],
         uplatneni: 'Dopravci, spediční a poradenské firmy, Centrum dopravního výzkumu, ministerstva a krajské úřady.' },
  STR: { url: '/strojirenstvi/', forma: 'prezenční i kombinovaná', delka: '3 roky',
         popis: 'Prakticky zaměřený obor o konstrukci strojů a technologiích výroby.',
         uci: ['3D modelování a počítačová grafika', 'Konstrukce strojů a nástrojů', 'Svařování a zkoušení materiálů', 'Obsluha a programování CNC strojů'],
         uplatneni: 'Konstruktér, technolog obrábění nebo svařování, programátor CNC strojů, projektant, manažer výroby.' },
  RPS: { url: '/ridici-procesy-ve-strojirenstvi/', forma: 'prezenční', delka: '3 roky',
         popis: 'Strojařina pro Průmysl 4.0: technologie výroby propojené s automatizací a daty.',
         uci: ['Aplikovaná matematika a fyzika', 'Strojírenské technologie a nauka o materiálu', 'Mechanika, termomechanika a energetika', 'Informatika, automatizace a zpracování dat'],
         uplatneni: 'Technolog: příprava výroby, výrobní postupy, volba zařízení a řízení strojírenské výroby.' },
  PS:  { url: '/pozemni-stavby/', forma: 'prezenční i kombinovaná', delka: '4 roky',
         popis: 'Architektonicko-konstrukční vzdělání o navrhování, výstavbě a provozu budov.',
         uci: ['Architektonické a konstrukční navrhování', 'Úsporné a ekologické budovy', 'Moderní materiály a technologie', 'Technická zařízení budov'],
         uplatneni: 'Konstruktér, technolog, technik nebo manažer ve stavebních firmách, investorských útvarech, realitách i státní správě.' },
  PEM: { url: '/podnikova-ekonomika/', forma: 'prezenční i kombinovaná', delka: '2 roky',
         popis: 'Dvě specializace, o které je ve firmách velký zájem.',
         uci: ['Ekonom výroby: řízení a plánování technicko-technologických procesů', 'Produktový a hodnotový management, leadership, racionální management'],
         uplatneni: 'Výrobní i nevýrobní podniky a státní správa.' },
  ZN:  { url: '/znalectvi/', forma: 'prezenční', delka: '2 roky',
         popis: 'Obor zaměřený na oceňování podniku a znaleckou praxi.',
         uci: ['Oceňování podniku', 'Právo ve znalecké oblasti a zákon o znalcích', 'Metodika znaleckého posudku'],
         uplatneni: 'Soudní znalec nebo jeho asistent, odhadce, konzultant, finanční manažer, ekonom analytik.' },
  PSM: { url: '/pozemni-stavby-ing/', forma: 'prezenční', delka: '2 roky',
         popis: 'Navazující architektonicko-konstrukční vzdělání o navrhování, výstavbě a provozu budov.',
         uci: ['Architektonické a statické navrhování', 'Pokročilé materiály a technologie', 'Energetické a environmentální hodnocení budov', 'Stavební předpisy v praxi'],
         uplatneni: 'Stavební společnosti, stavbyvedoucí, odborní referenti a manažeři středního řízení, realitní kanceláře.' },
  STRM:{ url: '/strojirenstvi-ing/', forma: 'prezenční i kombinovaná', delka: '2 roky',
         popis: 'Profesně zaměřený magisterský program pro strojírenské podniky a veřejnou správu.',
         uci: ['Automatizovaná a robotizovaná výroba (Průmysl 4.0)', 'Projektování výrobních systémů a materiálových toků', 'Moderní slévárenské technologie', 'Operační a procesní management'],
         uplatneni: 'Konstruktér, technolog, projektant, procesní inženýr, manažer materiálových toků.' },
  LOG: { url: '/logistika', forma: 'prezenční i kombinovaná', delka: '2 roky',
         popis: 'Příprava na pozice v dopravních, logistických a průmyslových firmách i ve veřejné správě.',
         uci: ['Přepravní a skladovací technologie', 'Strategické řízení dodavatelského řetězce', 'Modelování logistických procesů', 'Logistické informační systémy'],
         uplatneni: 'Logistické firmy (3PL, 4PL), logistika výroby, dopravci, poradenství, veřejná správa. Možnost získat titul CLog.' }
};
const SKOLA = [
  ['97 %', 'absolventů najde práci do dvou měsíců od konce studia'],
  ['0 Kč', 'veřejná vysoká škola, studium je zdarma (když plníš povinnosti a nepřekročíš standardní dobu studia)'],
  ['1 semestr', 'praxe přímo ve firmě'],
  ['3 kontinenty', 'studium a stáže v zahraničí: partnerské školy v EU, Asii i Kanadě']
];

/* Barvy z PDF s logem M&tcher */
const C = { karmin: '#9A2221', karminTmavy: '#7A1A19', text: '#111617', sedy: '#5C5353', svetly: '#FBEEF2',
            pozadi: '#F6F1F1', linka: '#EAD9DA', akcent: '#C8203F', akcent2: '#B53F80' };
const LOGO_SVETLE = 'https://rozporkavojta-png.github.io/vste-matcher/logo/matcher-logo-svetle-email.png';
const LOGO_TMAVE = 'https://rozporkavojta-png.github.io/vste-matcher/logo/matcher-logo-tmave-email.png';

/* Vzhled e-mailu: 1 = karmínová hlavička, 2 = bílá a čistá, 3 = celý karmínový. */
const VZHLED_EMAILU = 1;
const VZHLEDY = {
  1: { okoli: C.pozadi, hlavickaBg: C.karmin, logo: LOGO_SVETLE, heslo: C.svetly,
       procBg: C.karmin, procCislo: '#FFFFFF', procText: C.svetly, procStitek: C.svetly, procTlBg: '#FFFFFF', procTlText: C.karmin },
  2: { okoli: '#FFFFFF', hlavickaBg: '#FFFFFF', logo: LOGO_TMAVE, heslo: C.karmin,
       procBg: C.pozadi, procCislo: C.karmin, procText: C.text, procStitek: C.karmin, procTlBg: C.karmin, procTlText: '#FFFFFF' },
  3: { okoli: C.karmin, hlavickaBg: C.karmin, logo: LOGO_SVETLE, heslo: C.svetly,
       procBg: C.karminTmavy, procCislo: '#FFFFFF', procText: C.svetly, procStitek: C.svetly, procTlBg: '#FFFFFF', procTlText: C.karmin }
};

function posliVysledek(k) {
  const o = OBORY[k.oborKod] || null;
  const predmet = 'Tvůj match na VŠTE: ' + k.obor;
  const html = emailVysledek(k, o);
  const text = 'Ahoj ' + k.jmeno + ',\n\ntvůj match na VŠTE: ' + k.obor + ' (' + k.uroven + ', shoda ' + k.shoda + ' %)\n\n' +
    (o ? o.popis + '\nForma: ' + o.forma + ', délka: ' + o.delka + '\nCo se naučíš: ' + o.uci.join('; ') +
         '\nUplatnění: ' + o.uplatneni + '\nVíc o oboru: ' + WEB_VSTE + o.url + '\n\n' : (k.popis || '') + '\n\n') +
    (k.prehled ? 'Jak ti sedí ostatní obory:\n' + k.prehled.map(x => '  ' + x.obor + ': ' + x.pct + ' %').join('\n') + '\n\n' : '') +
    'Proč VŠTE:\n' + SKOLA.map(x => '  ' + x[0] + ' ' + x[1]).join('\n') +
    '\n\nVšechny studijní programy: ' + WEB_VSTE + '/studijni-programy/' +
    '\n\nSouhlas můžeš kdykoli odvolat odpovědí na tento e-mail nebo na dpo.vstecb@fairdata.cz.\nZásady: ' + ODKAZ_ZASADY;
  const opt = { to: k.email, subject: predmet, htmlBody: html, body: text, name: ODESILATEL_JMENO };
  if (ODPOVEDI_NA) opt.replyTo = ODPOVEDI_NA;
  posli(opt);
}

/* HTML e-mailu: tabulky a styly přímo v prvcích, aby to drželo i v Outlooku a Gmailu. */
function emailVysledek(k, o, vzhled) {
  const V = VZHLEDY[vzhled || VZHLED_EMAILU] || VZHLEDY[1];
  const f = 'font-family:Arial,Helvetica,sans-serif;';
  const tlacitko = (href, popisek, bg, barva) =>
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="' + bg + '" style="border-radius:999px">' +
    '<a href="' + href + '" style="' + f + 'display:inline-block;padding:13px 26px;font-size:14px;font-weight:bold;letter-spacing:.04em;' +
    'text-transform:uppercase;color:' + barva + ';text-decoration:none;border-radius:999px">' + esc(popisek) + '</a></td></tr></table>';
  const stitek = t => '<div style="' + f + 'font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:' + C.karmin + ';font-weight:bold;margin:0 0 6px">' + esc(t) + '</div>';

  let obor = '';
  if (o) {
    obor =
      '<tr><td style="padding:22px 26px 0">' + stitek('Co se naučíš') +
      '<ul style="' + f + 'margin:0;padding:0 0 0 18px;color:' + C.text + ';font-size:15px;line-height:1.55">' +
      o.uci.map(x => '<li style="margin:0 0 4px">' + esc(x) + '</li>').join('') + '</ul></td></tr>' +
      '<tr><td style="padding:18px 26px 0">' + stitek('Kde se uplatníš') +
      '<p style="' + f + 'margin:0;color:' + C.text + ';font-size:15px;line-height:1.55">' + esc(o.uplatneni) + '</p></td></tr>' +
      '<tr><td style="padding:22px 26px 26px">' + tlacitko(WEB_VSTE + o.url, 'Detail oboru na webu VŠTE', C.karmin, '#FFFFFF') + '</td></tr>';
  } else {
    obor = '<tr><td style="padding:18px 26px 26px"><p style="' + f + 'margin:0;color:' + C.text + ';font-size:15px">' + esc(k.popis || '') + '</p></td></tr>';
  }

  let prehled = '';
  if (k.prehled && k.prehled.length) {
    prehled =
      '<tr><td style="padding:26px 26px 6px">' + stitek('Jak ti sedí jednotlivé obory') + '</td></tr>' +
      k.prehled.map((x, i) => {
        const pct = Math.max(0, Math.min(100, Number(x.pct) || 0));
        const barva = i === 0 ? C.karmin : '#D9B7B9';
        return '<tr><td style="padding:6px 26px">' +
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
          '<td style="' + f + 'font-size:14px;color:' + C.text + ';' + (i === 0 ? 'font-weight:bold;' : '') + '">' + esc(x.obor) + '</td>' +
          '<td align="right" style="' + f + 'font-size:14px;font-weight:bold;color:' + (i === 0 ? C.karmin : C.text) + ';white-space:nowrap">' + pct + ' %</td></tr>' +
          '<tr><td colspan="2" style="padding-top:5px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
          (pct > 0 ? '<td width="' + pct + '%" bgcolor="' + barva + '" style="height:7px;line-height:7px;font-size:0;border-radius:999px">&nbsp;</td>' : '') +
          (pct < 100 ? '<td bgcolor="' + C.linka + '" style="height:7px;line-height:7px;font-size:0">&nbsp;</td>' : '') +
          '</tr></table></td></tr></table></td></tr>';
      }).join('') +
      '<tr><td style="padding:6px 26px 26px"><p style="' + f + 'margin:0;font-size:12px;color:' + C.sedy + ';line-height:1.5">' +
      'Procento říká, kolik bodů dostal obor z maxima, které šlo podle tvých odpovědí získat.</p></td></tr>';
  }

  const skola = SKOLA.map(x =>
    '<tr><td valign="top" style="' + f + 'padding:8px 14px 8px 0;font-size:20px;font-weight:bold;color:' + V.procCislo + ';white-space:nowrap">' + esc(x[0]) + '</td>' +
    '<td valign="top" style="' + f + 'padding:10px 0;font-size:14px;line-height:1.45;color:' + V.procText + '">' + esc(x[1]) + '</td></tr>').join('');

  return '<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="light"><title>' + esc('Tvůj match na VŠTE') + '</title></head>' +
    '<body style="margin:0;padding:0;background:' + V.okoli + '">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' + V.okoli + '"><tr><td align="center" style="padding:24px 12px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#FFFFFF;border-radius:22px;overflow:hidden">' +

    // hlavička: karmínová s logem, jako v PDF
    '<tr><td bgcolor="' + V.hlavickaBg + '" style="padding:30px 26px 26px">' +
    '<img src="' + V.logo + '" width="220" alt="M&amp;tcher VŠTE" style="display:block;width:220px;max-width:70%;height:auto;border:0">' +
    '<p style="' + f + 'margin:18px 0 0;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:' + V.heslo + '">Najdi obor, který ti sedí.</p></td></tr>' +
    '<tr><td bgcolor="' + C.akcent + '" style="height:5px;line-height:5px;font-size:0;background:linear-gradient(90deg,' + C.akcent2 + ',' + C.akcent + ')">&nbsp;</td></tr>' +

    // pozdrav a match
    '<tr><td style="padding:26px 26px 0"><p style="' + f + 'margin:0;font-size:16px;color:' + C.text + ';line-height:1.5">Ahoj ' + esc(k.jmeno) +
    ',<br>díky, že sis na stánku VŠTE zahrál/a Matcher. Tady je tvůj výsledek.</p></td></tr>' +
    '<tr><td style="padding:20px 26px 0">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid ' + C.karmin + ';border-radius:18px"><tr><td style="padding:18px 20px">' +
    '<div style="' + f + 'font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:' + C.karmin + ';font-weight:bold">' + esc(k.uroven) + ' · shoda ' + esc(k.shoda) + ' %</div>' +
    '<div style="' + f + 'font-size:26px;line-height:1.15;font-weight:bold;color:' + C.text + ';margin:6px 0 8px">' + esc(k.obor) + '</div>' +
    (o ? '<div style="' + f + 'font-size:15px;line-height:1.5;color:' + C.text + '">' + esc(o.popis) + '</div>' +
         '<div style="' + f + 'font-size:13px;color:' + C.sedy + ';margin-top:10px">Forma: ' + esc(o.forma) + ' · Délka: ' + esc(o.delka) + '</div>' : '') +
    '</td></tr></table></td></tr>' +
    obor +

    // přehled všech oborů
    '<tr><td style="padding:0 26px"><div style="border-top:1px solid ' + C.linka + ';font-size:0;line-height:0">&nbsp;</div></td></tr>' +
    prehled +

    // proč VŠTE: karmínový blok
    '<tr><td bgcolor="' + V.procBg + '" style="padding:26px">' +
    '<div style="' + f + 'font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:' + V.procStitek + ';font-weight:bold;margin:0 0 8px">Proč VŠTE</div>' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0">' + skola + '</table>' +
    '<div style="height:16px;line-height:16px;font-size:0">&nbsp;</div>' +
    tlacitko(WEB_VSTE + '/studijni-programy/', 'Všechny studijní programy', V.procTlBg, V.procTlText) +
    '</td></tr>' +

    // patička s GDPR
    '<tr><td style="padding:22px 26px 26px"><p style="' + f + 'margin:0;font-size:12px;line-height:1.55;color:' + C.sedy + '">' +
    'Tento e-mail ti posíláme, protože jsi na stánku VŠTE dal/a souhlas se zasláním výsledku. ' +
    'Správce údajů: Vysoká škola technická a ekonomická v Českých Budějovicích, Okružní 517/10, 370 01 České Budějovice, IČO 75081431. ' +
    'Souhlas můžeš kdykoli odvolat odpovědí na tento e-mail nebo na dpo.vstecb@fairdata.cz. ' +
    '<a href="' + ODKAZ_ZASADY + '" style="color:' + C.karmin + '">Zásady zpracování osobních údajů</a>.</p></td></tr>' +

    '</table></td></tr></table></body></html>';
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
    jmeno: 'Test', email: Session.getActiveUser().getEmail(), obor: 'Podniková ekonomika', oborKod: 'PE', uroven: 'Bakalářské studium',
    shoda: 74, druhyObor: 'Business Analytik',
    prehled: [{ obor: 'Podniková ekonomika', pct: 74 }, { obor: 'Business Analytik', pct: 61 }, { obor: 'Řízení lidských zdrojů', pct: 35 },
              { obor: 'Technologie a řízení dopravy', pct: 17 }, { obor: 'Pozemní stavby', pct: 9 }]
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
