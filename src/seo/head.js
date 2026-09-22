// Construye el bloque que el Worker inyecta al final del head de cada pagina.
// Incluye title, description, robots, canonical, hreflang, Open Graph, Twitter y JSON-LD.
// Tambien incluye un script minimo que recuerda el idioma cuando el visitante usa el selector.

import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, OG_IMAGE_PATH, OG_IMAGE_SIZE } from "./config.js";
import { LOCALES, DEFAULT_LOCALE, isPublished } from "./routes.js";

export function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Recuerda el idioma al hacer clic en un enlace con hreflang o data-lang del selector de idioma.
// Si el chat 8 activa una politica CSP estricta, mover este script a main.js.
function langScript() {
  return (
    "<script>(function(){document.addEventListener(\"click\",function(e){" +
    "var a=e.target.closest&&e.target.closest(\"a[hreflang],a[data-lang]\");" +
    "if(!a)return;" +
    "var l=(a.getAttribute(\"data-lang\")||a.getAttribute(\"hreflang\")||\"\").slice(0,2).toLowerCase();" +
    "if(l!==\"es\"&&l!==\"en\")return;" +
    "document.cookie=\"" + LANG_COOKIE + "=\"+l+\"; path=/; max-age=" + LANG_COOKIE_MAX_AGE + "; SameSite=Lax\"+(location.protocol===\"https:\"?\"; Secure\":\"\");" +
    "});})();</script>"
  );
}

export function getPageMeta(route, dict) {
  // Si una ruta aun no tiene meta propio se usa el de la Home para no dejar el head vacio
  return dict.pages[route.key] || dict.pages.home;
}

export function buildHeadBlock({ route, lang, cfg, dict, pageMeta, schemaJson, noindex }) {
  const base = cfg.siteUrl;
  const locale = LOCALES.find((l) => l.code === lang);
  const canonical = base + route.paths[lang];
  const ogImage = base + OG_IMAGE_PATH;
  const lines = [];

  lines.push("<title>" + esc(pageMeta.title) + "</title>");
  lines.push('<meta name="description" content="' + esc(pageMeta.description) + '">');
  lines.push(
    '<meta name="robots" content="' +
      (noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large") +
      '">'
  );
  lines.push('<link rel="canonical" href="' + esc(canonical) + '">');

  // Alternates solo cuando la ruta esta publicada en ambos idiomas
  if (isPublished(route)) {
    for (const l of LOCALES) {
      if (route.paths[l.code]) {
        lines.push(
          '<link rel="alternate" hreflang="' + l.hreflang + '" href="' + esc(base + route.paths[l.code]) + '">'
        );
      }
    }
    lines.push(
      '<link rel="alternate" hreflang="x-default" href="' + esc(base + route.paths[DEFAULT_LOCALE]) + '">'
    );
  }

  lines.push('<meta property="og:type" content="website">');
  lines.push('<meta property="og:site_name" content="' + esc(dict.site.name) + '">');
  lines.push('<meta property="og:title" content="' + esc(pageMeta.title) + '">');
  lines.push('<meta property="og:description" content="' + esc(pageMeta.description) + '">');
  lines.push('<meta property="og:url" content="' + esc(canonical) + '">');
  lines.push('<meta property="og:locale" content="' + locale.ogLocale + '">');
  for (const l of LOCALES) {
    if (l.code !== lang) lines.push('<meta property="og:locale:alternate" content="' + l.ogLocale + '">');
  }
  lines.push('<meta property="og:image" content="' + esc(ogImage) + '">');
  lines.push('<meta property="og:image:width" content="' + OG_IMAGE_SIZE.width + '">');
  lines.push('<meta property="og:image:height" content="' + OG_IMAGE_SIZE.height + '">');
  lines.push('<meta property="og:image:alt" content="' + esc(dict.site.ogImageAlt) + '">');

  lines.push('<meta name="twitter:card" content="summary_large_image">');
  lines.push('<meta name="twitter:title" content="' + esc(pageMeta.title) + '">');
  lines.push('<meta name="twitter:description" content="' + esc(pageMeta.description) + '">');
  lines.push('<meta name="twitter:image" content="' + esc(ogImage) + '">');

  lines.push('<script type="application/ld+json">' + schemaJson + "</script>");
  lines.push(langScript());

  return "\n" + lines.join("\n") + "\n";
}
