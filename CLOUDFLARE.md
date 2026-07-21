# Nasazení na Cloudflare Pages (napojené na GitHub)

Aplikace je statická, žádný build. Cloudflare ji bude servírovat z kořene subdomény,
takže poběží na `https://pl-tatry-2026.pages.dev/` bez úprav kódu.

## Postup (jednorázově, ~3 minuty)

1. Přihlas se na <https://dash.cloudflare.com> (zdarma; případně si založ účet).
2. V levém menu **Workers & Pages** → **Create** → záložka **Pages** →
   **Connect to Git**.
3. **Autorizuj Cloudflare pro GitHub** a vyber repozitář **`pl_tatry_2026`**.
   - Můžeš povolit přístup jen k tomuto jednomu repozitáři.
4. Na obrazovce **Set up builds and deployments** nech vše prázdné:

   | Pole | Hodnota |
   |---|---|
   | Framework preset | **None** |
   | Build command | *(nech prázdné)* |
   | Build output directory | **`/`** |

5. Klikni **Save and Deploy**. Za ~1 minutu dostaneš adresu
   `https://pl-tatry-2026.pages.dev/` (název podle repozitáře).

Od té chvíle se **každý push do větve `main` nasadí sám**.

## Na iPhone

Adresu `https://pl-tatry-2026.pages.dev/` otevři v **Safari** →
tlačítko **Sdílet** → **Přidat na plochu**.

## Proč Cloudflare místo GitHub Pages

- Servíruje z kořene subdomény, ne z podsložky — čistší adresa.
- Rychlejší globální CDN.
- `_headers` v repozitáři zařídí, že se service worker (`sw.js`) necachuje a nová
  verze appky se po nasazení sama projeví.

## Když se nová verze na telefonu neukáže

Service worker drží starou verzi. Smaž ikonu z plochy, otevři adresu v Safari znovu
a přidej na plochu. Při skutečné změně kódu navíc zvyš verzi v `sw.js`
(`const V = "t26-v4"` → `"t26-v5"`).
