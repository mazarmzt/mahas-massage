// Cargador de diccionarios. Los JSON se empaquetan con el Worker, sin dependencias externas.
// El copy de cada idioma vive solo en su JSON para no duplicarlo en el codigo.
//
// Archivos por idioma:
//   es.json y en.json             meta de la Home, nombre del sitio y textos de Schema (chat 2)
//   es.pages.json y en.pages.json chrome compartido, meta de paginas interiores y bloques (chat 3)
// getDict devuelve ambos fusionados. La meta de las paginas interiores se suma a dict.pages
// para que head.js la lea sin cambios.

import es from "./es.json";
import en from "./en.json";
import esPages from "./es.pages.json";
import enPages from "./en.pages.json";
import { DEFAULT_LOCALE } from "../seo/routes.js";

function merge(base, extra) {
  return {
    ...base,
    pages: { ...base.pages, ...extra.meta },
    chrome: extra.chrome
  };
}

const DICTS = { es: merge(es, esPages), en: merge(en, enPages) };
const PAGES = { es: esPages.pages, en: enPages.pages };

export function getDict(lang) {
  return DICTS[lang] || DICTS[DEFAULT_LOCALE];
}

// Contenido en bloques de las paginas interiores. Devuelve null si la ruta no tiene plantilla.
export function getPageContent(lang, key) {
  const pages = PAGES[lang] || PAGES[DEFAULT_LOCALE];
  return pages[key] || null;
}
