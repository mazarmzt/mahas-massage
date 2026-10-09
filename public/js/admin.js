// MAHAS MASSAGE, chat 5. Admin del catalogo y solicitudes de reserva (chat 6).
// Vanilla JS, sin dependencias. Todo el estado vive en memoria (state) y el
// DOM se reconstruye por completo solo en cambios de vista (login/app) o
// cuando llegan datos nuevos del servidor. Mientras la persona escribe en un
// campo, nunca se vuelve a armar el HTML: eso le quitaria el foco al campo a
// mitad de la escritura. En su lugar, cada tecla actualiza state.catalog y
// solo toca a mano los pedazos de DOM que dependen de ese valor (el nombre en
// el encabezado de la tarjeta, el punto de color del estado, el resumen de
// precio y la barra de guardar).

const STATUS_LABELS = {
  approved: "Aprobado",
  proposal: "Propuesta",
  pending: "Pendiente",
  risk: "Riesgo"
};
const STATUS_ORDER = ["approved", "proposal", "pending", "risk"];
const PRICE_PER_LABELS = { person: "Por persona", couple: "Por pareja" };

const state = {
  view: "loading",
  user: null,
  catalog: [],
  original: [],
  loginError: "",
  loginBusy: false,
  saveBusy: false,
  saveError: "",
  logoutConfirm: false,
  pendingSaveAfterLogin: false,
  bookings: [],
  bookingsState: "idle"
};

let flashTimer = null;

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function cloneCatalog(items) {
  return JSON.parse(JSON.stringify(items || []));
}

function isDirty() {
  return JSON.stringify(state.catalog) !== JSON.stringify(state.original);
}

async function apiFetch(path, options) {
  const opts = Object.assign({ credentials: "same-origin" }, options || {});
  if (opts.body && !opts.headers) opts.headers = { "Content-Type": "application/json" };
  let res;
  try {
    res = await fetch(path, opts);
  } catch (err) {
    return { ok: false, status: 0, data: null };
  }
  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    // sin cuerpo JSON, por ejemplo en algunas respuestas 204
  }
  return { ok: res.ok, status: res.status, data };
}

function computeMeta(item) {
  const durations = item.durations || [];
  if (durations.length === 0) return "Sin duraciones";
  const minutes = durations.map((d) => Number(d.minutes) || 0);
  const prices = durations.map((d) => Number(d.price) || 0);
  const minM = Math.min(...minutes);
  const maxM = Math.max(...minutes);
  const minP = Math.min(...prices);
  const durationText = minM === maxM ? minM + " min" : minM + "\u2013" + maxM + " min";
  const priceText = "desde $" + minP.toLocaleString("es-MX") + " MXN";
  const priceForText = PRICE_PER_LABELS[item.pricePer] || "";
  return [durationText, priceText, priceForText].filter(Boolean).join(" \u00b7 ");
}

// ---------- Validacion en el cliente, refleja validateCatalogPayload del
// Worker (src/seo/catalog.js). El servidor sigue siendo la autoridad final;
// esto solo evita un viaje de red para un error que ya se puede ver aqui.
function validateCatalogClient(items) {
  const errors = [];
  const ids = new Set();
  for (const item of items) {
    if (!item.id) {
      errors.push({ id: null, message: "Falta el id de una experiencia" });
      continue;
    }
    if (ids.has(item.id)) {
      errors.push({ id: item.id, message: "El id " + item.id + " esta repetido" });
    }
    ids.add(item.id);

    if (!STATUS_ORDER.includes(item.status)) {
      errors.push({ id: item.id, message: "Estado invalido en " + item.id });
    }
    if (!item.name || !item.name.es || !item.name.en) {
      errors.push({ id: item.id, message: "Falta el nombre en ES o EN en " + item.id });
    }
    if (!item.description || !item.description.es || !item.description.en) {
      errors.push({ id: item.id, message: "Falta la descripcion en ES o EN en " + item.id });
    }
    if (!["person", "couple"].includes(item.pricePer)) {
      errors.push({ id: item.id, message: "Precio por persona o pareja invalido en " + item.id });
    }
    if (!Array.isArray(item.durations) || item.durations.length === 0) {
      errors.push({ id: item.id, message: "Faltan duraciones en " + item.id });
    } else {
      for (const d of item.durations) {
        if (!(Number(d.minutes) > 0) || !(Number(d.price) >= 0)) {
          errors.push({ id: item.id, message: "Duracion o precio invalido en " + item.id });
        }
      }
    }
  }
  return errors;
}

// ---------- Plantillas ----------
function loginTemplate() {
  return (
    '<div class="admin-login">' +
      '<div class="admin-login__card">' +
        '<p class="eyebrow">Mahas Admin</p>' +
        '<h1 class="admin-login__title">Acceso privado</h1>' +
        '<p class="admin-login__hint">Entra con tu usuario y contrasena.</p>' +
        '<form data-role="login-form" novalidate>' +
          '<div class="admin-field">' +
            '<label class="admin-field__label" for="admin-username">Usuario</label>' +
            '<input class="admin-field__input" id="admin-username" name="username" type="text" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" required>' +
          '</div>' +
          '<div class="admin-field">' +
            '<label class="admin-field__label" for="admin-password">Contrasena</label>' +
            '<input class="admin-field__input" id="admin-password" name="password" type="password" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" required>' +
          '</div>' +
          '<p class="admin-error" data-role="login-error" data-visible="' + (state.loginError ? "true" : "false") + '">' +
            escapeHtml(state.loginError) +
          '</p>' +
          '<button class="btn btn--primary btn--block admin-login__submit" type="submit"' + (state.loginBusy ? " disabled" : "") + '>' +
            (state.loginBusy ? "Entrando\u2026" : "Entrar") +
          '</button>' +
          (state.pendingSaveAfterLogin
            ? '<p class="admin-login__hint">Tu sesion expiro. Al entrar de nuevo, tus cambios sin guardar se intentan guardar otra vez.</p>'
            : "") +
        '</form>' +
      '</div>' +
    '</div>'
  );
}

function logoutConfirmTemplate() {
  return (
    '<div class="admin-logout-confirm">' +
      '<p class="admin-logout-confirm__text">Tienes cambios sin guardar. Si cierras sesion ahora se pierden. Quieres cerrar sesion de todas formas?</p>' +
      '<div class="admin-logout-confirm__actions">' +
        '<button class="btn btn--secondary btn--sm" type="button" data-action="logout-cancel">Cancelar</button>' +
        '<button class="btn btn--primary btn--sm" type="button" data-action="logout-confirm">Si, cerrar sesion</button>' +
      '</div>' +
    '</div>'
  );
}

function appShellTemplate() {
  return (
    '<header class="admin-topbar">' +
      '<span class="brand" style="font-size:.85rem;">MAHAS ADMIN</span>' +
      '<div class="admin-topbar__user">' +
        '<span class="admin-topbar__name">' + escapeHtml(state.user ? state.user.name : "") + '</span>' +
        '<button class="admin-topbar__logout" type="button" data-action="logout">Cerrar sesion</button>' +
      '</div>' +
    '</header>' +
    '<main class="admin-main">' +
      '<div class="container">' +
        '<div class="admin-main__head">' +
          '<p class="eyebrow">Experiencias Mahas</p>' +
          '<h1 class="lead lead--sm">Catalogo</h1>' +
        '</div>' +
        '<div id="admin-logout-confirm"></div>' +
        '<ul class="admin-catalog" id="admin-catalog-list"></ul>' +
        '<section class="admin-bookings" aria-labelledby="admin-bookings-title">' +
          '<div class="admin-main__head">' +
            '<p class="eyebrow">Solicitudes</p>' +
            '<h2 class="lead lead--sm" id="admin-bookings-title">Reservas pendientes</h2>' +
          '</div>' +
          '<ul class="admin-bookings__list" id="admin-bookings-list"></ul>' +
        '</section>' +
      '</div>' +
    '</main>' +
    '<div class="admin-savebar" id="admin-savebar" data-visible="false">' +
      '<span class="admin-savebar__label">Cambios sin guardar</span>' +
      '<p class="admin-savebar__error" data-role="savebar-error"></p>' +
      '<div class="admin-savebar__actions">' +
        '<button class="btn btn--secondary btn--sm" type="button" data-action="discard">Descartar</button>' +
        '<button class="btn btn--primary btn--sm" type="button" data-action="save">Guardar cambios</button>' +
      '</div>' +
    '</div>' +
    '<div class="admin-flash" id="admin-flash" data-visible="false" role="status"></div>'
  );
}

function durationRowTemplate(item, duration, index) {
  return (
    '<div class="admin-duration-row">' +
      '<span class="admin-duration-row__label">Duracion ' + (index + 1) + '</span>' +
      '<div>' +
        '<span class="admin-duration-row__caption">Minutos</span>' +
        '<input class="admin-field__input" type="number" min="1" step="1" inputmode="numeric" ' +
          'data-field="duration-minutes" data-id="' + escapeHtml(item.id) + '" data-index="' + index + '" ' +
          'value="' + escapeHtml(duration.minutes) + '" aria-label="Minutos, duracion ' + (index + 1) + '">' +
      '</div>' +
      '<div>' +
        '<span class="admin-duration-row__caption">Precio MXN</span>' +
        '<input class="admin-field__input" type="number" min="0" step="1" inputmode="numeric" ' +
          'data-field="duration-price" data-id="' + escapeHtml(item.id) + '" data-index="' + index + '" ' +
          'value="' + escapeHtml(duration.price) + '" aria-label="Precio, duracion ' + (index + 1) + '">' +
      '</div>' +
    '</div>'
  );
}

function cardTemplate(item) {
  const id = escapeHtml(item.id);
  const name = (item.name && item.name.es) || "(sin nombre)";
  const durationsHtml = (item.durations || [])
    .map((d, i) => durationRowTemplate(item, d, i))
    .join("");

  return (
    '<li class="admin-card" data-id="' + id + '" data-open="false">' +
      '<button class="admin-card__head" type="button" data-action="toggle-card" aria-expanded="false">' +
        '<span class="admin-card__dot" data-role="card-dot" data-id="' + id + '" style="--admin-dot-color: var(--admin-status-' + item.status + ')"></span>' +
        '<span class="admin-card__title">' +
          '<span class="admin-card__name" data-role="card-name" data-id="' + id + '">' + escapeHtml(name) + '</span>' +
          '<span class="admin-card__meta" data-role="card-meta" data-id="' + id + '">' + escapeHtml(computeMeta(item)) + '</span>' +
        '</span>' +
        '<span class="admin-card__chevron" aria-hidden="true"></span>' +
      '</button>' +
      '<div class="admin-card__body">' +
        '<div class="admin-card__body-inner">' +
          '<div class="admin-field">' +
            '<label class="admin-field__label" for="status-' + id + '">Estado</label>' +
            '<select class="admin-field__select" id="status-' + id + '" data-field="status" data-id="' + id + '">' +
              STATUS_ORDER.map((s) => '<option value="' + s + '"' + (item.status === s ? " selected" : "") + '>' + STATUS_LABELS[s] + '</option>').join("") +
            '</select>' +
          '</div>' +
          '<div class="admin-card__grid">' +
            '<div class="admin-field">' +
              '<label class="admin-field__label" for="name-es-' + id + '">Nombre (ES)</label>' +
              '<input class="admin-field__input" id="name-es-' + id + '" type="text" data-field="name-es" data-id="' + id + '" value="' + escapeHtml(item.name.es) + '">' +
            '</div>' +
            '<div class="admin-field">' +
              '<label class="admin-field__label" for="name-en-' + id + '">Nombre (EN)</label>' +
              '<input class="admin-field__input" id="name-en-' + id + '" type="text" data-field="name-en" data-id="' + id + '" value="' + escapeHtml(item.name.en) + '">' +
            '</div>' +
            '<div class="admin-field">' +
              '<label class="admin-field__label" for="desc-es-' + id + '">Descripcion (ES)</label>' +
              '<textarea class="admin-field__textarea" id="desc-es-' + id + '" data-field="desc-es" data-id="' + id + '">' + escapeHtml(item.description.es) + '</textarea>' +
            '</div>' +
            '<div class="admin-field">' +
              '<label class="admin-field__label" for="desc-en-' + id + '">Descripcion (EN)</label>' +
              '<textarea class="admin-field__textarea" id="desc-en-' + id + '" data-field="desc-en" data-id="' + id + '">' + escapeHtml(item.description.en) + '</textarea>' +
            '</div>' +
          '</div>' +
          '<div class="admin-field">' +
            '<label class="admin-field__label" for="priceper-' + id + '">Precio por</label>' +
            '<select class="admin-field__select" id="priceper-' + id + '" data-field="pricePer" data-id="' + id + '">' +
              '<option value="person"' + (item.pricePer === "person" ? " selected" : "") + '>Persona</option>' +
              '<option value="couple"' + (item.pricePer === "couple" ? " selected" : "") + '>Pareja</option>' +
            '</select>' +
          '</div>' +
          '<div class="admin-durations">' +
            '<p class="admin-field__label">Duraciones y precios</p>' +
            durationsHtml +
          '</div>' +
        '</div>' +
      '</div>' +
    '</li>'
  );
}

// ---------- Render ----------
function focusFirstLoginField() {
  const el = document.getElementById("admin-username");
  if (el) el.focus();
}

function renderShell() {
  const root = document.getElementById("admin-root");
  if (!root) return;

  if (state.view === "login") {
    root.innerHTML = loginTemplate();
    focusFirstLoginField();
    return;
  }

  if (state.view === "app") {
    root.innerHTML = appShellTemplate();
    renderLogoutConfirm();
    renderCatalog();
  }
}

function renderCatalog() {
  const list = document.getElementById("admin-catalog-list");
  if (!list) return;
  if (state.catalog.length === 0) {
    list.innerHTML = '<li class="admin-loading" style="padding: 2rem 0;">No hay experiencias en el catalogo.</li>';
    return;
  }
  list.innerHTML = state.catalog.map(cardTemplate).join("");
  updateSavebar();
}

function renderLogoutConfirm() {
  const el = document.getElementById("admin-logout-confirm");
  if (!el) return;
  el.innerHTML = state.logoutConfirm ? logoutConfirmTemplate() : "";
}

function updateCardName(id) {
  const el = document.querySelector('[data-role="card-name"][data-id="' + id + '"]');
  const item = state.catalog.find((i) => i.id === id);
  if (el && item) el.textContent = item.name.es || "(sin nombre)";
}

function updateCardDot(id) {
  const el = document.querySelector('[data-role="card-dot"][data-id="' + id + '"]');
  const item = state.catalog.find((i) => i.id === id);
  if (el && item) el.style.setProperty("--admin-dot-color", "var(--admin-status-" + item.status + ")");
}

function updateCardMeta(id) {
  const el = document.querySelector('[data-role="card-meta"][data-id="' + id + '"]');
  const item = state.catalog.find((i) => i.id === id);
  if (el && item) el.textContent = computeMeta(item);
}

function updateSavebar() {
  const bar = document.getElementById("admin-savebar");
  if (!bar) return;
  bar.dataset.visible = isDirty() ? "true" : "false";
  const errorEl = bar.querySelector('[data-role="savebar-error"]');
  if (errorEl) errorEl.textContent = state.saveError || "";
  const saveBtn = bar.querySelector('[data-action="save"]');
  if (saveBtn) {
    saveBtn.disabled = state.saveBusy;
    saveBtn.textContent = state.saveBusy ? "Guardando\u2026" : "Guardar cambios";
  }
}

function showFlash(message) {
  const el = document.getElementById("admin-flash");
  if (!el) return;
  el.textContent = message;
  el.dataset.visible = "true";
  if (flashTimer) clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    el.dataset.visible = "false";
  }, 2200);
}

function openOrCloseCard(id) {
  const list = document.getElementById("admin-catalog-list");
  if (!list) return;
  const target = list.querySelector('.admin-card[data-id="' + id + '"]');
  if (!target) return;
  const willOpen = target.dataset.open !== "true";
  list.querySelectorAll(".admin-card").forEach((card) => {
    const open = willOpen && card.dataset.id === id;
    card.dataset.open = open ? "true" : "false";
    const head = card.querySelector(".admin-card__head");
    if (head) head.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

function forceOpenCard(id) {
  const list = document.getElementById("admin-catalog-list");
  if (!list || !id) return;
  list.querySelectorAll(".admin-card").forEach((card) => {
    const open = card.dataset.id === id;
    card.dataset.open = open ? "true" : "false";
    const head = card.querySelector(".admin-card__head");
    if (head) head.setAttribute("aria-expanded", open ? "true" : "false");
  });
  const target = list.querySelector('.admin-card[data-id="' + id + '"]');
  if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ---------- Logica de negocio ----------
function showLogin() {
  state.view = "login";
  renderShell();
}

function handleFieldInput(id, field, el) {
  const item = state.catalog.find((i) => i.id === id);
  if (!item) return;

  switch (field) {
    case "name-es":
      item.name.es = el.value;
      updateCardName(id);
      break;
    case "name-en":
      item.name.en = el.value;
      break;
    case "desc-es":
      item.description.es = el.value;
      break;
    case "desc-en":
      item.description.en = el.value;
      break;
    case "status":
      item.status = el.value;
      updateCardDot(id);
      break;
    case "pricePer":
      item.pricePer = el.value;
      updateCardMeta(id);
      break;
    case "duration-minutes": {
      const idx = parseInt(el.dataset.index, 10);
      if (item.durations[idx]) item.durations[idx].minutes = parseFloat(el.value) || 0;
      updateCardMeta(id);
      break;
    }
    case "duration-price": {
      const idx = parseInt(el.dataset.index, 10);
      if (item.durations[idx]) item.durations[idx].price = parseFloat(el.value) || 0;
      updateCardMeta(id);
      break;
    }
    default:
      return;
  }
  updateSavebar();
}

function discardChanges() {
  state.catalog = cloneCatalog(state.original);
  state.saveError = "";
  renderCatalog();
}

async function saveCatalog() {
  const errors = validateCatalogClient(state.catalog);
  if (errors.length > 0) {
    state.saveError = errors[0].message;
    if (errors[0].id) forceOpenCard(errors[0].id);
    updateSavebar();
    return;
  }

  state.saveBusy = true;
  state.saveError = "";
  updateSavebar();

  const { ok, status, data } = await apiFetch("/api/admin/catalog", {
    method: "PUT",
    body: JSON.stringify({ items: state.catalog })
  });

  state.saveBusy = false;

  if (ok && data && data.items) {
    state.catalog = cloneCatalog(data.items);
    state.original = cloneCatalog(data.items);
    renderCatalog();
    showFlash("Cambios guardados");
    return;
  }

  if (status === 401) {
    state.pendingSaveAfterLogin = true;
    showLogin();
    return;
  }

  state.saveError = (data && data.error) || "No pudimos guardar los cambios. Intenta de nuevo.";
  updateSavebar();
}

// ---------- Solicitudes de reserva (chat 6) ----------
// Lectura unicamente. Toda solicitud llega en estado pending: confirmar la
// disponibilidad sigue siendo un paso humano por WhatsApp, fuera de este panel.
function formatCreated(iso) {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString("es-MX", {
    timeZone: "America/Mazatlan",
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function bookingTemplate(b) {
  const flag = b.needsHumanReview
    ? '<span class="admin-booking__flag">Requiere atencion humana</span>'
    : "";
  const when = [b.date, b.time].filter(Boolean).join(" ");
  const summary = [b.experience, b.modality, when].filter(Boolean).join(" \u00b7 ");
  return (
    '<li class="admin-booking">' +
      '<div class="admin-booking__top">' +
        '<strong class="admin-booking__name">' + escapeHtml(b.name) + '</strong>' + flag +
      '</div>' +
      '<p class="admin-booking__line">' + escapeHtml(summary) + '</p>' +
      '<p class="admin-booking__line">' + escapeHtml(b.contact) + '</p>' +
      (b.notes ? '<p class="admin-booking__notes">' + escapeHtml(b.notes) + '</p>' : "") +
      '<p class="admin-booking__meta">Solicitada ' + escapeHtml(formatCreated(b.createdAt)) +
        ' \u00b7 Estado: Pendiente</p>' +
    '</li>'
  );
}

function renderBookings() {
  const list = document.getElementById("admin-bookings-list");
  if (!list) return;
  if (state.bookingsState === "loading") {
    list.innerHTML = '<li class="admin-loading" style="padding: 2rem 0;">Cargando solicitudes\u2026</li>';
    return;
  }
  if (state.bookingsState === "error") {
    list.innerHTML =
      '<li class="admin-error" data-visible="true" style="padding: 2rem 0;">No pudimos cargar las solicitudes. Recarga la pagina para intentar de nuevo.</li>';
    return;
  }
  if (state.bookings.length === 0) {
    list.innerHTML = '<li class="admin-loading" style="padding: 2rem 0;">Todavia no hay solicitudes.</li>';
    return;
  }
  list.innerHTML = state.bookings.map(bookingTemplate).join("");
}

async function loadBookings() {
  state.bookingsState = "loading";
  renderBookings();
  const { ok, status, data } = await apiFetch("/api/admin/bookings", { method: "GET" });
  if (!ok) {
    if (status === 401) {
      showLogin();
      return;
    }
    state.bookingsState = "error";
    renderBookings();
    return;
  }
  state.bookings = (data && data.bookings) || [];
  state.bookingsState = "ready";
  renderBookings();
}

async function loadCatalog() {
  state.view = "app";
  renderShell();

  const list = document.getElementById("admin-catalog-list");
  if (list) list.innerHTML = '<li class="admin-loading" style="padding: 2rem 0;">Cargando catalogo\u2026</li>';

  const { ok, status, data } = await apiFetch("/api/admin/catalog", { method: "GET" });

  if (!ok) {
    if (status === 401) {
      showLogin();
      return;
    }
    if (list) {
      list.innerHTML =
        '<li class="admin-error" data-visible="true" style="padding: 2rem 0;">No pudimos cargar el catalogo. Recarga la pagina para intentar de nuevo.</li>';
    }
    return;
  }

  const items = (data && data.items) || [];
  state.catalog = cloneCatalog(items);
  state.original = cloneCatalog(items);
  renderCatalog();
  await loadBookings();
}

async function handleLoginSubmit(form) {
  const username = form.querySelector('[name="username"]').value.trim();
  const password = form.querySelector('[name="password"]').value;

  state.loginBusy = true;
  state.loginError = "";
  renderShell();

  const { ok, data } = await apiFetch("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });

  state.loginBusy = false;

  if (ok && data && data.ok) {
    state.user = data.user;
    state.loginError = "";
    const shouldRetrySave = state.pendingSaveAfterLogin;
    state.pendingSaveAfterLogin = false;

    if (shouldRetrySave && state.catalog.length > 0) {
      state.view = "app";
      renderShell();
      await saveCatalog();
    } else {
      await loadCatalog();
    }
    return;
  }

  state.loginError = (data && data.error) || "No se pudo iniciar sesion";
  renderShell();
}

async function doLogout() {
  await apiFetch("/api/admin/logout", { method: "POST" });
  state.user = null;
  state.catalog = [];
  state.original = [];
  state.bookings = [];
  state.bookingsState = "idle";
  state.logoutConfirm = false;
  state.pendingSaveAfterLogin = false;
  showLogin();
}

function onLogoutClick() {
  if (isDirty() && !state.logoutConfirm) {
    state.logoutConfirm = true;
    renderLogoutConfirm();
    return;
  }
  doLogout();
}

// ---------- Eventos, delegados en la raiz para no perder el foco al escribir ----------
function wireEvents() {
  const root = document.getElementById("admin-root");
  if (!root) return;

  root.addEventListener("submit", (event) => {
    const form = event.target.closest('[data-role="login-form"]');
    if (!form) return;
    event.preventDefault();
    handleLoginSubmit(form);
  });

  root.addEventListener("click", (event) => {
    const toggleBtn = event.target.closest('[data-action="toggle-card"]');
    if (toggleBtn) {
      const card = toggleBtn.closest(".admin-card");
      if (card) openOrCloseCard(card.dataset.id);
      return;
    }
    if (event.target.closest('[data-action="logout"]')) {
      onLogoutClick();
      return;
    }
    if (event.target.closest('[data-action="logout-confirm"]')) {
      doLogout();
      return;
    }
    if (event.target.closest('[data-action="logout-cancel"]')) {
      state.logoutConfirm = false;
      renderLogoutConfirm();
      return;
    }
    if (event.target.closest('[data-action="discard"]')) {
      discardChanges();
      return;
    }
    if (event.target.closest('[data-action="save"]')) {
      saveCatalog();
      return;
    }
  });

  root.addEventListener("input", (event) => {
    const field = event.target.dataset ? event.target.dataset.field : null;
    if (!field) return;
    handleFieldInput(event.target.dataset.id, field, event.target);
  });

  root.addEventListener("change", (event) => {
    const field = event.target.dataset ? event.target.dataset.field : null;
    if (!field) return;
    handleFieldInput(event.target.dataset.id, field, event.target);
  });
}

async function init() {
  wireEvents();
  const { ok, data } = await apiFetch("/api/admin/session", { method: "GET" });
  if (ok && data && data.ok) {
    state.user = data.user;
    await loadCatalog();
  } else {
    showLogin();
  }
}

init();
