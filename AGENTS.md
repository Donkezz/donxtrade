# DonX

A local classifieds app — offers and requests between people nearby. The scope is
deliberately broad: from selling used items to dating. Users are ordinary people,
not power users, so **simplicity and speed beat feature count**. When a feature can
be shipped as one screen or three, pick one. When in doubt, cut it.

Expo / React Native, file-based routing via expo-router. Source lives in `src/`.

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before
writing any code. Do not rely on memory of older Expo or React Native APIs.

## Built for many countries from day one

The app is multilingual by design and meant to expand to new countries quickly.
Never assume one language, one country, one currency, or one date format.

- **No user-facing string in code.** Everything goes through `t()` and all five
  locale files in `src/i18n/` (`sk`, `en`, `pl`, `hu`, `uk`). Adding a key to one
  file and not the rest is an incomplete change.
- **No hardcoded currency.** No `€` literals, no assumed decimal places. Amounts
  are a value plus a currency code, formatted through `Intl.NumberFormat` with the
  active locale.
- **No hardcoded date, time, or number formats.** Use `Intl` / locale-aware
  formatting, never a fixed `DD.MM.YYYY` or a comma decimal separator.
- **Don't assume the country from the language**, or the language from the country.
  They are separate settings.
- Leave room for text expansion in layouts — translations are often much longer
  than the Slovak or English original.

Existing code does not fully honour this yet (hardcoded `€` and some Slovak strings
remain). Follow the rules in new code, and fix what you touch as you pass through.

## After changing code

Run both, and fix what they report:

```bash
npm run lint
npx tsc --noEmit
```

There is no test suite. If a change is worth verifying visually, build and run it
in the iOS Simulator rather than asking the user to check.

## Ask before doing

Never do these without explicit approval in the conversation:

- `git commit`, `git push`, creating branches or pull requests
- Any EAS build, submit, or TestFlight / store release
- Adding, removing, or upgrading dependencies
- Deleting files or data, or any other change that is hard to undo
- Anything that leaves the machine — publishing, sending, posting
