// Generador de Schema.org en JSON-LD.
// Reglas: sin resenas, sin calificaciones, sin horarios, sin calle, sin disponibilidad.
// El catalogo con precios solo se emite en la Home y se puede apagar con SCHEMA_INCLUDE_PRICES=false.

import { BUSINESS, OG_IMAGE_PATH } from "./config.js";
import { LOCALES } from "./routes.js";
import { CURRENCY } from "./catalog.js";

function serviceNode(item, lang, businessId) {
  return {
    "@type": "Service",
    name: item.name[lang],
    description: item.description[lang],
    provider: { "@id": businessId }
  };
}

function offerCatalog(catalog, lang, cfg, dict, businessId) {
  const experiences = catalog.map((item) => {
    const offers = cfg.schemaPrices
      ? item.durations.map((d) => ({
          "@type": "Offer",
          name: item.name[lang] + " \u00b7 " + d.minutes + " min",
          price: String(d.price),
          priceCurrency: CURRENCY,
          description: item.pricePer === "couple" ? dict.schema.perCouple : undefined,
          eligibleDuration: { "@type": "QuantitativeValue", value: d.minutes, unitCode: "MIN" },
          itemOffered: serviceNode(item, lang, businessId)
        }))
      : [{ "@type": "Offer", itemOffered: serviceNode(item, lang, businessId) }];

    return {
      "@type": "OfferCatalog",
      name: item.name[lang],
      itemListElement: offers
    };
  });

  return {
    "@type": "OfferCatalog",
    name: dict.schema.catalogName,
    itemListElement: experiences
  };
}

export function buildSchema({ route, lang, cfg, dict, catalog, pageMeta }) {
  const base = cfg.siteUrl;
  const businessId = base + "/#business";
  const websiteId = base + "/#website";
  const pageUrl = base + route.paths[lang];
  const locale = LOCALES.find((l) => l.code === lang);

  const business = {
    "@type": "HealthAndBeautyBusiness",
    "@id": businessId,
    name: BUSINESS.name,
    url: base + "/",
    description: dict.business.description,
    image: base + OG_IMAGE_PATH,
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    sameAs: BUSINESS.sameAs,
    address: {
      "@type": "PostalAddress",
      addressLocality: BUSINESS.locality,
      addressRegion: BUSINESS.region,
      addressCountry: BUSINESS.country
    },
    areaServed: {
      "@type": "City",
      name: BUSINESS.locality,
      containedInPlace: { "@type": "AdministrativeArea", name: BUSINESS.region }
    }
  };

  if (route.key === "home" && catalog && catalog.length > 0) {
    business.hasOfferCatalog = offerCatalog(catalog, lang, cfg, dict, businessId);
  }

  const website = {
    "@type": "WebSite",
    "@id": websiteId,
    url: base + "/",
    name: BUSINESS.name,
    inLanguage: LOCALES.map((l) => l.hreflang),
    publisher: { "@id": businessId }
  };

  const webpage = {
    "@type": "WebPage",
    "@id": pageUrl + "#webpage",
    url: pageUrl,
    name: pageMeta.title,
    description: pageMeta.description,
    inLanguage: locale.hreflang,
    isPartOf: { "@id": websiteId },
    about: { "@id": businessId }
  };

  return { "@context": "https://schema.org", "@graph": [business, website, webpage] };
}

// Serializa el JSON-LD escapando el signo menor para que nunca cierre la etiqueta script
export function serializeSchema(schema) {
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}
