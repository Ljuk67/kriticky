# Kritické myslenie v praxi

Tento projekt je osobný blog o kritickom myslení a jeho využití v každodennom živote.  
Cieľom je ukázať, ako odlíšiť fakty od hoaxov, odhaliť manipulatívne techniky a nenechať sa nachytať populizmom.

Upevniť a rozšíriť kritické myslenie u bežných ľudí.

## Technológie
- [Astro](https://astro.build/) – statický generátor webov, rýchle načítavanie
- Markdown/MDX – články sú písané v jednoduchom formáte
- Pagefind – vyhľadávanie priamo na stránke
- giscus – komentáre čitateľov cez GitHub Discussions
<hr/>

## Kontrola odkazov (link checker)
- Po každom build-e beží automatická kontrola odkazov (postbuild). Ak nájde nefunkčné interné odkazy, build zlyhá.
- Ručné spustenie:
  - `npm run check:site` – skontroluje odkazy v `dist/` (interné, offline).
  - `npm run check:site -- --external` – pridá kontrolu externých odkazov (HTTP statusy).
  - `npm run check:site -- --check-anchors` – overí aj `#kotvy` (ID) na cieľových stránkach.
- Pripomienka raz za čas: `npm run linkcheck:remind` upozorní, ak kontrola neprebehla dlhšie než 30 dní.

## Poznámky ako pop up (footnotes)
- Časté pojmy a vysvetlenia udržuj v `public/footnotes-terms.json` (automaticky sa aplikujú naprieč webom).
- V článkoch používaj inline formát: `<span class="fn" data-footnote="Krátke vysvetlenie.">termín</span>`.
- Nepoužívaj vnútri odkazov ani kódu; zvyčajne stačí jedna poznámka na termín a stránku.
