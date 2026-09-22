# MAHAS MASSAGE

Cloudflare Worker con Vanilla JS, HTML y CSS. Sin dependencias de terceros.
Chats incluidos: 1 (Home), 2 (i18n y SEO), 3 (paginas interiores).

## Estructura

- wrangler.jsonc: configuracion del Worker y variables
- src/worker.js: entrada del Worker
- src/seo/: rutas, head, Schema.org, sitemap y robots
- src/i18n/: textos ES y EN (es.json, en.json, es.pages.json, en.pages.json)
- src/pages/render.js: plantillas de las paginas interiores
- public/: Home estatica, css, js e imagen Open Graph

## Montar desde GitHub y Cloudflare

1. Sube esta carpeta a un repositorio de GitHub.
2. En Cloudflare abre Workers y Pages, elige Create, importa el repositorio y conecta GitHub.
3. Nombre del Worker: mahas-massage. Comando de build: dejar vacio. Comando de deploy: npx wrangler deploy.
4. Cada push a la rama principal publica una nueva version.

## Probar en la URL workers.dev

Sustituye TU-URL por la que te muestre Cloudflare.

- TU-URL/ redirige a /es/ o /en/ segun el navegador
- TU-URL/es/ y TU-URL/en/ Home con head inyectado
- TU-URL/es/quienes-somos/ y TU-URL/en/about/
- TU-URL/es/la-experiencia/ y TU-URL/en/the-experience/
- TU-URL/es/experiencias/ y TU-URL/en/experiences/
- TU-URL/es/domicilio-hoteles/ y TU-URL/en/at-home-hotels/
- TU-URL/es/reservar/ y TU-URL/en/book/
- TU-URL/es/contacto/ y TU-URL/en/contact/
- TU-URL/es/aviso-de-privacidad/ y TU-URL/es/terminos-y-condiciones/
- TU-URL/sitemap.xml y TU-URL/robots.txt

Todas las paginas nuevas salen con noindex y no aparecen en el sitemap.
Para ver el encabezado noindex: en Chrome de escritorio, DevTools, pestana Network, columna Headers.

## Estado y variables

- INDEXABLE en false: todo el sitio sale noindex, dominio propio incluido. Cambiar a true solo al lanzar.
- SCHEMA_INCLUDE_PRICES en true: catalogo y precios aprobados por el cliente el 2026-09-21.
  El Schema.org de la Home ya publica precios reales (MXN) para las 4 experiencias.
- Para publicar una pagina interior: cambiar su status a published en src/seo/routes.js y aprobar su copy.
- Dominio propio: agregar mahasmassage.com desde Custom Domains en el Worker. Sin rutas en wrangler.

## Catalogo aprobado (2026-09-21)

- Relax: 60/90/120 min, desde $1,000 MXN, por persona
- MAHAS DEEP · Descontracturante: 60/90/120 min, desde $1,000 MXN, por persona
- 4 Hands: 60/90/120 min, desde $1,600 MXN, por persona
- Couples: 60/90/120 min, desde $1,800 MXN, por pareja

Fuente: src/seo/catalog.js (Schema.org) y public/js/experiences.js (tarjetas de la Home).
Son dos archivos con la misma informacion. TODO chat 4: unificarlos en una sola fuente via KV.

Nuevas paginas individuales de cada experiencia, con su precio y duracion aprobados:
/es/experiencias/relax/, /es/experiencias/deep/, /es/experiencias/4-hands/, /es/experiencias/couples/
(y sus equivalentes en /en/experiences/). Siguen en pending y noindex hasta aprobar su diseño y copy.
Cada una trae un bloque "Que incluye" marcado TODO: pendiente de aprobacion operativa.

## Pendientes conocidos

- Las paginas exp-* siguen en pending: aprobar diseño y copy (parrafo "Como se vive" y bloque
  "Que incluye") antes de publicarlas.
- Textos legales, fotografias, biografias y formulario de reserva.
- Unificar catalog.js y experiences.js en una sola fuente (KV), previsto para el chat 4.
