// ============================================================================
// MAHAS MASSAGE · comportamiento de la Home · V0.1
// JavaScript puro, sin dependencias. Se carga como modulo.
// ============================================================================

import { SITE } from './config.js';
import { EXPERIENCES } from './experiences.js';

const doc = document.documentElement;
const lang = doc.lang === 'en' ? 'en' : 'es';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Un valor pendiente empieza con TODO o esta vacio
const isTodo = (value) => !value || String(value).startsWith('TODO');

// ---------- Encabezado: se vuelve solido al hacer scroll ----------
function initHeader() {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  const update = () => header.classList.toggle('is-solid', window.scrollY > 24);
  update();
  window.addEventListener('scroll', update, { passive: true });
}

// ---------- Menu movil ----------
function initMenu() {
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  const label = toggle.querySelector('.visually-hidden');
  const desktop = window.matchMedia('(min-width: 70em)');
  const behind = document.querySelectorAll('main, footer, [data-sticky-cta]');

  const setOpen = (open) => {
    doc.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (label) label.textContent = open ? toggle.dataset.labelClose : toggle.dataset.labelOpen;
    // El contenido detras del menu no recibe foco ni lectura mientras esta abierto
    behind.forEach((el) => { el.inert = open; });
  };

  toggle.addEventListener('click', () => {
    setOpen(!doc.classList.contains('menu-open'));
  });

  // Cerrar al elegir una ruta
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (!doc.classList.contains('menu-open')) return;

    if (event.key === 'Escape') {
      setOpen(false);
      toggle.focus();
      return;
    }

    // Mantener el foco dentro del menu mientras esta abierto
    if (event.key === 'Tab') {
      const items = [toggle, ...nav.querySelectorAll('a[href]')];
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  desktop.addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

// ---------- Tarjetas de experiencias desde datos ----------
function renderExperiences() {
  const grid = document.querySelector('[data-experience-grid]');
  if (!grid) return;

  const section = grid.closest('section');
  const ctaLabel = grid.dataset.ctaLabel || '';
  const pendingLabel = grid.dataset.pendingLabel || '';
  const pendingText = grid.dataset.pendingText || '';
  const basePath = SITE.routes[lang].experiences;

  // Solo se publican experiencias aprobadas. Las pendientes salen unicamente
  // en modo vista previa y siempre con su marca visible
  const visible = EXPERIENCES.filter((item) => {
    if (item.listed === false) return false;
    if (item.status === 'approved') return true;
    if (item.status === 'risk') return false;
    return SITE.preview.showPending === true;
  });

  if (visible.length === 0) {
    if (section) section.hidden = true;
    return;
  }

  visible.forEach((item) => {
    const approved = item.status === 'approved';
    const name = item.name[lang] || item.name.es;
    const text = item.shortDescription[lang] || item.shortDescription.es;

    const card = document.createElement('li');
    card.className = 'card';
    card.dataset.reveal = 'rise';

    const media = document.createElement('div');
    media.className = 'card__media ph ratio-4x5';
    media.dataset.label = name;
    media.setAttribute('aria-hidden', 'true');
    if (!approved) {
      const badge = document.createElement('span');
      badge.className = 'card__badge';
      badge.textContent = pendingLabel;
      media.appendChild(badge);
    }

    const title = document.createElement('h3');
    title.className = 'card__name';
    title.textContent = name;

    const body = document.createElement('p');
    body.className = 'card__text';
    body.textContent = approved && text ? text : pendingText;

    card.append(media, title, body);

    // Duracion, precio y modalidad solo salen si estan aprobados
    if (approved) {
      // duration, price y modality ahora llegan bilingues, igual que name y shortDescription
      const pick = (field) => (field && (field[lang] || field.es)) || '';
      const meta = [pick(item.duration), pick(item.price), pick(item.modality)].filter(Boolean).join(' · ');
      if (meta) {
        const line = document.createElement('p');
        line.className = 'card__meta';
        line.textContent = meta;
        card.appendChild(line);
      }
    }

    // Sin aprobacion la pagina individual no existe, por eso no hay enlace
    let cta;
    if (approved) {
      cta = document.createElement('a');
      cta.href = `${basePath}${item.slug}/`;
    } else {
      cta = document.createElement('span');
      cta.setAttribute('aria-disabled', 'true');
    }
    cta.className = 'link';
    cta.textContent = ctaLabel;
    card.appendChild(cta);

    grid.appendChild(card);
  });
}

// ---------- Enlaces de reserva: punto unico de entrada ----------
// Hoy apuntan a la ruta interna. Cambiar el modo en config.js permite
// llevarlos a un modal o a un proveedor sin tocar el HTML
function wireBooking() {
  const href = SITE.routes[lang].book;
  document.querySelectorAll('[data-booking]').forEach((link) => {
    link.setAttribute('href', href);
  });
}

// ---------- Canales y textos legales desde la configuracion ----------
function wireChannels() {
  document.querySelectorAll('[data-channel]').forEach((el) => {
    const value = SITE.contact[el.dataset.channel];
    if (isTodo(value) || !String(value).startsWith('https://')) {
      el.removeAttribute('href');
      el.classList.add('is-todo');
      el.setAttribute('aria-disabled', 'true');
      return;
    }
    el.setAttribute('href', value);
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener noreferrer');
  });

  document.querySelectorAll('[data-legal]').forEach((el) => {
    const entry = SITE.legal[el.dataset.legal];
    const value = entry ? entry[lang] : null;
    if (isTodo(value)) {
      el.removeAttribute('href');
      el.classList.add('is-todo');
      el.setAttribute('aria-disabled', 'true');
      return;
    }
    el.setAttribute('href', value);
  });

  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
}

// ---------- Boton fijo de reserva en movil ----------
// Aparece al salir del hero y se oculta cuando la seccion de reserva es visible
function initStickyCta() {
  const bar = document.querySelector('[data-sticky-cta]');
  const hero = document.querySelector('[data-hero]');
  const booking = document.querySelector('[data-booking-section]');
  if (!bar || !hero || !('IntersectionObserver' in window)) return;

  let heroVisible = true;
  let bookingVisible = false;
  const update = () => bar.classList.toggle('is-visible', !heroVisible && !bookingVisible);

  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    update();
  }, { threshold: 0.15 }).observe(hero);

  if (booking) {
    new IntersectionObserver(([entry]) => {
      bookingVisible = entry.isIntersecting;
      update();
    }, { threshold: 0.25 }).observe(booking);
  }
}

// ---------- Aparicion suave al hacer scroll ----------
function initReveal() {
  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  // Escalonado ligero dentro de grupos
  document.querySelectorAll('[data-reveal-group]').forEach((group) => {
    [...group.children].forEach((child, index) => {
      child.style.setProperty('--reveal-delay', `${Math.min(index, 5) * 110}ms`);
    });
  });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  items.forEach((el) => observer.observe(el));
}

// ---------- Arranque ----------
initHeader();
initMenu();
renderExperiences();
wireBooking();
wireChannels();
initStickyCta();
initReveal();
