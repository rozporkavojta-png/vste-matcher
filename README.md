# VŠTE Matcher

Oborová kalkulačka pro stánek VŠTE na Gaudeamu. Uchazeč ji proklikne za minutu
a dozví se, který studijní program mu sedí nejvíc.

Otázky jsou dvojího druhu:

- **Naostro** – klasický kvíz: otázka a pod ní odpovědi v seznamu.
- **Na odlehčenou** – mřížka meme dlaždic: každá dlaždice je pohyblivý meme
  a pod ním text odpovědi. Uchazeč klepne na tu, která je on.

Klepnutím se odpověď vybere a jde se rovnou na další otázku. Na konci přijde
„It's a match" s oborem, který sedí nejvíc.

## Jak to spustit

Jeden soubor, žádný build, žádné závislosti.

- **Na počítači:** poklikej na `index.html`.
- **Na tabletu nebo telefonu:** nahraj `index.html` i složku `memes/` na web
  (stačí libovolný statický hosting) a otevři v prohlížeči.
- **Lokálně přes server** (když chceš testovat jako na ostro):
  `python -m http.server 8000` → http://localhost:8000

Memy jsou uložené vedle v `memes/`, takže appka jede i **bez internetu**.
Z internetu se tahá jen písmo z Google Fonts. Když vypadne, naskočí systémové.

## Ovládání

| Dotyk | Klávesa | Co to udělá |
|---|---|---|
| klepnutí na odpověď / dlaždici | 1–5 | vybere odpověď, jde se na další otázku |
| „Nic z toho, přeskočit" | 0 | otázka se přeskočí bez bodů |
| „Zpět" | Backspace | zpět o otázku |
| „Znovu" | Esc | restart |
| klepnutí na ligu | 1 / 2 | výběr ligy na úvodní obrazovce |

**Obsluha stánku:** pětkrát rychle kliknout na logo „VŠTE Matcher" vlevo nahoře.
Otevře se skrytá obrazovka se sebranými e-maily a tlačítkem na zkopírování CSV.

## Co kde změnit

Všechno je v `index.html`, v sekci `QUIZ` ve `<script>`.

Každá otázka má `tone`: `"Naostro"` = klasický kvíz, `"Na odlehčenou"` = meme dlaždice.
U vážných otázek se pole s memem (`m`, `ef`, `e`) nepoužijí. Meme dlaždice má jen GIF a pod ním
text odpovědi, žádný další text přes ani nad obrázkem.

Jedna odpověď vypadá takhle:

```js
{t:"Propočítám ztrátu produktivity v korunách za minutu.",  // text na kartě
 m:"krabs-money.mp4",      // soubor ze složky memes/ (.mp4 = živý meme, vedle musí být stejnojmenný .jpg náhled)
 ef:"zoom",                 // pohyb jen u statických obrázků: zoom | shake | press | tilt | slide | bounce
 e:"🧮",                    // záložní emoji, když se obrázek nenačte
 w:{BA:3, PE:2},            // kolik bodů komu odpověď dá
 why:"měříš dopady v číslech"}  // objeví se ve výsledku v „Proč to sedí"
```

- **Jiný meme:** nahraď soubor v `memes/` nebo přepiš `m`.
- **Jiný pohyb:** přepiš `ef`. Pohyb je schválně jemný, aby byl obrázek vidět celý.
- **GIFy z GIPHY:** stáhni MP4 verzi (`https://media.giphy.com/media/<ID>/giphy.mp4`), převeď ji a ulož do `memes/` spolu s náhledem:
  `ffmpeg -i giphy.mp4 -an -vf "scale='min(480,iw)':-2,fps=min(source_fps\,24),format=yuv420p" -c:v libx264 -crf 27 -movflags +faststart jmeno.mp4`
  `ffmpeg -i jmeno.mp4 -frames:v 1 -q:v 4 jmeno.jpg`
  MP4 telefon dekóduje hardwarově, takže nelaguje jako animované WebP/GIF (ty fungují taky, ale sekají se).
- **Vážná otázka jako vtipná (nebo naopak):** přepiš `tone`.
- **Jiný obor:** obory jsou v `PROGRAMS` nahoře.
- **Návrat na úvod, když na stánku nikdo nehraje:** `IDLE_MS` (teď 90 s bez dotyku).
  Hra sama žádný časový limit nemá, uchazeč může nad každou otázkou přemýšlet, jak dlouho chce.

## Jak se počítá shoda

Každá vybraná odpověď rozdá body konkrétním oborům (`w`).
Procento = podíl bodů vítěze na všech udělených bodech, přepočtený do rozmezí 78–98 %.
Kdo vybírá jedním směrem, dostane 96–98 %. Kdo míchá, dostane kolem 80 %.
Kdo přeskočí všechny otázky, uvidí obrazovku „Žádný match".

## Zdroje GIFů

Živé GIFy jsou z GIPHY, uložené jako `.mp4` (+ náhled `.jpg`) ve `memes/`. Pro schválení licencí:

| Soubor | Odpověď | GIPHY |
|---|---|---|
| `krabs-money.mp4` | 1A propočítám ztrátu | https://giphy.com/gifs/SOmjomEnNHsrK |
| `kabely-chaos.mp4` | 1B zkontroluju kabely | https://giphy.com/gifs/blHeoPXYVzsh8hbEUk |
| `yapping-telefon.mp4` | 1C volám providerovi | https://giphy.com/gifs/BOor7jsYY2JGa8cvtY |
| `stonks.mp4` | 3A vidět do budoucnosti | https://giphy.com/gifs/XDAY1NNG2VvobAp9o0 |
| `bryle-zkoumam.mp4` | 3B rentgenový zrak | https://giphy.com/gifs/cM2CN5U99VVWdDGcSA |
| `neuron-activation.mp4` | 3C telepatie | https://giphy.com/gifs/n6o5muKaBkYqP0eTUC |
| `superman-poza.mp4` | 3D opravit motor | https://giphy.com/gifs/kCd6XpV0TOMmmjqvo8 |
| `auto-chudy.mp4` | 3E teleportace zboží (auto na chůdách přes zácpu) | https://giphy.com/gifs/CZDVvQn78njFu |
| `vlk-mikrofon.mp4` | Ing. 2A Vlk z Wall Street (Leo s mikrofonem) | https://giphy.com/gifs/Vi4MRwWi9sYpi |
| `pepe-silvia.mp4` | Ing. 2B Sherlock Holmes | https://giphy.com/gifs/icgArcntfH5C0 |
| `stark-endgame.mp4` | Ing. 2C Tony Stark (Endgame, pohled na Steva) | https://giphy.com/gifs/NDzVwpclOqiprMcfLZ |
| `ted-profesor.mp4` | Ing. 2D Ted Mosby | https://giphy.com/gifs/kvcqO3ojVie2I |
| `sparrow-pristav.mp4` | Ing. 2E kapitán lodi (Jack Sparrow připlouvá do přístavu) | https://giphy.com/gifs/o0eOCNkn7cSD6 |

Řádky bez „Ing." jsou bakalářské otázky.

## Světlý režim

Appka se řídí nastavením telefonu (světlý / tmavý). Tlačítkem ☀ / ☾ v liště se dá přepnout ručně, volba se pamatuje v prohlížeči.

## Formulář a GDPR

Na výsledku vyplní uchazeč **jméno, příjmení a e-mail** a zaškrtne:

- **povinný souhlas**: je mu alespoň 15 let a souhlasí se zpracováním údajů pro zaslání výsledku
  a informací o doporučeném oboru,
- **nepovinný souhlas**: novinky o přijímačkách, dnech otevřených dveří a akcích.

Odkaz „Zásady zpracování osobních údajů“ otevře plné znění přímo v appce
(lze ho otevřít i přímo adresou `…/vste-matcher/#zasady`, ta je i v patičce e-mailu).
U každého kontaktu se ukládá verze a přesné znění souhlasu a čas udělení (čl. 7 odst. 1 GDPR: souhlas musí jít doložit).

Nastavení je v `index.html` v bloku `ODESÍLÁNÍ A GDPR: NASTAVENÍ` (`ZASADY.verze`, `uchovatDo`, `zpracovatel`).
Když se změní text zásad nebo souhlasu, **zvyš `ZASADY.verze`**.

## Odesílání e-mailů

GitHub Pages je statický web, sám e-maily posílat neumí. Odesílání obstará **Google Apps Script**
napojený na Google tabulku. Kód je hotový v [`backend/apps-script.gs`](backend/apps-script.gs).

Jak to funguje: uchazeč odešle formulář → kontakt se uloží do zařízení stánku → appka ho pošle
do Apps Scriptu → ten ho zapíše do tabulky a pošle uchazeči e-mail s výsledkem → appka kontakt
ze zařízení smaže. Když na stánku nejde internet, kontakt počká a odešle se sám, jakmile se
připojení vrátí (zkouší to každou minutu).

### Nasazení (cca 15 minut)

1. Přihlas se **školním Google účtem VŠTE**, ne soukromým Gmailem (kvůli GDPR a limitům:
   školní Workspace pošle až 1 500 e-mailů denně, soukromý Gmail jen 100).
   Pokud škola Google Workspace nemá, viz „Varianta Microsoft 365“ níž.
2. Vytvoř novou Google tabulku, třeba „VŠTE Matcher kontakty“. Nesdílej ji s nikým mimo pověřené lidi.
3. V tabulce: **Rozšíření → Apps Script**. Smaž ukázkový kód a vlož celý obsah `backend/apps-script.gs`.
4. Nahoře v souboru vyplň `ODPOVEDI_NA` (např. adresu studijního oddělení), do `UPOZORNENI_NA` dej schránku,
   kam má po každém vyplnění přijít upozornění s kontaktem a oborem (víc adres odděl čárkou), a zkontroluj `KLIC`.
5. Vyber funkci **`test`** a dej **Spustit**. Google se zeptá na oprávnění (tabulka + odesílání pošty),
   povol je. Do schránky ti má přijít testovací e-mail. Takhle bude vypadat i e-mail uchazeče.
6. Vyber funkci **`nastavUklid`** a jednou ji spusť. Tím se zapne denní mazání starých záznamů (doba uchování podle zásad).
7. **Nasadit → Nové nasazení → typ Webová aplikace**:
   - Spustit jako: **Já**,
   - Kdo má přístup: **Kdokoli** (appka na stánku se nepřihlašuje).
   Zkopíruj adresu, která končí na `/exec`.
8. V `index.html` vlož tu adresu do `ODESILANI.url`, commitni a pushni.
9. Zkus to celé na telefonu: projdi kvíz, vyplň svůj e-mail, odešli. Řádek se objeví v tabulce a přijde e-mail.

Při každé změně `apps-script.gs` je potřeba **Nasadit → Spravovat nasazení → upravit → Nová verze**,
jinak běží stará verze.

### Z jaké adresy e-maily odcházejí

Skript posílá e-maily z Google účtu, pod kterým je nasazený. Jsou tři možnosti:

1. **Nejjednodušší:** nasaď skript přímo pod účtem, ze kterého mají e-maily chodit
   (třeba sdílený školní účet `matcher@…`). `ODESILAT_Z` nech prázdné.
2. **Jiná adresa jako odesílatel:** v Gmailu účtu se skriptem otevři **Nastavení → Účty a import →
   Odesílat poštu jako → Přidat další e-mailovou adresu**, zadej adresu a potvrď ji kódem, který na ni přijde.
   U adresy mimo Google (např. školní Outlook) chce Gmail SMTP server a heslo té schránky,
   u Microsoft 365 to bývá `smtp.office365.com`, port 587, a IT ho musí mít povolené.
   Pak tu adresu vyplň do `ODESILAT_Z` a znovu nasaď (Spravovat nasazení → Nová verze).
   Při dalším spuštění `test` Google požádá o oprávnění ke Gmailu.
3. **Jen odpovědi jinam:** e-maily odejdou z účtu skriptu, ale „Odpovědět“ míří na `ODPOVEDI_NA`
   (např. studijní oddělení). Uchazeč to skoro nepozná a nic dalšího se nastavovat nemusí.

Upozornění na nové kontakty (`UPOZORNENI_NA`) můžou chodit na jakoukoli adresu, i mimo Google.
Kdo chce kopii jinam, může si ve své schránce nastavit pravidlo, které zprávy s předmětem
začínajícím „Matcher:“ přeposílá dál.

### Varianta Microsoft 365 (Power Automate)

Pokud škola jede na Microsoft 365: v Power Automate vytvoř tok „Při přijetí požadavku HTTP“ →
„Přidat řádek do tabulky“ (Excel v SharePointu) → „Odeslat e-mail (V2)“ ze sdílené schránky.
Adresu požadavku dej do `ODESILANI.url`. Tok musí vracet JSON `{"ok": true}`, appka podle toho
pozná úspěch. Trigger HTTP vyžaduje licenci Power Automate Premium. Pak v `ZASADY.zpracovatel`
změň zpracovatele na Microsoft Ireland Operations Ltd.

## Co je potřeba dořešit před spuštěním

1. **Schválení zásad pověřencem.** Text zásad (obrazovka v appce) a souhlasů je připravený podle GDPR,
   ale není to právní posudek. Pošli ho pověřenci VŠTE (FairData Professionals a.s.,
   dpo.vstecb@fairdata.cz) ke schválení. Hlavně dobu uchování (31. 10. 2027) a zpracovatele.
2. **Záznam o činnostech zpracování** (čl. 30 GDPR). Pověřenec ho doplní do evidence školy.
3. **Zpracovatelská smlouva.** U Google Workspace / Microsoft 365 ji škola obvykle už má. Ověřit s IT.
4. **Kdo má přístup k tabulce.** Jen pověření lidé (studijní oddělení, marketing).
5. **Odvolání souhlasu.** Když někdo odpoví na e-mail nebo napíše pověřenci, smaž jeho řádek z tabulky
   (do 30 dnů, čl. 12 odst. 3 GDPR).
6. **Licence memů.** GIFy jsou záběry z filmů a seriálů. Na oficiální appce školy to musí někdo odkývat.
7. **Logo.** Teď je to typografický lockup. Pokud existuje schválené logo VŠTE v SVG, patří sem.

## Vizuál

Podle `VSTE_Matcher_vizualni_zadani.docx`: výrazně oblé rohy, velká tučná typografie,
černobílé plochy s červenou a růžovou, výsledková obrazovka jako vizuální vrchol.

| Barva | HEX |
|---|---|
| Tmavě červená | `#9E1B19` |
| Červená | `#C61517` |
| Černá | `#000000` |
| Šedá | `#B9B6BA` |
| Fialová (akcent) | `#9442CE` |
| Růžová (akcent) | `#DD3ECA` |
| Bílá | `#FFFFFF` |

Písmo: Archivo (nadpisy a text), IBM Plex Mono (popisky).

Claim: **Najdi obor, který ti sedí.**
