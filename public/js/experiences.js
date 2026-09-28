// ============================================================================
// MAHAS MASSAGE · datos de experiencias · V0.2
// Ya no es una lista escrita a mano. El catalogo se pide a /api/catalog, que lo
// lee del mismo KV que usa el Schema.org y las paginas individuales
// (src/seo/catalog.js). Una sola fuente, editable desde el Admin.
//
// main.js y booking.js siguen importando EXPERIENCES con la misma forma de antes
// (name, shortDescription, duration, price, modality, slug, status), por eso
// aqui solo se traduce la respuesta de la API a esa forma. El slug es el mismo id
// del catalogo (por ejemplo 4-hands), el mismo que usan las rutas del sitio.
//
// La API solo devuelve experiencias approved. Si la peticion falla o tarda mas
// de 4 segundos, EXPERIENCES queda vacia: la seccion de tarjetas se oculta sola
// y el selector de reserva queda sin opciones, nunca con datos inventados.
// ============================================================================

const TIMEOUT_MS = 4000;

// Sin sufijo de moneda, decision del cliente: se muestra $1,000, no $1,000 MXN
function formatMoney(amount, locale) {
  return '$' + new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount);
}

function toExperience(item) {
  const durations = Array.isArray(item.durations) ? item.durations : [];
  const minutes = durations.map((d) => d.minutes);
  const prices = durations.map((d) => d.price);
  const hasData = minutes.length > 0 && prices.length > 0;

  const min = hasData ? Math.min(...minutes) : 0;
  const max = hasData ? Math.max(...minutes) : 0;
  const rangeLabel = !hasData ? '' : min === max ? `${min} min` : `${min}–${max} min`;
  const lowest = hasData ? Math.min(...prices) : 0;
  const isCouple = item.pricePer === 'couple';

  return {
    id: item.id,
    slug: item.id,
    name: item.name,
    shortDescription: item.description,
    image: null,
    duration: { es: rangeLabel, en: rangeLabel },
    price: hasData
      ? {
          es: `Desde ${formatMoney(lowest, 'es-MX')}`,
          en: `From ${formatMoney(lowest, 'en-US')}`
        }
      : { es: '', en: '' },
    modality: isCouple
      ? { es: 'Por pareja', en: 'Per couple' }
      : { es: 'Por persona', en: 'Per person' },
    availability: null,
    status: item.status,
    listed: true
  };
}

async function loadExperiences() {
  // Solo las paginas que muestran tarjetas o el formulario de reserva necesitan el catalogo
  const needsCatalog =
    document.querySelector('[data-experience-grid]') || document.querySelector('[data-booking-form]');
  if (!needsCatalog) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch('/api/catalog', { signal: controller.signal });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.items || []).map(toExperience);
  } catch (error) {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export const EXPERIENCES = await loadExperiences();
