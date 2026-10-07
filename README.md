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
Z internetu se tahá jen písmo z Google Fonts — když vypadne, naskočí systémové.

## Ovládání

| Dotyk | Klávesa | Co to udělá |
|---|---|---|
| klepnutí na odpověď / dlaždici | 1–5 | vybere odpověď, jde se na další otázku |
| „Nic z toho — přeskočit" | 0 | otázka se přeskočí bez bodů |
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

Písmo: Archivo (nadpisy a text), IBM Plex Mono (popisky).

Claim: **Najdi obor, který ti sedí.**
