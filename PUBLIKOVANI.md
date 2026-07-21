# Publikování na GitHub Pages — repozitář `pl_tatry_2026`

Složka je připravená jako hotový git repozitář: první commit je hotový, workflow pro Pages přiložený.
Zbývá ji dostat na GitHub a zapnout Pages. Vyber si jednu ze dvou cest.

---

## Cesta A — přes web, bez terminálu

1. Otevři svůj repozitář `pl_tatry_2026` na github.com.
2. Klikni na **Add file → Upload files** (u prázdného repozitáře je i odkaz *uploading an existing file*).
3. V Finderu otevři složku `tatry2026`, stiskni **⌘A** (vybrat vše) a soubory přetáhni do okna prohlížeče.
   - Pokud nevidíš `.nojekyll`, zapni v Finderu skryté soubory přes **⌘⇧.** (tečka).
   - Složku `.github` web-upload neumí přetáhnout. Nevadí — v kroku 5 zvol *Deploy from a branch*.
4. Dole napiš popis commitu a klikni **Commit changes**.
5. **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   Branch: **main**, složka **/ (root)** → **Save**.
6. Počkej 1–2 minuty. Adresa se objeví nahoře na téže stránce.

---

## Cesta B — přes terminál (3 příkazy)

Otevři Terminál a vlož (nahraď `<uživatel>` svým GitHub jménem):

```bash
cd "<cesta ke složce tatry2026>"
git remote add origin https://github.com/<uživatel>/pl_tatry_2026.git
git push -u origin main
```

Cestu ke složce nemusíš psát — napiš `cd ` (s mezerou) a pak složku přetáhni z Finderu do okna Terminálu.

**Když push skončí chybou `rejected`** (repozitář už obsahuje README, který za tebe vytvořil GitHub):

```bash
git push -u origin main --force
```

Je to bezpečné — přepíše se jen ten uvítací README, nic jiného v repozitáři zatím není.

**Přihlášení:** při prvním pushi si Git řekne o heslo. GitHub běžné heslo nepřijímá — potřebuje
*personal access token* (github.com → Settings → Developer settings → Personal access tokens →
Fine-grained tokens → *Generate new token*, přístup **Contents: Read and write** k tomuto repozitáři).
Token vlož místo hesla. Alternativně nainstaluj **GitHub CLI** (`brew install gh`, pak `gh auth login`),
což přihlášení vyřeší v prohlížeči.

Pak **Settings → Pages → Source: GitHub Actions**. Přiložený workflow `.github/workflows/pages.yml`
se spustí sám a při každé další změně nasadí novou verzi.

---

## Výsledek

```
https://<uživatel>.github.io/pl_tatry_2026/
```

Tuhle adresu otevři na iPhonu **v Safari** (ne v Chrome — přidání na plochu umí jen Safari) →
tlačítko **Sdílet** → **Přidat na plochu**. Appka se pak spouští na celou obrazovku bez adresního
řádku a funguje i bez signálu.

---

## Když něco nesedí

**Stránka je prázdná / bílá.** Pages ještě běží, dej tomu dvě minuty. Pak zkontroluj, že `index.html`
leží v kořeni repozitáře, ne uvnitř další podsložky `tatry2026/`.

**Mapa se nenačte.** Zkus na mapě přepnout podklad na **OSM** nebo **Topo** — vektorový podklad jede
z OpenFreeMap, který občas limituje provoz. Fallback je v aplikaci zabudovaný, ale ruční přepnutí je jistota.

**Změny se na iPhonu neprojeví.** Service worker drží starou verzi. Smaž ikonu z plochy, v Safari
otevři adresu znovu a přidej na plochu. Při každé opravdové změně kódu zvyš verzi v `sw.js`
(`const V = "t26-v3"` → `"t26-v4"`) — pak se cache obnoví sama.

**Repozitář je soukromý.** Pages ze soukromého repozitáře potřebují GitHub Pro. Buď přepni na veřejný
(Settings → dole *Change visibility*), nebo appku nasaď na Netlify Drop.
