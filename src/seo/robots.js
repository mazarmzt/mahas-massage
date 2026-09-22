// Generador de robots.txt.
// En preproduccion NO se usa Disallow raiz: si se bloqueara el rastreo, Google no podria
// leer el noindex y la URL podria aparecer en resultados sin descripcion.
// El bloqueo se hace con noindex por header y por meta; robots solo protege rutas privadas.

import { NOINDEX_PREFIXES } from "./config.js";

export function buildRobots(cfg) {
  const lines = ["User-agent: *"];

  if (cfg.indexable) lines.push("Allow: /");
  for (const prefix of NOINDEX_PREFIXES) lines.push("Disallow: " + prefix);

  if (cfg.indexable) {
    lines.push("");
    lines.push("Sitemap: " + cfg.siteUrl + "/sitemap.xml");
  }

  return lines.join("\n") + "\n";
}
