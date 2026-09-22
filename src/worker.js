// Worker de MAHAS MASSAGE, chats 2 y 3: i18n, SEO y paginas interiores.
// La Home sale de los archivos estaticos (binding ASSETS) y el Worker le inyecta en el head
// el meta, canonical, hreflang, Open Graph y Schema.org segun el idioma de la ruta.
// Las paginas interiores se renderizan aqui desde plantillas mas JSON (src/pages/render.js)
// y siempre salen con noindex mientras su ruta este en estado pending.
// Tambien resuelve la raiz por idioma, sitemaps por idioma y robots.txt.
//
// TODO chat 4: agregar aqui el ruteo de /api/ hacia el catalogo y KV.
// TODO chat 8: declarar en wrangler el binding ASSETS y las variables SITE_URL, INDEXABLE y SCHEMA_INCLUDE_PRICES.

import { readConfig, NOINDEX_PREFIXES, LANG_COOKIE } from "./seo/config.js";
import { findRoute, isPublished, routeByKey, routeCatalogId } from "./seo/routes.js";
import { pickLanguage, readCookie } from "./seo/lang.js";
import { getDict, getPageContent } from "./i18n/index.js";
import { getCatalog } from "./seo/catalog.js";
import { buildSchema, serializeSchema } from "./seo/schema.js";
import { buildHeadBlock, getPageMeta } from "./seo/head.js";
import { buildSitemapIndex, buildLocaleSitemap } from "./seo/sitemap.js";
import { buildRobots } from "./seo/robots.js";
import { renderPage } from "./pages/render.js";

// Quita del HTML estatico las etiquetas que el Worker vuelve a generar, para evitar duplicados
class RemoveElement {
  element(el) {
    el.remove();
  }
}

class SetHtmlLang {
  constructor(lang) {
    this.lang = lang;
  }
  element(el) {
    el.setAttribute("lang", this.lang);
  }
}

class AppendToHead {
  constructor(html) {
    this.html = html;
  }
  element(el) {
    el.append(this.html, { html: true });
  }
}

// Decide si una respuesta debe llevar noindex
function mustNoindex(cfg, pathname, route) {
  if (!cfg.indexable) return true;
  if (NOINDEX_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  if (route && !isPublished(route)) return true;
  return false;
}

// Copia la respuesta para poder modificar sus encabezados y agrega X-Robots-Tag si corresponde
function finalize(response, noindex, extraHeaders) {
  const out = new Response(response.body, response);
  if (noindex) out.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) out.headers.set(key, value);
  }
  return out;
}

function textResponse(body, contentType, noindex) {
  const headers = {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=3600"
  };
  if (noindex) headers["X-Robots-Tag"] = "noindex, nofollow";
  return new Response(body, { status: 200, headers });
}

// La raiz redirige por cookie, luego Accept-Language, luego espanol. Conserva la query de campanas.
function redirectRoot(request, url, cfg) {
  const cookieLang = readCookie(request.headers.get("Cookie"), LANG_COOKIE);
  const lang = pickLanguage(request.headers.get("Accept-Language"), cookieLang);
  const home = routeByKey("home");

  const headers = {
    Location: url.origin + home.paths[lang] + url.search,
    Vary: "Accept-Language, Cookie",
    "Cache-Control": "private, no-store"
  };
  if (!cfg.indexable) headers["X-Robots-Tag"] = "noindex, nofollow";
  return new Response(null, { status: 302, headers });
}

async function serveLocalizedPage(request, env, cfg, hit, pathname) {
  const { route, lang } = hit;
  const noindex = mustNoindex(cfg, pathname, route);
  const assetResponse = await env.ASSETS.fetch(request);
  const contentType = assetResponse.headers.get("Content-Type") || "";

  // Si el archivo no existe o no es HTML se devuelve tal cual
  if (!assetResponse.ok || !contentType.includes("text/html")) {
    return finalize(assetResponse, noindex);
  }

  const dict = getDict(lang);
  const pageMeta = getPageMeta(route, dict);
  const catalog = route.key === "home" ? await getCatalog(env) : [];
  const schema = buildSchema({ route, lang, cfg, dict, catalog, pageMeta });
  const headBlock = buildHeadBlock({
    route,
    lang,
    cfg,
    dict,
    pageMeta,
    schemaJson: serializeSchema(schema),
    noindex
  });

  const rewritten = new HTMLRewriter()
    .on("html", new SetHtmlLang(dict.htmlLang || (lang === "es" ? "es-MX" : "en")))
    .on("title", new RemoveElement())
    .on('meta[name="description"]', new RemoveElement())
    .on('meta[name="robots"]', new RemoveElement())
    .on('link[rel="canonical"]', new RemoveElement())
    .on('link[rel="alternate"][hreflang]', new RemoveElement())
    .on('meta[property^="og:"]', new RemoveElement())
    .on('meta[name^="twitter:"]', new RemoveElement())
    .on('script[type="application/ld+json"]', new RemoveElement())
    .on("head", new AppendToHead(headBlock))
    .transform(assetResponse);

  return finalize(rewritten, noindex, {
    "Content-Language": lang === "es" ? "es-MX" : "en"
  });
}

// Pagina interior renderizada desde plantilla y JSON. Las paginas exp-* llevan ademas
// la experiencia del catalogo que les corresponde (nombre, descripcion, precio),
// para no duplicar esos datos en el JSON de i18n
async function serveTemplatePage(env, cfg, hit, pathname, content) {
  const { route, lang } = hit;
  const noindex = mustNoindex(cfg, pathname, route);
  const dict = getDict(lang);
  const pageMeta = getPageMeta(route, dict);

  const catalogId = routeCatalogId(route.key);
  let experience = null;
  let catalogForSchema = [];
  if (catalogId) {
    const catalog = await getCatalog(env);
    experience = catalog.find((item) => item.id === catalogId) || null;
    if (experience) catalogForSchema = [experience];
  }

  const schema = buildSchema({ route, lang, cfg, dict, catalog: catalogForSchema, pageMeta });
  const headBlock = buildHeadBlock({
    route,
    lang,
    cfg,
    dict,
    pageMeta,
    schemaJson: serializeSchema(schema),
    noindex
  });

  const html = renderPage({ route, lang, dict, content, headBlock, experience });
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Language": lang === "es" ? "es-MX" : "en",
    "Cache-Control": "public, max-age=300"
  };
  if (noindex) headers["X-Robots-Tag"] = "noindex, nofollow";
  return new Response(html, { status: 200, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cfg = readConfig(env);
    const pathname = url.pathname;
    const noindexSite = !cfg.indexable;

    if (request.method !== "GET" && request.method !== "HEAD") {
      return env.ASSETS.fetch(request);
    }

    if (pathname === "/robots.txt") {
      return textResponse(buildRobots(cfg), "text/plain; charset=utf-8", false);
    }

    if (pathname === "/sitemap.xml") {
      return textResponse(buildSitemapIndex(cfg), "application/xml; charset=utf-8", noindexSite);
    }

    const sitemapMatch = pathname.match(/^\/sitemap-(es|en)\.xml$/);
    if (sitemapMatch) {
      return textResponse(
        buildLocaleSitemap(sitemapMatch[1], cfg),
        "application/xml; charset=utf-8",
        noindexSite
      );
    }

    if (pathname === "/") {
      return redirectRoot(request, url, cfg);
    }

    const hit = findRoute(pathname);
    if (hit) {
      // Rutas conocidas sin diagonal final se normalizan con redireccion permanente
      if (hit.needsSlash) {
        return Response.redirect(url.origin + pathname + "/" + url.search, 301);
      }

      // Las rutas con contenido en JSON se renderizan aqui; la Home sigue saliendo de ASSETS
      const content = hit.route.key === "home" ? null : getPageContent(hit.lang, hit.route.key);
      if (content) {
        return await serveTemplatePage(env, cfg, hit, pathname, content);
      }
      return serveLocalizedPage(request, env, cfg, hit, pathname);
    }

    const passthrough = await env.ASSETS.fetch(request);
    return finalize(passthrough, mustNoindex(cfg, pathname, null));
  }
};
