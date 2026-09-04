# DonX

Expo / React Native aplikácia. iOS bundle: `com.donkezz.donxtrade`

DonX je aplikácia na lokálnu ponuku a dopyt — inzeráty medzi ľuďmi v okolí.
Rozsah je široko definovaný: od predaja vecí až po zoznamovanie. Cieľová skupina
sú bežní používatelia, nie odborníci, takže priorita je **jednoduchosť a rýchlosť
pred množstvom funkcií**. Keď sa funkcia dá spraviť na jednej obrazovke alebo na
troch, ber jednu. Pri pochybnosti škrtaj.

## Expo HAS CHANGED

Pred písaním kódu si prečítaj presne verziované docs na
https://docs.expo.dev/versions/v56.0.0/ — nespoliehaj sa na pamäť starších Expo
alebo React Native API.

## Verzie

Expo SDK 56 · expo-router 56 · React 19.2 · React Native 0.85 · TypeScript 6.0

Nepoužívaj vzory zo starších SDK. Pri neistote over v docs vyššie.

## Od začiatku pre viac krajín

Aplikácia je navrhnutá ako multijazyčná a určená na rýchle rozšírenie do ďalších
krajín. Nikdy nepredpokladaj jeden jazyk, jednu krajinu, jednu menu ani jeden
formát dátumu.

- **Žiadny text pre používateľa priamo v kóde.** Všetko cez `t()` a do všetkých
  piatich locale súborov v `src/i18n/` (`sk`, `en`, `pl`, `hu`, `uk`). Kľúč
  doplnený len do jedného súboru je nedokončená zmena.
- **Žiadna natvrdo napísaná mena.** Žiadne `€`, žiadny predpokladaný počet
  desatinných miest. Suma je hodnota plus kód meny, formátovaná cez
  `src/utils/currency.ts`, ktoré berie menu z regiónu zariadenia a formát
  z aktívneho jazyka.
- **Žiadne natvrdo napísané formáty dátumu, času a čísel.** Používaj `Intl` —
  nikdy pevné `DD.MM.YYYY` ani predpokladanú desatinnú čiarku.
- **Neodvodzuj krajinu z jazyka ani jazyk z krajiny.** Sú to samostatné veci.
- **Neskloňuj skladaním** `{počet} {slovo}`. Slovenčina, poľština a ukrajinčina
  menia tvar podľa čísla — „1 dni" je nesprávne. Pri pevnej sade hodnôt daj
  každej vlastný kľúč, inak použi nemenné skratky (`d`, `h`, `min`).
- V layoutoch nechaj miesto na dlhší text — preklady bývajú výrazne dlhšie ako
  slovenský alebo anglický originál.

## Príkazy

| Čo | Príkaz |
|---|---|
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Oboje naraz | `npm run release:check` |
| Dev server | `npm start` |
| Build | `eas build --profile <development\|preview\|production>` |

Po každej zmene kódu spusti `npm run typecheck` a `npm run lint`. Neohlasuj úlohu
za dokončenú, kým oba neprejdú.

## Overovanie

Projekt nemá testy. Automatická verifikácia = typecheck + lint. Nikdy netvrď, že
„testy prešli".

Typecheck a lint ale nechytia chyby za behu. Pri zmene, ktorá sa dá vidieť, ju
spusti v iOS simulátore — nepýtaj používateľa, nech to overí za teba.

- **Appka nebeží v Expo Go** (natívne moduly: mapy, glass effect, `@expo/ui`).
  Potrebuje vlastný dev build: `npx expo run:ios`.
- **Neoveruj správanie za behu v Node.** Node má plné ICU, appka beží na Hermese,
  kde je `Intl` osekaný — `formatToParts`, `resolvedOptions` či `PluralRules`
  nemusia existovať. Čo prejde v Node, môže na zariadení spadnúť.
- **Nikdy neposielaj do TestFlightu zmenu, ktorú si nespustil.** Stalo sa to a
  build padal používateľovi hneď po otvorení.

## Štruktúra

- `src/app/` — expo-router routes (file-based routing)
- `src/components/` — komponenty
- `src/components/ui/` — základné UI prvky
- `src/context/` — React Context, stav aplikácie
- `src/hooks/` — custom hooks
- `src/constants/` — konštanty
- `src/utils/` — pomocné funkcie bez väzby na React
- `src/i18n/` — lokalizácia

Routing je file-based — nové obrazovky vznikajú vytvorením súboru v `src/app/`,
nie registráciou v konfigu.

## Konvencie

- TypeScript, žiadne `any` bez komentára prečo
- Stav cez React Context (`src/context/`), nepridávaj state manažér
- Nové texty do `src/i18n/`, nie natvrdo do komponentov
- Drž existujúci štýl súboru, ktorý upravuješ
- Pozor na medzery medzi JSX elementmi na jednom riadku — JSX ich zachová ako
  textový uzol a React Native spadne na „Text strings must be rendered within
  a `<Text>` component"

## TestFlight je vopred odsúhlasený

Majiteľ projektu dal trvalý súhlas na buildy do TestFlightu. Nepýtaj sa naň
zakaždým — po zmene, ktorá má ísť testerom, build spusti:

```
npx eas-cli@latest build --platform ios --profile production --auto-submit --non-interactive
```

Platí to za týchto podmienok, a tie nie sú na dohodnutie:

- **`npm run release:check` musí prejsť.** Lint aj typecheck, bez errorov.
- **Zmenu si spustil.** Čo sa dá vidieť, over v iOS simulátore. Build 6 išiel
  testerom s pádom práve preto, že sa to preskočilo.
- **Buduje sa z `main`.** Cez čistý worktree na `origin/main`, nie z rozrobenej
  vetvy. Do `main` sa ide cez PR, takže bránou je merge, nie otázka pred buildom.
- **Ak čokoľvek z toho neplatí, build nespúšťaj** a povedz prečo. To nie je
  žiadosť o povolenie, je to odmietnutie poslať von rozbitú vec.

Vydanie do App Store pre verejnosť odsúhlasené **nie je** a pýta sa zvlášť —
TestFlight ide interným testerom, App Store komukoľvek.

## Nikdy bez opýtania

- `npm run reset-project` — maže štartovací app adresár, NIKDY nespúšťať
- Vydanie do App Store a čokoľvek do App Review (TestFlight je výnimka vyššie)
- `git reset --hard`, prepisovanie histórie, force push
- Pridávanie, odoberanie alebo upgrade závislostí
- Zmeny v `eas.json`, `app.json`, `.env*`
- Mazanie súborov alebo dát a čokoľvek ťažko vratné
- Čokoľvek iné, čo odchádza zo stroja — publikovanie, odosielanie, postovanie

## Nedokončené

- `android.package` v `app.json` nie je nastavený → Android build zlyhá
- Mince sa nepredávajú a predávať sa nebudú, kým na to nie je živnosť. Žiadne
  in-app purchase, žiadne reálne platby. Označenie „fiktívne kredity" v textoch
  je pravdivé a má tam zostať.
- Nekonečné dobitie zadarmo v profile (`topUpWallet`) je dočasná barla. Kým
  neexistuje zarábanie mincí za aktivitu, je to jediný zdroj — a zároveň dôvod,
  prečo mince nemajú hodnotu. Nahradiť, nie len odobrať.
- `src/components/ui/WheelPicker.tsx` už nikto nepoužíva
- V `src/app/create.tsx` zostáva sedem slovenských textov mimo i18n
- `src/components/animated-icon.web.tsx` a `src/constants/theme.ts` majú
  zastubované importy CSS súborov, ktoré existujú → rozbité štýly na webe
