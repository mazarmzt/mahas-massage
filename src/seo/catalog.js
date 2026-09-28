// Catalogo unico de MAHAS MASSAGE, chat 4.
// Fuente operativa: Cloudflare KV, binding CATALOG_KV, una sola clave JSON (CATALOG_KV_KEY)
// con las 4 experiencias completas. Antes existian dos copias de estos datos
// (este archivo, para el Schema.org, y public/js/experiences.js, para las tarjetas
// de la Home). Ahora getCatalog es la unica fuente y alimenta Schema.org, las
// tarjetas de la Home, la pagina Experiencias MAHAS y las paginas individuales.
//
// Regla de negocio (auditoria, seccion 20.2): solo status approved se publica.
// proposal, pending y risk nunca deben mostrarse en el sitio publico, aunque
// tengan nombre, descripcion y precio completos. getCatalog aplica ese filtro.
// getCatalogRaw devuelve el catalogo completo sin filtrar, para el Admin del
// chat 5, que necesita ver tambien las experiencias todavia no aprobadas.
//
// El nombre de la experiencia profunda es provisional y se edita desde el Admin.
// Las descripciones de Relax y Deep son texto provisional pendiente de aprobacion.
// No incluir nunca el menu oculto ni Private en este catalogo.

export const CURRENCY = "MXN";
export const CATALOG_KV_KEY = "catalog";

const VALID_STATUSES = ["approved", "proposal", "pending", "risk"];
const VALID_PRICE_PER = ["person", "couple"];
const PUBLIC_STATUS = "approved";

// Respaldo si KV esta vacio, sin datos validos o no responde. Mismos datos
// aprobados el 2026-09-21, para que el sitio nunca muestre un catalogo vacio
// ni datos inventados mientras se resuelve KV.
export const CATALOG_FALLBACK = [
  {
    id: "relax",
    status: "approved",
    name: { es: "Relax", en: "Relax" },
    description: {
      es: "Un masaje pausado para detener el ritmo y volver a ti.",
      en: "An unhurried massage to slow down and come back to yourself."
    },
    pricePer: "person",
    durations: [
      { minutes: 60, price: 1000 },
      { minutes: 90, price: 1400 },
      { minutes: 120, price: 1800 }
    ]
  },
  {
    id: "deep",
    status: "approved",
    name: {
      es: "MAHAS DEEP \u00b7 Descontracturante",
      en: "MAHAS DEEP \u00b7 Deep Bodywork"
    },
    description: {
      es: "Trabajo corporal profundo, con presi\u00f3n firme y atenci\u00f3n al detalle.",
      en: "Deep bodywork with firm pressure and attention to detail."
    },
    pricePer: "person",
    durations: [
      { minutes: 60, price: 1000 },
      { minutes: 90, price: 1400 },
      { minutes: 120, price: 1800 }
    ]
  },
  {
    id: "4-hands",
    status: "approved",
    name: { es: "4 Hands", en: "4 Hands" },
    description: {
      es: "Una experiencia coordinada en la que dos terapeutas trabajan de manera sincronizada para crear una percepci\u00f3n corporal diferente.",
      en: "A coordinated experience in which two therapists work in sync to create a different bodily perception."
    },
    pricePer: "person",
    durations: [
      { minutes: 60, price: 1600 },
      { minutes: 90, price: 2200 },
      { minutes: 120, price: 2800 }
    ]
  },
  {
    id: "couples",
    status: "approved",
    name: { es: "Couples", en: "Couples" },
    description: {
      es: "Una experiencia para dos: cada terapeuta atiende a una persona de la pareja al mismo tiempo.",
      en: "An experience for two: each therapist attends to one person of the couple at the same time."
    },
    pricePer: "couple",
    durations: [
      { minutes: 60, price: 1800 },
      { minutes: 90, price: 2500 },
      { minutes: 120, price: 3200 }
    ]
  }
];

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isBilingualText(value) {
  return !!value && typeof value.es === "string" && value.es.length > 0 && typeof value.en === "string" && value.en.length > 0;
}

// Valida un catalogo completo antes de guardarlo en KV. No corrige datos por su cuenta:
// si algo no cumple la forma esperada, rechaza el guardado completo y explica por que.
export function validateCatalogPayload(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, error: "El catalogo debe ser un arreglo con al menos una experiencia" };
  }

  const ids = new Set();
  for (const item of value) {
    if (!item || typeof item.id !== "string" || item.id.length === 0) {
      return { ok: false, error: "Cada experiencia necesita un id" };
    }
    if (ids.has(item.id)) {
      return { ok: false, error: "El id \"" + item.id + "\" esta repetido" };
    }
    ids.add(item.id);

    if (!VALID_STATUSES.includes(item.status)) {
      return { ok: false, error: "Estado invalido en \"" + item.id + "\"" };
    }
    if (!isBilingualText(item.name)) {
      return { ok: false, error: "Falta name.es o name.en en \"" + item.id + "\"" };
    }
    if (!isBilingualText(item.description)) {
      return { ok: false, error: "Falta description.es o description.en en \"" + item.id + "\"" };
    }
    if (!VALID_PRICE_PER.includes(item.pricePer)) {
      return { ok: false, error: "pricePer invalido en \"" + item.id + "\"" };
    }
    if (!Array.isArray(item.durations) || item.durations.length === 0) {
      return { ok: false, error: "Faltan duraciones en \"" + item.id + "\"" };
    }
    for (const d of item.durations) {
      if (!d || !isFiniteNumber(d.minutes) || d.minutes <= 0 || !isFiniteNumber(d.price) || d.price < 0) {
        return { ok: false, error: "Duracion o precio invalido en \"" + item.id + "\"" };
      }
    }
  }
  return { ok: true };
}

// Catalogo completo sin filtrar, tal como esta en KV (o el respaldo). Lo usa el
// Admin del chat 5, que necesita ver tambien proposal, pending y risk.
export async function getCatalogRaw(env) {
  const kv = env && env.CATALOG_KV;
  if (!kv) return CATALOG_FALLBACK;

  try {
    const stored = await kv.get(CATALOG_KV_KEY, "json");
    if (stored && validateCatalogPayload(stored).ok) return stored;
  } catch (err) {
    // KV no disponible o valor corrupto: se sirve el respaldo para no romper el sitio
  }
  return CATALOG_FALLBACK;
}

// Catalogo publico: unica fuente para Schema.org, tarjetas de la Home, la pagina
// Experiencias MAHAS y las paginas individuales. Solo status approved.
export async function getCatalog(env) {
  const raw = await getCatalogRaw(env);
  return raw.filter((item) => item.status === PUBLIC_STATUS);
}
