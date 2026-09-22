// ============================================================================
// MAHAS MASSAGE · configuracion del sitio · V0.1
// Aqui viven los datos que cambian sin tocar componentes.
// Regla: todo valor que empiece con TODO se trata como pendiente y no se publica.
// No guardar secretos aqui. Este archivo es publico.
// ============================================================================

export const SITE = {
  brand: {
    name: 'MAHAS MASSAGE',
    tagline: 'MASSAGE • WELLNESS • EXPERIENCES'
  },

  // Dominio definitivo sin protocolo. Se usa en canonical, hreflang y Open Graph
  domain: 'mahasmassage.com',

  // Datos de contacto. WhatsApp, Instagram y Facebook deben ser URL completas https
  // WhatsApp usa el enlace de mensaje directo wa.me con el numero en formato internacional sin signos
  contact: {
    whatsapp: 'https://wa.me/526694103650',
    instagram: 'https://www.instagram.com/mahasmassage/',
    facebook: 'https://www.facebook.com/share/1Dd82UH2ZH/',
    email: 'info@mahasmassage.com',
    phone: '+52 669 410 3650',
    address: 'TODO'
  },

  location: {
    city: 'Mazatlán',
    region: 'Sinaloa',
    country: 'México'
  },

  // Rutas por idioma. Los slugs son propuesta tecnica y se confirman en el chat 2
  routes: {
    es: {
      home: '/es/',
      experiences: '/es/experiencias/',
      about: '/es/quienes-somos/',
      experience: '/es/la-experiencia/',
      service: '/es/domicilio-hoteles/',
      book: '/es/reservar/',
      contact: '/es/contacto/'
    },
    en: {
      home: '/en/',
      experiences: '/en/experiences/',
      about: '/en/about/',
      experience: '/en/the-experience/',
      service: '/en/at-home-hotels/',
      book: '/en/book/',
      contact: '/en/contact/'
    }
  },

  // TODO textos legales. Los aporta el abogado. Mientras sean null no se enlazan
  legal: {
    privacy: { es: null, en: null },
    terms: { es: null, en: null }
  },

  // Punto de entrada de reservas. Hoy apunta a la ruta interna.
  // Mas adelante puede apuntar a un modal, a una API o a un proveedor
  // sin cambiar la interfaz. La disponibilidad real nunca se decide en el frontend
  booking: {
    mode: 'route'
  },

  // Vista previa de contenido pendiente. En V0.x permite ver las tarjetas
  // marcadas como pendientes. Poner en false antes de publicar
  preview: {
    showPending: true
  }
};
