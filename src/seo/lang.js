// Deteccion de idioma para la raiz del sitio.
// Prioridad: cookie de eleccion previa, luego Accept-Language, luego espanol.
// Los rastreadores sin Accept-Language caen en espanol, igual que x-default.

import { DEFAULT_LOCALE } from "./routes.js";

export function readCookie(header, name) {
  if (!header) return null;
  for (const chunk of header.split(";")) {
    const parts = chunk.trim().split("=");
    if (parts[0] === name) return parts.slice(1).join("=");
  }
  return null;
}

export function pickLanguage(acceptLanguage, cookieLang) {
  if (cookieLang === "es" || cookieLang === "en") return cookieLang;
  if (!acceptLanguage) return DEFAULT_LOCALE;

  let best = null;
  for (const part of acceptLanguage.split(",")) {
    const pieces = part.trim().split(";");
    const primary = pieces[0].trim().toLowerCase().split("-")[0];
    if (primary !== "es" && primary !== "en") continue;

    let q = 1;
    for (const param of pieces.slice(1)) {
      const match = param.trim().match(/^q=([0-9.]+)$/i);
      if (match) q = parseFloat(match[1]);
    }
    if (q <= 0) continue;

    // En empate gana el primero que aparece en el encabezado
    if (!best || q > best.q) best = { lang: primary, q };
  }
  return best ? best.lang : DEFAULT_LOCALE;
}
