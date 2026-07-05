# 🚀 Návod: Ako dostať Donx do TestFlight (cez Expo EAS)

Pre nahranie Expo aplikácie do Apple TestFlight využijeme **EAS (Expo Application Services)**. Tento proces zbalí tvoju aplikáciu na serveroch Expo a automaticky ju odošle do Apple App Store Connect (TestFlight).

Nasleduj tieto kroky:

---

## 1️⃣ Krok: Prihlásenie do Expo a prvá konfigurácia

V termináli v priečinku projektu (`/Users/donkezz/Developer/Mobile_Apps/donx`) spusti prihlasovací príkaz:

```bash
npx eas login
```
*(Zadaj svoje Expo prihlasovacie meno a heslo.)*

Následne inicializuj EAS projekt:

```bash
npx eas project:init
```
*   Spýta sa ťa, či chceš vytvoriť nový projekt v Expo. Zvoľ **Áno (Yes)**.
*   Týmto sa ti do `app.json` automaticky pridá unikátne `projectId`.

---

## 2️⃣ Krok: Vygenerovanie `eas.json` (Konfigurácia buildov)

Spusti konfiguračný príkaz, ktorý ti vygeneruje súbor `eas.json`:

```bash
npx eas build:configure
```
*   Zvoľ platformu: **iOS** (alebo All, ak chceš aj Android).
*   Tento príkaz ti vytvorí súbor `eas.json` s profilmi pre vývoj, preview a produkciu.

---

## 3️⃣ Krok: Nastavenie App ID a Build Number (`app.json`)

Apple vyžaduje unikátny identifikátor aplikácie (`bundleIdentifier`) a číslo buildu (`buildNumber`).

Uprav v `app.json` časť pre `ios`:

```json
"ios": {
  "bundleIdentifier": "com.donkezz.donxtrade",
  "buildNumber": "1",
  "supportsTablet": true
}
```

> [!IMPORTANT]
> Pred **každým jedným** novým buildom, ktorý posielaš do TestFlightu, musíš manuálne zvýšiť `buildNumber` v `app.json` o 1 (napr. z `"1"` na `"2"`). Inak Apple build zamietne ako duplicitný.

---

## 4️⃣ Krok: Spustenie buildu a odoslanie do TestFlightu

Na samotné zostavenie aplikácie a jej automatické odoslanie do App Store Connect (TestFlight) použi tento jeden príkaz:

```bash
npx eas build --platform ios --profile production --auto-submit
```

### Čo sa stane po spustení:
1.  **Overenie Apple Developer účtu:** EAS sa ťa spýta na tvoje Apple ID, aby si vygenerovalo potrebné certifikáty a Provisioning profily (ak ich ešte nemáš vytvorené, Expo to urobí za teba na pozadí).
2.  **Kompilácia na Expo cloude:** Tvoj kód sa odošle na servery Expo, kde sa spustí macOS virtuálny stroj a aplikáciu skompiluje. V termináli uvidíš odkaz, kde môžeš sledovať priebeh.
3.  **Automatické odoslanie (Submit):** Hneď ako Expo dokončí build, vďaka parametru `--auto-submit` ho pošle priamo spoločnosti Apple do tvojho App Store Connect účtu.

---

## 5️⃣ Krok: Sprístupnenie v TestFlight

Po úspešnom dokončení buildu:
1.  Otvor si web [App Store Connect](https://appstoreconnect.apple.com/).
2.  Choď do sekcie **Moje Aplikácie** -> **Donx** -> **TestFlight**.
3.  Uvidíš tam svietiť tvoj nahraný build v stave *Processing* (spracovávanie trvá zvyčajne 10-30 minút, kým ho Apple preverí).
4.  Akonáhle bude pripravený, môžeš pridať interných alebo externých testerov, ktorým príde pozvánka priamo do aplikácie TestFlight na iPhone!
