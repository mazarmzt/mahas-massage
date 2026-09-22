// Sitemaps por idioma: un indice y un archivo para espanol y otro para ingles.
// Solo entran rutas publicadas. Cada URL declara sus alternates hreflang y x-default.
// No se emite lastmod porque no hay una fecha real de cambio por pagina.

import { LOCALES, DEFAULT_LOCALE, publishedRoutes } from "./routes.js";

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildSitemapIndex(cfg) {
  const items = LOCALES.map(
    (l) => "  <sitemap><loc>" + xmlEscape(cfg.siteUrl + "/sitemap-" + l.code + ".xml") + "</loc></sitemap>"
  ).join("\n");

  return (
    XML_HEADER +
    '\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    items +
    "\n</sitemapindex>\n"
  );
}

export function buildLocaleSitemap(lang, cfg) {
  const urls = publishedRoutes()
    .filter((route) => route.paths[lang])
    .map((route) => {
      const alternates = LOCALES.filter((l) => route.paths[l.code]).map(
        (l) =>
          '    <xhtml:link rel="alternate" hreflang="' +
          l.hreflang +
          '" href="' +
          xmlEscape(cfg.siteUrl + route.paths[l.code]) +
          '"/>'
      );
      alternates.push(
        '    <xhtml:link rel="alternate" hreflang="x-default" href="' +
          xmlEscape(cfg.siteUrl + route.paths[DEFAULT_LOCALE]) +
          '"/>'
      );

      return (
        "  <url>\n    <loc>" +
        xmlEscape(cfg.siteUrl + route.paths[lang]) +
        "</loc>\n" +
        alternates.join("\n") +
        "\n  </url>"
      );
    })
    .join("\n");

  return (
    XML_HEADER +
    '\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    urls +
    "\n</urlset>\n"
  );
}
