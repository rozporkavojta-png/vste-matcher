# VŠTE Matcher

Oborová kalkulačka pro stánek VŠTE na Gaudeamu. Uchazeč ji proklikne za minutu
a dozví se, který studijní program mu sedí nejvíc.

Funguje to jako Tinder, ale místo lidí swipuješ odpovědi: otázka visí nad balíčkem
a listuješ jejími možnostmi, dokud jedna nesedne.

## Jak to spustit

Jeden soubor, žádný build, žádné závislosti.

- **Na počítači:** poklikej na `index.html`.
- **Na tabletu nebo telefonu:** nahraj `index.html` i složku `memes/` na web
  (stačí libovolný statický hosting) a otevři v prohlížeči.
- **Lokálně přes server** (když chceš testovat jako na ostro):
  `python -m http.server 8000` → http://localhost:8000

Memy jsou uložené vedle v `memes/`, takže appka jede i **bez internetu**.
Z internetu se tahá jen písmo z Google Fonts — když vypadne, naskočí systémové.

## Ovládání

| Gesto | Klávesa | Co to udělá |
|---|---|---|
| swipe doleva | ← | tahle odpověď ne, ukaž další možnost |
| swipe doprava | → | to jsem já — vybráno, jde se na další otázku |
| swipe nahoru | ↑ | přesně já — vybráno a počítá se dvojnásobně |
| — | Backspace | zpět o kartu |
| — | Esc | restart |
| — | 1 / 2 | výběr ligy na úvodní obrazovce |

**Obsluha stánku:** pětkrát rychle kliknout na logo „VŠTE Matcher" vlevo nahoře.
Otevře se skrytá obrazovka se sebranými e-maily a tlačítkem na zkopírování CSV.

## Co kde změnit

Všechno je v `index.html`, v sekci `QUIZ` ve `<script>`.

Jedna odpověď vypadá takhle:

```js
{t:"Propočítám ztrátu produktivity v korunách za minutu.",  // text na kartě
 m:"rollsafe.jpg",          // soubor ze složky memes/
 ef:"zoom",                 // pohyb: zoom | shake | press | tilt | slide | bounce
 e:"🧮",                    // záložní emoji, když se obrázek nenačte
 top:"",                    // horní titulek přes obrázek
 bot:"Nepřijdeš o peníze,\nkdyž si ztrátu spočítáš",   // spodní titulek, \n = nový řádek
 w:{BA:3, PE:2},            // kolik bodů komu odpověď dá
 why:"měříš dopady v číslech"}  // objeví se ve výsledku v „Proč to sedí"
```

- **Jiný meme:** nahraď soubor v `memes/` nebo přepiš `m`.
- **Jiný pohyb:** přepiš `ef`. Spodní titulek vždy naskočí až v „ráně" smyčky.
- **Jiný obor:** obory jsou v `PROGRAMS` nahoře.
- **Odznaky a XP:** `BADGES` a `RANKS`.
- **Doba do automatického restartu:** `IDLE_MS` (teď 90 s).

## Jak se počítá shoda

Každá vybraná odpověď rozdá body konkrétním oborům (`w`), hvězdička je počítá dvojnásobně.
Procento = podíl bodů vítěze na všech udělených bodech, přepočtený do rozmezí 78–98 %.
Kdo vybírá jedním směrem, dostane 96–98 %. Kdo míchá, dostane kolem 80 %.
Kdo přeskočí všechny otázky, uvidí obrazovku „Žádný match".

## E-maily

Zadané e-maily se **zatím nikam neodesílají** — ukládají se jen do prohlížeče toho
zařízení (`localStorage`) a vytáhnou se přes skrytou obrazovku obsluhy jako CSV.
Pro ostrý provoz je potřeba to napojit na formulář nebo mailing nástroj.

## Co je potřeba dořešit před nasazením

1. **Licence memů.** Šablony jsou záběry z filmů a fotky skutečných lidí, stažené
   z veřejného API imgflip.com. Na oficiální appce školy to musí někdo odkývat.
   Když ne, nahradí se vlastní grafikou — layout i titulky zůstanou.
2. **Logo.** Teď je to typografický lockup. Pokud existuje schválené logo VŠTE v SVG,
   patří sem.
3. **Souhlas se zpracováním.** Text u zaškrtávátka je provizorní, musí ho schválit
   marketing nebo pověřenec pro GDPR.
4. **Odesílání e-mailů** — viz výš.

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

Písmo: Archivo (nadpisy a text), Anton (titulky na memech), IBM Plex Mono (popisky).

Claim: **Najdi obor, který ti sedí.**
