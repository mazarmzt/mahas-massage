// ============================================================================
// MAHAS MASSAGE · Admin de reservas (provisional) · chat 6
// Solo lectura. Pide un token compartido porque el chat 5 (sesion real de
// Admin) todavia no existe en este repositorio. Cuando exista, sustituir por
// su sesion en vez de este token.
// ============================================================================

const STORAGE_KEY = 'mahas_admin_token';
const WHATSAPP_NUMBER = '526694103650';

const tokenInput = document.getElementById('admin-token');
const loadBtn = document.getElementById('admin-load');
const refreshBtn = document.getElementById('admin-refresh');
const forgetBtn = document.getElementById('admin-forget');
const output = document.getElementById('admin-output');

function savedToken() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || '';
  } catch (error) {
    // sessionStorage puede fallar en navegacion privada; sin token guardado entonces
    return '';
  }
}

function saveToken(value) {
  try {
    sessionStorage.setItem(STORAGE_KEY, value);
  } catch (error) {
    // sin efecto si sessionStorage no esta disponible; el token solo vive en el input
  }
}

function forgetToken() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // sin efecto si sessionStorage no esta disponible
  }
  tokenInput.value = '';
  refreshBtn.hidden = true;
  forgetBtn.hidden = true;
  output.textContent = '';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

// El enlace wa.me solo pre-llena el mensaje; nunca confirma disponibilidad
function waLink(booking) {
  const lines = [
    'Hola, sobre tu solicitud MAHAS:',
    `Experiencia: ${booking.experience}`,
    `Modalidad: ${booking.modality}`,
    `Fecha: ${booking.date} ${booking.time}`,
    `Nombre: ${booking.name}`
  ];
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
}

function renderTable(bookings) {
  if (!bookings.length) {
    output.innerHTML = '<p class="empty">No hay solicitudes todavia.</p>';
    return;
  }

  const rows = bookings
    .map((b) => {
      const badges =
        '<span class="badge badge--pending">Pendiente</span>' +
        (b.needsHumanReview ? '<span class="badge badge--human">Requiere atencion humana</span>' : '');
      return (
        '<tr>' +
        `<td>${escapeHtml(b.createdAt || '')}</td>` +
        `<td>${escapeHtml(b.experience)}</td>` +
        `<td>${escapeHtml(b.modality)}</td>` +
        `<td>${escapeHtml(b.date)} ${escapeHtml(b.time)}</td>` +
        `<td>${escapeHtml(b.name)}</td>` +
        `<td>${escapeHtml(b.contact)}</td>` +
        `<td>${escapeHtml(b.notes || '')}</td>` +
        `<td>${badges}</td>` +
        `<td><a class="wa-link" target="_blank" rel="noopener noreferrer" href="${waLink(b)}">WhatsApp</a></td>` +
        '</tr>'
      );
    })
    .join('');

  output.innerHTML =
    '<div class="table-wrap"><table><thead><tr>' +
    '<th>Recibida</th><th>Experiencia</th><th>Modalidad</th><th>Fecha</th>' +
    '<th>Nombre</th><th>Contacto</th><th>Notas</th><th>Estado</th><th></th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

async function loadBookings() {
  const token = tokenInput.value.trim() || savedToken();
  if (!token) {
    output.innerHTML = '<p class="error">Escribe el token de acceso.</p>';
    return;
  }

  output.innerHTML = '<p class="empty">Cargando...</p>';
  try {
    const response = await fetch('/api/admin/bookings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.status === 401) {
      output.innerHTML = '<p class="error">Token invalido.</p>';
      return;
    }
    if (!response.ok) throw new Error('request-failed');

    const data = await response.json();
    saveToken(token);
    refreshBtn.hidden = false;
    forgetBtn.hidden = false;
    renderTable(data.bookings || []);
  } catch (error) {
    output.innerHTML = '<p class="error">No se pudo cargar la lista. Intenta de nuevo.</p>';
  }
}

loadBtn.addEventListener('click', loadBookings);
refreshBtn.addEventListener('click', loadBookings);
forgetBtn.addEventListener('click', forgetToken);

const existing = savedToken();
if (existing) {
  tokenInput.value = existing;
  loadBookings();
}
