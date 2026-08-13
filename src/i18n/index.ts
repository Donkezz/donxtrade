import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import sk from './sk.json';
import en from './en.json';
import pl from './pl.json';
import hu from './hu.json';
import uk from './uk.json';
import de from './de.json';

// Get device locale language code
const locales = Localization.getLocales();
const systemLanguage = locales && locales.length > 0 ? locales[0].languageCode : 'sk';

const resources = {
  sk: { translation: sk },
  en: { translation: en },
  pl: { translation: pl },
  hu: { translation: hu },
  uk: { translation: uk },
  de: { translation: de },
};

// Check if system language is supported, otherwise fallback to Slovak
const initialLanguage = resources.hasOwnProperty(systemLanguage ?? 'sk') ? systemLanguage : 'sk';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage ?? 'sk',
    fallbackLng: 'sk',
    compatibilityJSON: 'v4', // Required for React Native compatibility
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
