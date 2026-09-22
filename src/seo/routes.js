// Registro unico de rutas del sitio.
// Solo las rutas con status published entran al sitemap y al hreflang.
// Las rutas pending existen para que el Worker las reconozca, pero se sirven con noindex.
//
// Estados de contenido: published | pending
// Chat 3: las paginas interiores se renderizan desde plantillas mas JSON (ver src/pages/render.js).
// Todas siguen en pending hasta que se aprueben. Para publicar una pagina se cambia
// su status a published y ademas se aprueba su copy en los JSON.
// Los slugs de las paginas interiores son propuesta provisional y siguen pendientes
// de aprobacion; solo /es/experiencias/ y /en/experiences/ vienen confirmados.
// Las rutas de aviso de privacidad y terminos son propuesta nueva del chat 3.
//
// Rutas exp-*: paginas individuales de cada experiencia. El slug es el mismo
// para es y en, igual que en public/js/experiences.js y SITE.routes de
// public/js/config.js, para que el enlace que arma main.js (basePath + slug)
// coincida siempre. Catalogo y precios ya estan aprobados (2026-09-21), pero la
// pagina en si sigue pending hasta que se apruebe su diseño y su copy.
export const EXPERIENCE_ROUTES = [
  { catalogId: "relax", key: "exp-relax", slug: "relax" },
  { catalogId: "deep", key: "exp-deep", slug: "deep" },
  { catalogId: "4-hands", key: "exp-4hands", slug: "4-hands" },
  { catalogId: "couples", key: "exp-couples", slug: "couples" }
];

export const LOCALES = [
  { code: "es", hreflang: "es-MX", ogLocale: "es_MX" },
  { code: "en", hreflang: "en", ogLocale: "en_US" }
];

export const DEFAULT_LOCALE = "es";

export const ROUTES = [
  { key: "home", status: "published", paths: { es: "/es/", en: "/en/" } },
  { key: "experiences", status: "pending", paths: { es: "/es/experiencias/", en: "/en/experiences/" } },
  { key: "about", status: "pending", paths: { es: "/es/quienes-somos/", en: "/en/about/" } },
  { key: "experience", status: "pending", paths: { es: "/es/la-experiencia/", en: "/en/the-experience/" } },
  { key: "service", status: "pending", paths: { es: "/es/domicilio-hoteles/", en: "/en/at-home-hotels/" } },
  { key: "booking", status: "pending", paths: { es: "/es/reservar/", en: "/en/book/" } },
  { key: "contact", status: "pending", paths: { es: "/es/contacto/", en: "/en/contact/" } },
  { key: "privacy", status: "pending", paths: { es: "/es/aviso-de-privacidad/", en: "/en/privacy-notice/" } },
  { key: "terms", status: "pending", paths: { es: "/es/terminos-y-condiciones/", en: "/en/terms-and-conditions/" } },
  ...EXPERIENCE_ROUTES.map((e) => ({
    key: e.key,
    status: "pending",
    catalogId: e.catalogId,
    paths: { es: `/es/experiencias/${e.slug}/`, en: `/en/experiences/${e.slug}/` }
  }))
];

export function routeCatalogId(key) {
  const found = EXPERIENCE_ROUTES.find((e) => e.key === key);
  return found ? found.catalogId : null;
}

export function isPublished(route) {
  return route.status === "published";
}

export function publishedRoutes() {
  return ROUTES.filter(isPublished);
}

export function routeByKey(key) {
  return ROUTES.find((r) => r.key === key);
}

// Busca la ruta que corresponde a una ruta de la peticion.
// Devuelve la ruta, el idioma y si falta la diagonal final.
export function findRoute(pathname) {
  const needsSlash = !pathname.endsWith("/");
  const normalized = needsSlash ? pathname + "/" : pathname;
  for (const route of ROUTES) {
    for (const locale of LOCALES) {
      if (route.paths[locale.code] === normalized) {
        return { route, lang: locale.code, needsSlash };
      }
    }
  }
  return null;
}
