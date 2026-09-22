// ============================================================================
// MAHAS MASSAGE · datos de experiencias · V0.1
// Fuente unica de las tarjetas de la Home. En el chat 2 esta lista pasa a
// servirse desde Cloudflare KV con la misma forma de datos.
//
// status:
//   approved  se publica
//   proposal  no se publica como definitivo
//   pending   no se publica como definitivo
//   risk      bloqueado
// listed: false oculta la experiencia de listados publicos
//
// Catalogo y precios aprobados por el cliente el 2026-09-21.
// Los mismos valores viven en src/seo/catalog.js para el Schema.org.
// TODO chat 4: unificar ambas listas en una sola fuente servida desde KV.
// ============================================================================

export const EXPERIENCES = [
  {
    id: 'relax',
    slug: 'relax',
    name: { es: 'Relax', en: 'Relax' },
    shortDescription: {
      es: 'Un masaje pausado para detener el ritmo y volver a ti.',
      en: 'An unhurried massage to slow down and come back to yourself.'
    },
    image: null,
    duration: { es: '60–120 min', en: '60–120 min' },
    price: { es: 'Desde $1,000 MXN', en: 'From $1,000 MXN' },
    modality: { es: 'Por persona', en: 'Per person' },
    availability: null,
    status: 'approved',
    listed: true
  },
  {
    id: 'deep',
    slug: 'deep',
    name: { es: 'MAHAS DEEP · Descontracturante', en: 'MAHAS DEEP · Deep Bodywork' },
    shortDescription: {
      es: 'Trabajo corporal profundo, con presión firme y atención al detalle.',
      en: 'Deep bodywork with firm pressure and attention to detail.'
    },
    image: null,
    duration: { es: '60–120 min', en: '60–120 min' },
    price: { es: 'Desde $1,000 MXN', en: 'From $1,000 MXN' },
    modality: { es: 'Por persona', en: 'Per person' },
    availability: null,
    status: 'approved',
    listed: true
  },
  {
    id: 'four-hands',
    slug: '4-hands',
    name: { es: '4 Hands', en: '4 Hands' },
    shortDescription: {
      es: 'Una experiencia coordinada en la que dos terapeutas trabajan de manera sincronizada para crear una percepción corporal diferente.',
      en: 'A coordinated experience in which two therapists work in sync to create a different bodily perception.'
    },
    image: null,
    duration: { es: '60–120 min', en: '60–120 min' },
    price: { es: 'Desde $1,600 MXN', en: 'From $1,600 MXN' },
    modality: { es: 'Por persona', en: 'Per person' },
    availability: null,
    status: 'approved',
    listed: true
  },
  {
    // Couples es distinto de 4 Hands: cada terapeuta atiende a una persona
    id: 'couples',
    slug: 'couples',
    name: { es: 'Couples', en: 'Couples' },
    shortDescription: {
      es: 'Una experiencia para dos: cada terapeuta atiende a una persona de la pareja al mismo tiempo.',
      en: 'An experience for two: each therapist attends to one person of the couple at the same time.'
    },
    image: null,
    duration: { es: '60–120 min', en: '60–120 min' },
    price: { es: 'Desde $1,800 MXN', en: 'From $1,800 MXN' },
    modality: { es: 'Por pareja', en: 'Per couple' },
    availability: null,
    status: 'approved',
    listed: true
  }
];
