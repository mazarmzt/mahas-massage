// ============================================================================
// MAHAS MASSAGE · formulario de reserva · chat 6
// Solicitud provisional: guarda en KV con estado pending y sugiere WhatsApp.
// El frontend nunca decide disponibilidad real. Las etiquetas llegan por
// data-label-* desde src/pages/render.js, para no duplicar el idioma aqui.
// ============================================================================

import { SITE } from './config.js';
import { EXPERIENCES } from './experiences.js';

const doc = document.documentElement;
const lang = doc.lang === 'en' ? 'en' : 'es';

function experienceName(item) {
  return item.name[lang] || item.name.es;
}

function modalityLabel(value) {
  const labels = {
    es: { cabina: 'en cabina', domicilio: 'a domicilio', hotel: 'en hotel' },
    en: { cabina: 'in-studio', domicilio: 'at home', hotel: 'at a hotel' }
  };
  return (labels[lang] && labels[lang][value]) || value;
}

// El enlace wa.me solo pre-llena el mensaje; nunca confirma disponibilidad
function buildWhatsAppLink(data, name) {
  const lines = lang === 'en'
    ? [
        'Hi MAHAS, I would like to request:',
        `Experience: ${name}`,
        `Modality: ${modalityLabel(data.modality)}`,
        `Date: ${data.date} ${data.time}`,
        `Name: ${data.name}`
      ]
    : [
        'Hola MAHAS, quiero solicitar:',
        `Experiencia: ${name}`,
        `Modalidad: ${modalityLabel(data.modality)}`,
        `Fecha: ${data.date} ${data.time}`,
        `Nombre: ${data.name}`
      ];
  return `${SITE.contact.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
}

function renderStatus(el, kind, title, text, link) {
  el.hidden = false;
  el.dataset.kind = kind;
  el.textContent = '';
  const strong = document.createElement('strong');
  strong.className = 'form__status-title';
  strong.textContent = title;
  const p = document.createElement('p');
  p.textContent = text;
  el.append(strong, p);
  if (link) el.appendChild(link);
}

// Formulario de solicitud de reserva. Ver src/pages/render.js para el bloque bookingForm
// y src/api/bookings.js para el endpoint que recibe estos datos
export function initBookingForm() {
  const form = document.querySelector('[data-booking-form]');
  if (!form) return;

  const select = form.querySelector('[data-booking-experience]');
  if (select) {
    // Solo experiencias aprobadas; misma fuente que usa la Home (js/experiences.js)
    EXPERIENCES.filter((item) => item.status === 'approved').forEach((item) => {
      const option = document.createElement('option');
      option.value = item.slug;
      option.textContent = experienceName(item);
      select.appendChild(option);
    });
  }

  const statusEl = form.parentElement.querySelector('[data-booking-status]');
  const submit = form.querySelector('[data-booking-submit]');
  const labels = form.dataset;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    // Honeypot: si el campo trampa viene lleno, se descarta en silencio
    if (formData.get('company')) return;

    const data = {
      experience: formData.get('experience') || '',
      modality: formData.get('modality') || '',
      date: formData.get('date') || '',
      time: formData.get('time') || '',
      name: formData.get('name') || '',
      contact: formData.get('contact') || '',
      notes: formData.get('notes') || '',
      lang
    };

    const experienceItem = EXPERIENCES.find((item) => item.slug === data.experience);
    const expName = experienceItem ? experienceName(experienceItem) : data.experience;

    submit.disabled = true;
    const originalLabel = submit.textContent;
    if (labels.labelSubmitting) submit.textContent = labels.labelSubmitting;

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('request-failed');

      const link = document.createElement('a');
      link.className = 'link';
      link.href = buildWhatsAppLink(data, expName);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = labels.labelSuccessWhatsapp || '';

      form.hidden = true;
      renderStatus(statusEl, 'success', labels.labelSuccessTitle || '', labels.labelSuccessText || '', link);
    } catch (error) {
      submit.disabled = false;
      submit.textContent = labels.labelSubmit || originalLabel;
      renderStatus(statusEl, 'error', labels.labelErrorTitle || '', labels.labelErrorText || '');
    }
  });
}
