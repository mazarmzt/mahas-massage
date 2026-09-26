// Renderizador de paginas interiores de MAHAS MASSAGE, chats 3 y 6.
// Recibe el contenido en bloques desde los JSON de i18n y devuelve el HTML completo.
// Reutiliza solo las clases de css/styles.css y el comportamiento de js/main.js:
// menu movil, boton fijo de reserva, aparicion al scroll, tarjetas de experiencias y canales.
//
// Reglas que este archivo respeta:
//   el copy vive solo en los JSON y aqui nunca se escribe texto visible
//   las rutas se resuelven desde el registro de rutas, nunca se escriben a mano
//   sin precios, duraciones, radios, tarifas ni horarios
//   las tarjetas de experiencias salen de js/experiences.js en el navegador (fuente unica)
//   el menu oculto y Private no existen en este archivo
//   el bloque bookingForm (chat 6) nunca decide disponibilidad real: toda solicitud
//   queda en estado pending y se completa en public/js/booking.js

import { esc } from "../seo/head.js";
import { BUSINESS } from "../seo/config.js";
import { LOCALES, routeByKey } from "../seo/routes.js";
import { CURRENCY } from "../seo/catalog.js";

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23171614'/%3E%3Ctext x='32' y='43' font-family='Georgia,serif' font-size='34' text-anchor='middle' fill='%23B79A68'%3EM%3C/text%3E%3C/svg%3E";

const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Cinzel:wght@400&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Manrope:wght@400;500&display=swap";

// Contexto de render: idioma, chrome del JSON, ruta actual y, si aplica,
// la experiencia del catalogo que alimenta esta pagina (paginas exp-*)
function makeContext(lang, dict, route, experience) {
  return { lang, chrome: dict.chrome, route, experience };
}

function money(amount, lang) {
  const locale = lang === "en" ? "en-US" : "es-MX";
  return new Intl.NumberFormat(locale, { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 }).format(amount);
}

// Lee un valor por ruta de puntos dentro del chrome
function lookup(chrome, dotted) {
  return dotted.split(".").reduce((acc, part) => (acc == null ? acc : acc[part]), chrome);
}

// Un texto que empieza con arroba se toma del chrome para no repetir copy
function text(ctx, value) {
  if (typeof value !== "string") return "";
  if (!value.startsWith("@")) return value;
  const found = lookup(ctx.chrome, value.slice(1));
  return typeof found === "string" ? found : "TODO " + value;
}

function t(ctx, value) {
  return esc(text(ctx, value));
}

function pathTo(ctx, key) {
  const route = routeByKey(key);
  return route ? route.paths[ctx.lang] : "#";
}

// Los comentarios HTML no admiten doble guion ni el signo mayor
function safeComment(value) {
  return String(value).replace(/--+/g, " ").replace(/>/g, " ");
}

function cls(list) {
  return list.filter(Boolean).join(" ");
}

// ---------- Botones y enlaces: solo los tres estilos existentes ----------
function action(ctx, spec) {
  const style = spec.style || "primary";
  const className = style === "link" ? "link" : "btn btn--" + style;
  const label = t(ctx, spec.label ? "@cta." + spec.label : spec.text);

  if (spec.channel) {
    return '<a class="' + className + '" data-channel="' + esc(spec.channel) + '">' + label + "</a>";
  }
  const booking = spec.booking ? " data-booking" : "";
  return '<a class="' + className + '" href="' + esc(pathTo(ctx, spec.to)) + '"' + booking + ">" + label + "</a>";
}

function actions(ctx, list) {
  if (!list || list.length === 0) return "";
  return '<div class="actions">' + list.map((spec) => action(ctx, spec)).join("") + "</div>";
}

// ---------- Piezas comunes de un bloque ----------
function paragraphs(ctx, list) {
  if (!list) return "";
  return list.map((item) => '<p class="prose">' + t(ctx, item) + "</p>").join("");
}

function itemList(ctx, items) {
  if (!items || items.length === 0) return "";
  return '<ul class="detail-list">' + items.map((item) => "<li>" + t(ctx, item) + "</li>").join("") + "</ul>";
}

function heading(ctx, block, id, level) {
  if (!block.title) return "";
  return "<" + level + ' class="section-title" id="' + id + '">' + t(ctx, block.title) + "</" + level + ">";
}

function lead(ctx, block) {
  if (!block.lead) return "";
  return '<p class="' + cls(["lead", block.small && "lead--sm"]) + '">' + t(ctx, block.lead) + "</p>";
}

function labelledBy(block, id) {
  return block.title ? ' aria-labelledby="' + id + '"' : "";
}

function ariaLabel(ctx, block) {
  return !block.title && block.aria ? ' aria-label="' + t(ctx, block.aria) + '"' : "";
}

// ---------- Bloques ----------
const BLOCKS = {
  // Apertura de pagina. Lleva el h1 y marca la zona que el boton fijo toma como hero.
  // fromExperience: true toma el titulo y la descripcion del catalogo en vez del JSON,
  // asi el nombre y la descripcion aprobados solo existen en un lugar (catalog.js)
  intro(ctx, block, id) {
    const fromExp = block.fromExperience && ctx.experience;
    const title = fromExp ? esc(ctx.experience.name[ctx.lang] || ctx.experience.name.es) : t(ctx, block.title);
    const leadText = fromExp
      ? '<p class="lead">' + esc(ctx.experience.description[ctx.lang] || ctx.experience.description.es) + "</p>"
      : lead(ctx, block);
    return (
      '<section class="section theme-' + esc(block.theme || "dark") + '" data-hero aria-labelledby="' + id + '">' +
      '<div class="container"><div class="section__head" data-reveal>' +
      (block.eyebrow ? '<p class="eyebrow">' + t(ctx, block.eyebrow) + "</p>" : "") +
      "<h1 class=\"section-title\" id=\"" + id + '">' + title + "</h1>" +
      leadText +
      paragraphs(ctx, block.text) +
      "</div></div></section>"
    );
  },

  // Bloque de texto sin imagen
  text(ctx, block, id) {
    return (
      '<section class="section theme-' + esc(block.theme || "light") + '"' + labelledBy(block, id) + ">" +
      '<div class="container"><div class="section__head" data-reveal>' +
      heading(ctx, block, id, "h2") +
      lead(ctx, block) +
      paragraphs(ctx, block.text) +
      actions(ctx, block.actions) +
      "</div></div></section>"
    );
  },

  // Composicion en dos columnas con imagen pendiente
  split(ctx, block, id) {
    const media = block.media || {};
    const label = ctx.chrome.media.photo + " " + (media.label || "") + " · " + ctx.chrome.media.pending;
    const ratio = "ratio-" + (media.ratio || "4x5");
    return (
      '<section class="section theme-' + esc(block.theme || "light") + '"' + labelledBy(block, id) + ">" +
      '<div class="' + cls(["container", "split", block.layout && "split--" + block.layout]) + '">' +
      '<div class="split__media"><div class="ph ' + esc(ratio) + '" data-label="' + esc(label) +
      '" data-reveal="rise" aria-hidden="true"></div></div>' +
      '<div class="split__body" data-reveal>' +
      heading(ctx, block, id, "h2") +
      lead(ctx, block) +
      paragraphs(ctx, block.text) +
      itemList(ctx, block.items) +
      actions(ctx, block.actions) +
      "</div></div></section>"
    );
  },

  // Lista editorial con titulo
  list(ctx, block, id) {
    return (
      '<section class="section theme-' + esc(block.theme || "light") + '"' + labelledBy(block, id) + ">" +
      '<div class="container"><div class="section__head" data-reveal>' +
      heading(ctx, block, id, "h2") +
      lead(ctx, block) +
      paragraphs(ctx, block.text) +
      "</div>" +
      itemList(ctx, block.items) +
      "</div></section>"
    );
  },

  // Tarjetas de texto sin imagen, con la misma rejilla del catalogo
  cards(ctx, block, id) {
    const items = (block.items || [])
      .map(
        (item) =>
          '<li class="card" data-reveal><h3 class="card__name">' + t(ctx, item.name) +
          '</h3><p class="card__text">' + t(ctx, item.text) + "</p></li>"
      )
      .join("");
    return (
      '<section class="section theme-' + esc(block.theme || "light") + '"' + labelledBy(block, id) + ">" +
      '<div class="container"><div class="section__head" data-reveal>' +
      heading(ctx, block, id, "h2") +
      lead(ctx, block) +
      '</div><ul class="experience-grid" data-reveal-group>' + items + "</ul></div></section>"
    );
  },

  // Catalogo de experiencias. Las tarjetas las pinta js/main.js desde js/experiences.js,
  // que ya filtra por estado y no publica nada que no este aprobado
  catalog(ctx, block, id) {
    const c = ctx.chrome.catalog;
    return (
      '<section class="section theme-' + esc(block.theme || "light") + '"' + labelledBy(block, id) + ariaLabel(ctx, block) + ">" +
      '<div class="container">' +
      (block.title ? '<div class="section__head" data-reveal>' + heading(ctx, block, id, "h2") + "</div>" : "") +
      '<ul class="experience-grid" data-experience-grid data-reveal-group' +
      ' data-cta-label="' + esc(c.cta) + '"' +
      ' data-pending-label="' + esc(c.pendingLabel) + '"' +
      ' data-pending-text="' + esc(c.pendingText) + '"></ul>' +
      "</div></section>"
    );
  },

  // Canales de contacto. Redes y WhatsApp los completa main.js desde config.js.
  // Correo y telefono salen de la configuracion del Worker
  channels(ctx, block, id) {
    const items = (block.items || [])
      .map((item) => {
        if (item.channel === "email") {
          return '<li><a class="link" href="mailto:' + esc(BUSINESS.email) + '">' + esc(BUSINESS.email) + "</a></li>";
        }
        if (item.channel === "phone") {
          return '<li><a class="link" href="tel:' + esc(BUSINESS.telephone) + '">' + esc(formatPhone(BUSINESS.telephone)) + "</a></li>";
        }
        return '<li><a class="link" data-channel="' + esc(item.channel) + '">' + t(ctx, item.label) + "</a></li>";
      })
      .join("");
    return (
      '<section class="section theme-' + esc(block.theme || "light") + '"' + labelledBy(block, id) + ">" +
      '<div class="container"><div class="section__head" data-reveal>' +
      heading(ctx, block, id, "h2") +
      paragraphs(ctx, block.text) +
      '</div><ul class="detail-list" data-reveal>' + items + "</ul></div></section>"
    );
  },

  // Cierre de conversion. Usa el titulo y el texto comunes salvo que la pagina los cambie
  closing(ctx, block, id) {
    const title = block.title || ctx.chrome.closing.title;
    const leadText = block.lead || ctx.chrome.closing.lead;
    const primary = block.primary
      ? { style: "primary", ...block.primary }
      : { style: "primary", label: "book", to: "booking", booking: true };
    const list = [primary];
    if (block.secondary) list.push({ style: "link", ...block.secondary });
    return (
      '<section class="section booking theme-light" data-booking-section aria-labelledby="' + id + '">' +
      '<div class="container" data-reveal><div class="booking__rule" aria-hidden="true"></div>' +
      '<div class="section__head"><h2 class="section-title" id="' + id + '">' + esc(title) + "</h2>" +
      '<p class="lead">' + esc(leadText) + "</p></div>" +
      actions(ctx, list) +
      "</div></section>"
    );
  },

  // Duracion, precio y modalidad de una experiencia. Los numeros salen unicamente
  // de src/seo/catalog.js, nunca se escriben aqui, para no duplicar la fuente aprobada.
  // Reutiliza .detail-list, la misma clase que ya usan las secciones de lista y canales
  pricing(ctx, block, id) {
    const exp = ctx.experience;
    if (!exp) return "<!-- pricing sin experiencia en el contexto -->";
    const p = ctx.chrome.pricing;
    const modalityLabel = exp.pricePer === "couple" ? p.perCouple : p.perPerson;
    const rows = exp.durations
      .map(
        (d) =>
          "<li>" + esc(d.minutes) + " " + esc(p.durationLabel === "Duration" ? "min" : "min") +
          " — " + esc(money(d.price, ctx.lang)) + "</li>"
      )
      .join("");
    return (
      '<section class="section theme-' + esc(block.theme || "raised") + '" aria-labelledby="' + id + '">' +
      '<div class="container"><div class="section__head" data-reveal>' +
      '<h2 class="section-title" id="' + id + '">' + esc(p.title) + "</h2>" +
      '<p class="lead lead--sm">' + esc(modalityLabel) + "</p></div>" +
      '<ul class="detail-list" data-reveal>' + rows + "</ul>" +
      '<p class="prose">' + esc(p.note) + "</p>" +
      "</div></section>"
    );
  },

  // Formulario de solicitud de reserva, chat 6. Nunca decide disponibilidad real:
  // toda solicitud queda en pending y se completa en public/js/booking.js contra
  // /api/bookings. Las etiquetas viajan como data-label-* para que booking.js
  // no tenga que conocer el idioma, igual que data-cta-label en el bloque catalog.
  bookingForm(ctx, block, id) {
    const f = ctx.chrome.bookingForm;
    return (
      '<section class="section theme-' + esc(block.theme || "light") + '" aria-labelledby="' + id + '-heading">' +
      '<div class="container">' +
      '<h2 class="visually-hidden" id="' + id + '-heading">' + t(ctx, "@cta.book") + "</h2>" +
      '<form class="form" data-booking-form novalidate' +
      ' data-label-submit="' + t(ctx, f.submit) + '"' +
      ' data-label-submitting="' + t(ctx, f.submitting) + '"' +
      ' data-label-success-title="' + t(ctx, f.successTitle) + '"' +
      ' data-label-success-text="' + t(ctx, f.successText) + '"' +
      ' data-label-success-whatsapp="' + t(ctx, f.successWhatsapp) + '"' +
      ' data-label-error-title="' + t(ctx, f.errorTitle) + '"' +
      ' data-label-error-text="' + t(ctx, f.errorText) + '"' +
      ' data-label-error-retry="' + t(ctx, f.errorRetry) + '">' +
      '<p class="form__hp" aria-hidden="true"><label>Company<input type="text" name="company" tabindex="-1" autocomplete="off"></label></p>' +
      '<div class="field">' +
      '<label class="field__label" for="bf-experience">' + t(ctx, f.experience) + "</label>" +
      '<select class="field__control" id="bf-experience" name="experience" required data-booking-experience>' +
      '<option value="">' + t(ctx, f.experiencePlaceholder) + "</option>" +
      "</select></div>" +
      '<fieldset class="field field--radio-group">' +
      '<legend class="field__label">' + t(ctx, f.modality) + "</legend>" +
      '<div class="field__options">' +
      '<label class="option"><input type="radio" name="modality" value="cabina" required> ' + t(ctx, f.modalityCabin) + "</label>" +
      '<label class="option"><input type="radio" name="modality" value="domicilio"> ' + t(ctx, f.modalityHome) + "</label>" +
      '<label class="option"><input type="radio" name="modality" value="hotel"> ' + t(ctx, f.modalityHotel) + "</label>" +
      "</div></fieldset>" +
      '<div class="field-row">' +
      '<div class="field">' +
      '<label class="field__label" for="bf-date">' + t(ctx, f.date) + "</label>" +
      '<input class="field__control" id="bf-date" name="date" type="date" required>' +
      "</div>" +
      '<div class="field">' +
      '<label class="field__label" for="bf-time">' + t(ctx, f.time) + "</label>" +
      '<input class="field__control" id="bf-time" name="time" type="time" required>' +
      "</div></div>" +
      '<div class="field">' +
      '<label class="field__label" for="bf-name">' + t(ctx, f.name) + "</label>" +
      '<input class="field__control" id="bf-name" name="name" type="text" autocomplete="name" required>' +
      "</div>" +
      '<div class="field">' +
      '<label class="field__label" for="bf-contact">' + t(ctx, f.contact) + "</label>" +
      '<input class="field__control" id="bf-contact" name="contact" type="tel" autocomplete="tel" required>' +
      "</div>" +
      '<div class="field">' +
      '<label class="field__label" for="bf-notes">' + t(ctx, f.notes) + "</label>" +
      '<textarea class="field__control" id="bf-notes" name="notes" rows="3" placeholder="' + t(ctx, f.notesPlaceholder) + '"></textarea>' +
      "</div>" +
      '<div class="actions">' +
      '<button class="btn btn--primary" type="submit" data-booking-submit>' + t(ctx, f.submit) + "</button>" +
      "</div>" +
      "</form>" +
      '<div class="form__status" role="status" aria-live="polite" hidden data-booking-status></div>' +
      "</div></section>"
    );
  },

  // Espacio reservado para integraciones futuras. No muestra nada al visitante
  slot(ctx, block) {
    return (
      "<!-- " + safeComment(block.note || "") + " -->" +
      '<div hidden data-slot="' + esc(block.name || "slot") + '"></div>'
    );
  },

  // Nota interna sin salida visible
  placeholder(ctx, block) {
    return "<!-- " + safeComment(block.note || "") + " -->";
  }
};

function formatPhone(value) {
  const match = /^\+52(\d{3})(\d{3})(\d{4})$/.exec(value);
  return match ? "+52 " + match[1] + " " + match[2] + " " + match[3] : value;
}

function renderBlocks(ctx, blocks) {
  return blocks
    .map((block, index) => {
      const render = BLOCKS[block.type];
      if (!render) return "<!-- bloque desconocido: " + safeComment(block.type) + " -->";
      return render(ctx, block, "b" + index + "-title");
    })
    .join("\n");
}

// ---------- Encabezado ----------
function renderHeader(ctx) {
  const c = ctx.chrome;
  const current = ctx.route.key;
  const keys = ["home", "experiences", "about", "service", "contact"];
  const items = keys
    .map((key, index) => {
      const page = current === key ? ' aria-current="page"' : "";
      return (
        '<li class="nav__item" style="--i:' + (index + 1) + '"><a class="nav__link" href="' +
        esc(pathTo(ctx, key)) + '"' + page + ">" + esc(c.nav[key]) + "</a></li>"
      );
    })
    .join("\n          ");

  const other = LOCALES.find((l) => l.code === c.langSwitch.lang);
  const otherPath = ctx.route.paths[other.code];

  return (
    '<header class="site-header" data-header>\n' +
    '    <div class="container site-header__bar">\n' +
    '      <a class="brand" href="' + esc(pathTo(ctx, "home")) + '" aria-label="' + esc(c.brandAria) + '">MAHAS</a>\n' +
    '      <nav class="nav" id="site-nav" aria-label="' + esc(c.navAria) + '">\n' +
    '        <ul class="nav__list">\n          ' + items + "\n" +
    '          <li class="nav__item nav__cta" style="--i:6">\n' +
    '            <a class="btn btn--primary btn--block" href="' + esc(pathTo(ctx, "booking")) + '" data-booking>\n' +
    '              <span class="only-mobile">' + esc(c.cta.book) + "</span>\n" +
    '              <span class="only-desktop">' + esc(c.cta.bookShort) + "</span>\n" +
    "            </a>\n          </li>\n" +
    '          <li class="nav__item" style="--i:7"><a class="nav__lang" href="' + esc(otherPath) +
    '" hreflang="' + esc(c.langSwitch.lang) + '" lang="' + esc(c.langSwitch.lang) + '" aria-label="' +
    esc(c.langSwitch.aria) + '">' + esc(c.langSwitch.code) + "</a></li>\n" +
    "        </ul>\n      </nav>\n" +
    '      <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="site-nav"' +
    ' data-label-open="' + esc(c.menu.open) + '" data-label-close="' + esc(c.menu.close) + '">\n' +
    '        <span class="visually-hidden">' + esc(c.menu.open) + "</span>\n" +
    '        <span class="nav-toggle__bar"></span>\n        <span class="nav-toggle__bar"></span>\n' +
    "      </button>\n    </div>\n  </header>"
  );
}

// ---------- Pie ----------
function renderFooter(ctx) {
  const f = ctx.chrome.footer;
  const links = f.links
    .map((link) => {
      const booking = link.booking ? " data-booking" : "";
      return '<li><a href="' + esc(pathTo(ctx, link.to)) + '"' + booking + ">" + t(ctx, link.label) + "</a></li>";
    })
    .join("\n            ");
  const channels = f.channels
    .map((item) => '<li><a data-channel="' + esc(item.channel) + '">' + esc(item.label) + "</a></li>")
    .join("\n            ");

  return (
    '<footer class="site-footer">\n    <div class="container">\n      <div class="site-footer__grid">\n' +
    '        <div>\n          <p class="site-footer__brand">MAHAS</p>\n' +
    '          <p class="site-footer__tag">' + esc(f.tag) + "</p>\n" +
    '          <p class="site-footer__place">' + esc(f.place) + "</p>\n        </div>\n" +
    '        <nav aria-label="' + esc(f.navAria) + '">\n' +
    '          <h2 class="site-footer__title">' + esc(f.exploreTitle) + "</h2>\n" +
    '          <ul class="site-footer__list">\n            ' + links + "\n          </ul>\n        </nav>\n" +
    '        <div>\n          <h2 class="site-footer__title">' + esc(f.channelsTitle) + "</h2>\n" +
    '          <ul class="site-footer__list">\n            ' + channels + "\n          </ul>\n        </div>\n" +
    "      </div>\n" +
    '      <div class="site-footer__legal">\n' +
    '        <a data-legal="privacy">' + esc(f.privacy) + "</a>\n" +
    '        <a data-legal="terms">' + esc(f.terms) + "</a>\n" +
    '        <span>© <span data-year>2026</span> ' + esc(f.rights) + "</span>\n" +
    "      </div>\n    </div>\n  </footer>"
  );
}

// ---------- Pagina completa ----------
export function renderPage({ route, lang, dict, content, headBlock, experience }) {
  const ctx = makeContext(lang, dict, route, experience);
  const htmlLang = dict.htmlLang || (lang === "es" ? "es-MX" : "en");
  const sticky =
    content.sticky === false
      ? ""
      : '\n  <div class="sticky-cta" data-sticky-cta>\n    <a class="btn btn--primary btn--block" href="' +
        esc(pathTo(ctx, "booking")) + '" data-booking>' + esc(ctx.chrome.cta.book) + "</a>\n  </div>\n";

  return (
    "<!DOCTYPE html>\n" +
    '<html lang="' + esc(htmlLang) + '">\n<head>\n' +
    '  <meta charset="utf-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
    '  <meta name="theme-color" content="#171614">\n' +
    '  <meta name="color-scheme" content="dark">\n' +
    '  <link rel="icon" href="' + FAVICON + '">\n' +
    '  <link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '  <link rel="stylesheet" href="' + FONTS_URL + '">\n' +
    '  <link rel="stylesheet" href="/css/tokens.css">\n' +
    '  <link rel="stylesheet" href="/css/styles.css">\n' +
    "  <script>document.documentElement.classList.add('js');</script>\n" +
    '  <script type="module" src="/js/main.js"></script>' +
    headBlock +
    "</head>\n<body>\n" +
    '  <a class="skip-link" href="#main">' + esc(ctx.chrome.skip) + "</a>\n\n  " +
    renderHeader(ctx) + "\n\n" +
    '  <main id="main" data-content-status="' + esc(content.status || "proposal") + '">\n' +
    renderBlocks(ctx, content.blocks) + "\n  </main>\n" +
    sticky + "\n  " +
    renderFooter(ctx) + "\n</body>\n</html>\n"
  );
}
