// Catalogo que consume el Schema.org.
// Precios y catalogo aprobados por el cliente el 2026-09-21. Estado approved.
// El nombre de la experiencia profunda es provisional y se edita desde el Admin.
// Las descripciones de Relax y Deep son texto provisional pendiente de aprobacion.
// No incluir nunca el menu oculto ni Private en este archivo.
//
// TODO chat 4: leer el catalogo desde KV en getCatalog para que el Admin sea la fuente unica.
// Hasta entonces se usa este respaldo, y solo se emiten estados approved o proposal.

export const CURRENCY = "MXN";

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

const PUBLISHABLE = ["approved", "proposal"];

export async function getCatalog(env) {
  return CATALOG_FALLBACK.filter((item) => PUBLISHABLE.includes(item.status));
}
