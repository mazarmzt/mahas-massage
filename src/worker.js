// Worker de MAHAS MASSAGE, chats 2, 3, 4, 5 y 6: i18n, SEO, paginas interiores,
// catalogo en KV, autenticacion del Admin y solicitudes de reserva.
// La Home sale de los archivos estaticos (binding ASSETS) y el Worker le inyecta en el head
// el meta, canonical, hreflang, Open Graph y Schema.org segun el idioma de la ruta, y ademas
// Las tarjetas de Experiencias MAHAS las pinta el navegador desde /api/catalog
// (public/js/experiences.js), la misma fuente de KV que usa el Schema.org.
// Las paginas interiores se renderizan aqui desde plantillas mas JSON (src/pages/render.js)
// y siempre salen con noindex mientras su ruta este en estado pending.
// Tambien resuelve la raiz por idioma, sitemaps por idioma y robots.txt.
//
// Chat 4: /api/catalog (publico, solo lectura, catalogo approved) y /api/admin/catalog
// (lectura y escritura del catalogo completo en KV).
//
// Chat 5: el Admin (public/admin/) ya no depende solo del ADMIN_KEY compartido.
// /api/admin/login, /api/admin/logout y /api/admin/session dan a cada persona
// (Silvia, Sergio) su propio usuario y una sesion en cookie firmada. El
// ADMIN_KEY se conserva como acceso de servicio, alterno al login por
// persona, para scripts o automatizaciones futuras. /api/admin/catalog acepta
// cualquiera de los dos. El HTML del Admin vive en public/admin/ y sale
// siempre con noindex por NOINDEX_PREFIXES, sin liga alguna desde la
// navegacion publica.
//
// Chat 6: /api/bookings guarda solicitudes en BOOKINGS_KV con estado pending y
// /api/admin/bookings las lista, protegido por la misma guardia del Admin (src/admin/guard.js).
//
// TODO chat 8: declarar en wrangler el binding ASSETS y las variables SITE_URL, INDEXABLE y SCHEMA_INCLUDE_PRICES.

import { readConfig, NOINDEX_PREFIXES, LANG_COOKIE } from "./seo/config.js";
import { findRoute, isPublished, routeByKey, routeCatalogId } from "./seo/routes.js";
import { pickLanguage, readCookie } from "./seo/lang.js";
import { getDict, getPageContent } from "./i18n/index.js";
import { getCatalog, getCatalogRaw, validateCatalogPayload, CATALOG_KV_KEY, CURRENCY } from "./seo/catalog.js";
import { buildSchema, serializeSchema } from "./seo/schema.js";
import { buildHeadBlock, getPageMeta } from "./seo/head.js";
import { buildSitemapIndex, buildLocaleSitemap } from "./seo/sitemap.js";
import { buildRobots } from "./seo/robots.js";
import { renderPage } from "./pages/render.js";
import { handleCreateBooking, handleListBookings } from "./api/bookings.js";
import { isAdminAuthorized } from "./admin/guard.js";
import {
  SESSION_TTL_SECONDS,
  parseAdminUsers,
  findUser,
  verifyPasswordConstantTime,
  createSessionToken,
  verifySessionToken,
  readSessionToken,
  buildSessionCookie,
  buildClearSessionCookie,
  isLoginRateLimited,
  recordLoginFailure,
  clearLoginFailures
} from "./admin/auth.js";

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

function jsonResponse(data, status, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      ...extraHeaders
    }
  });
}

// POST /api/admin/login. Usuario y contrasena propios, verificados contra
// ADMIN_USERS. Limita intentos por IP + usuario y tarda lo mismo exista o no
// el usuario, para no dejar adivinar usuarios validos por tiempo de respuesta.
async function handleAdminLogin(request, env) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Metodo no permitido" }, 405);
  }
  if (!env || !env.ADMIN_SESSION_SECRET) {
    return jsonResponse({ error: "El Admin todavia no esta configurado" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return jsonResponse({ error: "JSON invalido" }, 400);
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!username || !password) {
    return jsonResponse({ error: "Usuario o contrasena incorrectos" }, 400);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (await isLoginRateLimited(env, ip, username)) {
    return jsonResponse({ error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." }, 429);
  }

  const users = parseAdminUsers(env);
  const user = findUser(users, username);
  const passwordOk = await verifyPasswordConstantTime(password, user);

  if (!user || !passwordOk) {
    await recordLoginFailure(env, ip, username);
    return jsonResponse({ error: "Usuario o contrasena incorrectos" }, 401);
  }

  await clearLoginFailures(env, ip, username);
  const session = await createSessionToken(env, user);
  if (!session) {
    return jsonResponse({ error: "El Admin todavia no esta configurado" }, 500);
  }

  return jsonResponse(
    { ok: true, user: { username: user.username, name: user.name } },
    200,
    { "Set-Cookie": buildSessionCookie(session.token, SESSION_TTL_SECONDS) }
  );
}

// POST /api/admin/logout. Borra la cookie de sesion en el navegador. El
// token en si no queda invalidado (la sesion es firmada, no hay registro que
// borrar), pero expira solo a las 8 horas de haberse creado.
function handleAdminLogout() {
  return jsonResponse({ ok: true }, 200, { "Set-Cookie": buildClearSessionCookie() });
}

// GET /api/admin/session. Lo usa el Admin al cargar la pagina para saber si
// ya hay una sesion valida o si debe mostrar el login.
async function handleAdminSession(request, env) {
  const token = readSessionToken(request);
  const session = await verifySessionToken(env, token);
  if (!session) return jsonResponse({ ok: false }, 401);
  return jsonResponse({ ok: true, user: session }, 200);
}

// Rutas /api/. Publica: solo lectura del catalogo approved. Admin: login,
// logout, sesion, y lectura/escritura del catalogo completo en KV.
async function handleApi(request, env, pathname) {
  if (pathname === "/api/catalog") {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return jsonResponse({ error: "Metodo no permitido" }, 405);
    }
    const catalog = await getCatalog(env);
    return jsonResponse({ items: catalog, currency: CURRENCY }, 200, {
      "Cache-Control": "public, max-age=60"
    });
  }

  // Reservas, chat 6. Toda solicitud queda pending; ninguna ruta decide disponibilidad real
  if (pathname === "/api/bookings" && request.method === "POST") {
    return handleCreateBooking(request, env);
  }

  if (pathname === "/api/admin/bookings" && (request.method === "GET" || request.method === "HEAD")) {
    return handleListBookings(request, env);
  }

  if (pathname === "/api/admin/login") {
    return handleAdminLogin(request, env);
  }

  if (pathname === "/api/admin/logout") {
    if (request.method !== "POST") {
      return jsonResponse({ error: "Metodo no permitido" }, 405);
    }
    return handleAdminLogout();
  }

  if (pathname === "/api/admin/session") {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return jsonResponse({ error: "Metodo no permitido" }, 405);
    }
    return handleAdminSession(request, env);
  }

  if (pathname === "/api/admin/catalog") {
    if (!(await isAdminAuthorized(request, env))) {
      return jsonResponse({ error: "No autorizado" }, 401);
    }

    if (request.method === "GET" || request.method === "HEAD") {
      const catalog = await getCatalogRaw(env);
      return jsonResponse({ items: catalog }, 200, { "Cache-Control": "no-store" });
    }

    if (request.method === "PUT") {
      if (!env.CATALOG_KV) {
        return jsonResponse({ error: "Falta el binding CATALOG_KV en wrangler.jsonc" }, 500);
      }
      let payload;
      try {
        payload = await request.json();
      } catch (err) {
        return jsonResponse({ error: "JSON invalido" }, 400);
      }
      const items = Array.isArray(payload) ? payload : payload && payload.items;
      const check = validateCatalogPayload(items);
      if (!check.ok) {
        return jsonResponse({ error: check.error }, 400);
      }
      await env.CATALOG_KV.put(CATALOG_KV_KEY, JSON.stringify(items));
      return jsonResponse({ items }, 200, { "Cache-Control": "no-store" });
    }

    return jsonResponse({ error: "Metodo no permitido" }, 405);
  }

  return jsonResponse({ error: "Ruta no encontrada" }, 404);
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

  const rewriter = new HTMLRewriter()
    .on("html", new SetHtmlLang(dict.htmlLang || (lang === "es" ? "es-MX" : "en")))
    .on("title", new RemoveElement())
    .on('meta[name="description"]', new RemoveElement())
    .on('meta[name="robots"]', new RemoveElement())
    .on('link[rel="canonical"]', new RemoveElement())
    .on('link[rel="alternate"][hreflang]', new RemoveElement())
    .on('meta[property^="og:"]', new RemoveElement())
    .on('meta[name^="twitter:"]', new RemoveElement())
    .on('script[type="application/ld+json"]', new RemoveElement())
    .on("head", new AppendToHead(headBlock));

  const rewritten = rewriter.transform(assetResponse);

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

  // El catalogo se pide siempre, no solo para paginas exp-*: la pagina
  // Experiencias MAHAS tambien lo necesita para su bloque catalog
  const catalog = await getCatalog(env);
  const catalogId = routeCatalogId(route.key);
  const experience = catalogId ? catalog.find((item) => item.id === catalogId) || null : null;
  const catalogForSchema = experience ? [experience] : [];

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

  const html = renderPage({ route, lang, dict, content, headBlock, experience, catalog });
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

    if (pathname.startsWith("/api/")) {
      return handleApi(request, env, pathname);
    }

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

    // /admin/ y cualquier otra ruta no reconocida (incluida la pagina del
    // Admin, servida tal cual desde ASSETS, sin datos dentro y siempre con
    // noindex por NOINDEX_PREFIXES) pasa directo a ASSETS
    const passthrough = await env.ASSETS.fetch(request);
    return finalize(passthrough, mustNoindex(cfg, pathname, null));
  }
};
