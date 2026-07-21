# Tatry 2026 — PWA

Plánovací a rozhodovací nástroj pro pobyt **25. 7. – 1. 8. 2026**, základna Hotel Zawrat, Białka Tatrzańska.
Implementuje zadání `tatry_2026_claude.md` v1.2 + databázi `source_data.json` v1.0.

## Jak to dostat na iPhone

Aplikace potřebuje běžet přes HTTPS (kvůli service workeru a geolokaci). Nejrychlejší cesty:

**A) Netlify Drop — bez účtu, ~30 s**

1. Otevři <https://app.netlify.com/drop>
2. Přetáhni tam **celou složku `tatry2026`**
3. Dostaneš adresu typu `https://neco-nahodneho.netlify.app`
4. Otevři ji na iPhonu v **Safari** → tlačítko Sdílet → **Přidat na plochu**

**B) GitHub Pages**

1. Nový repozitář → nahraj obsah složky do kořene
2. Settings → Pages → Source: `main` / root
3. Adresa `https://<uživatel>.github.io/<repo>/` → v Safari přidat na plochu

**C) Lokální test na počítači**

```bash
cd tatry2026 && python3 -m http.server 8080
# → http://localhost:8080
```

> Otevření `index.html` dvojklikem z Finderu **nebude fungovat správně** (`file://` blokuje service worker a načítání mapy).

Po přidání na plochu se appka spouští na celou obrazovku bez adresního řádku a funguje i offline —
při prvním spuštění s připojením si stáhne shell, dlaždice navštívených výřezů mapy a předpověď.

## Struktura

| Soubor | Obsah |
|---|---|
| `index.html` | kostra UI, styly, bottom navigace |
| `app.js` | rozhodovací engine §7, mapa, render všech obrazovek |
| `data.js` | `days` (Den 1–8), `poi`, `source_data` (40 tratí + 20 aktivit), `config` (prahy) |
| `i18n.js` | CZ / PL / SK / EN |
| `sw.js` | offline cache — shell, mapové dlaždice (max 1200), předpověď |
| `manifest.webmanifest`, `icon-*.png` | instalovatelnost |

## Obrazovky

- **Dnes** — karta aktuálního dne: typ (AKTIVNÍ/RELAXAČNÍ), verdikt Go/No-Go, pět metrik okna 11–18 h,
  východ/západ slunce, doporučený start, nejzazší bezpečný návrat, hodinový pruh, program, logistický tip.
  Při No-Go se nabídne prohození se dnem ze `swappable_with`; při dešti plán B z aktivit `weather_dependent:false`.
- **Dny** — přehled všech 8 dní s verdiktem, klik otevře detail.
- **Mapa** — MapLibre GL, přepínatelné vrstvy (túry / voda / e-bike / wellness / jídlo / parking),
  tři podklady (vektorový OpenFreeMap, OpenTopoMap, OSM), popup s detailem a odkazem do navigace.
- **Trasy** — všech 40 tratí, filtr podle T1–T4 a oblasti, legenda klasifikace §13.
- **Relax** — 20 aktivit s filtrem kategorií + nastavení.

## Rozhodovací engine (§7)

Vyhodnocuje okno 11:00–18:00 nad předpovědí **nejvyššího bodu trasy** (ne trailheadu — poryvy na hřebeni
jsou to, co rozhoduje). Prahy jsou v `data.js` → `config.thresholds`, u tras `hard_strict` (T4) se násobí
`strict_factor` 0,6.

| Metrika | Zelená | Žlutá | Červená |
|---|---|---|---|
| Bouřka | < 20 % | 20–40 % | > 40 % |
| Srážky | < 1 mm/h | 1–4 | > 4 |
| Poryvy | < 45 km/h | 45–65 | > 65 |
| Oblačnost | < 40 % | 40–75 | > 75 |
| Pocitová teplota | 8–26 °C | 3–8 / 26–30 | < 3 / > 30 |

Chování: `hard` + červená → **No-Go** a návrh prohození; červená až po 14. hodině → **posun startu**
na východ slunce + 30 min; `soft` (voda, e-bike, T1) → červená znamená „pláštěnka / zkrátit", ne zákaz;
`RELAX` → počasí neblokuje, jen se upřednostní indoor aktivity.

**Pozn. k bouřkám:** Open-Meteo neposkytuje přímé „thunderstorm probability". Hodnota se odvozuje
z `weather_code` (95/96/99), `cape` a pravděpodobnosti srážek — konzervativně, spíš přestřelit než podstřelit.

## Testování

V záložce **Relax → Nastavení** je přepínač *Simulace bouřky* — nastaví bouřku na 65 % a umožní
ověřit No-Go i za pěkného počasí. V konzoli prohlížeče lze spustit `selfTest()` (kontroly z §11).

## Před cestou ověřit (§12)

Ceny a otevírací doby: splav Dunajce ~99–140 zł/os., Terma Bania 9:00–22:00, lanovka Kasprowy Wierch
na časové sloty (rezervovat online). Délky a časy tratí jsou orientační odhady round-trip.
Aktuální omezení a uzavírky vždy na stránkách TPN a PPN.

## Co zatím není (V2 dle §3)

Vodočet Dunajce, predikce obsazenosti parkingů a lanovky, webkamery, GPX overlay s profilem převýšení,
push notifikace.
