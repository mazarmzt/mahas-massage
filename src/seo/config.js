// Configuracion central del modulo i18n y SEO de MAHAS MASSAGE.
//
// Variables del Worker que este modulo lee (se declaran en wrangler en el chat 8):
//   SITE_URL               dominio canonico, por defecto https://mahasmassage.com
//   INDEXABLE              solo el valor true permite indexar; cualquier otro mantiene noindex
//   SCHEMA_INCLUDE_PRICES  el valor false retira los precios del Schema.org
//
// Los datos de contacto viven aqui de forma provisional porque el Worker no puede
// importar el config.js del frontend. TODO chat 4: unificar en una sola fuente (KV o config compartida).

export const DEFAULT_SITE_URL = "https://mahasmassage.com";

// Imagen Open Graph de marca sin foto. TODO: reemplazar por fotografia real aprobada.
export const OG_IMAGE_PATH = "/og/mahas-og.png";
export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

// Cookie que recuerda el idioma elegido por el visitante
export const LANG_COOKIE = "mahas_lang";
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Rutas que nunca se indexan ni se anuncian en robots.txt.
// TODO chat 7: agregar aqui las rutas del registro 18+ y del menu oculto.
export const NOINDEX_PREFIXES = ["/admin/", "/api/"];

// Datos publicos del negocio. Sin horarios, sin calle y sin calificaciones porque no estan aprobados.
export const BUSINESS = {
  name: "MAHAS MASSAGE",
  telephone: "+526694103650",
  email: "info@mahasmassage.com",
  locality: "Mazatl\u00e1n",
  region: "Sinaloa",
  country: "MX",
  sameAs: [
    "https://www.instagram.com/mahasmassage/",
    "https://www.facebook.com/share/1Dd82UH2ZH/"
  ]
};

// Lee las variables del entorno y devuelve la configuracion resuelta
export function readConfig(env) {
  const rawUrl = (env && env.SITE_URL) || DEFAULT_SITE_URL;
  return {
    siteUrl: rawUrl.replace(/\/+$/, ""),
    indexable: !!env && env.INDEXABLE === "true",
    schemaPrices: !(env && env.SCHEMA_INCLUDE_PRICES === "false")
  };
}
