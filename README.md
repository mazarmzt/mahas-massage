# MAHAS MASSAGE

Sitio bilingue (ES/EN) sobre Cloudflare Workers, KV y Vanilla JS, sin frameworks ni dependencias de terceros.

## Estado (V0.x)

| Chat | Contenido | Estado |
|------|-----------|--------|
| 1 | Home estatica y sistema de diseno | Hecho |
| 2 | i18n, SEO, sitemaps, Schema.org | Hecho |
| 3 | Paginas interiores | Hecho |
| 4 | Catalogo unico en KV y API | Hecho |
| 5 | Admin con login por persona | Hecho |
| 6 | Solicitudes de reserva (pending + WhatsApp) | Hecho |
| 7 | Registro 18+ y menu oculto | Pendiente |
| 8 | Despliegue, fuentes propias, seguridad | Pendiente |
| 9 | Auditoria pre-lanzamiento | Pendiente |

## Como funciona

- `src/worker.js` atiende todo: API, sitemaps, robots, paginas interiores y la Home.
- El catalogo vive en KV (`CATALOG_KV`, clave `catalog`). `getCatalog` solo devuelve `approved`.
- `/api/catalog` (publico) alimenta las tarjetas de la Home y el selector de reserva
  (`public/js/experiences.js`). El Schema.org y las paginas individuales leen el mismo KV.
- `/admin/` es el panel: login de usuario y contrasena, edicion del catalogo y lista de
  solicitudes de reserva. Nunca se indexa ni se enlaza desde el sitio.
- Reservas: `POST /api/bookings` guarda la solicitud en `BOOKINGS_KV` con estado `pending`.
  La disponibilidad real se confirma por una persona, por WhatsApp.

## Montaje (una sola vez)

1. `npx wrangler kv namespace create CATALOG_KV` y pegar el id en `wrangler.jsonc`.
2. `npx wrangler kv namespace create BOOKINGS_KV` y pegar el id en `wrangler.jsonc`.
3. En el dashboard de Cloudflare, namespace `CATALOG_KV`, crear la clave `catalog` y pegar
   el contenido de `kv/catalog.seed.json`.
4. Generar el hash de cada usuario: `node scripts/hash-password.mjs una-contrasena`.
   Con la salida de Silvia y Sergio armar el JSON del arreglo de usuarios.
5. Secretos (`npx wrangler secret put <NOMBRE>`):
   - `ADMIN_USERS` el JSON del paso 4
   - `ADMIN_SESSION_SECRET` una cadena aleatoria larga (`openssl rand -base64 48`)
   - `ADMIN_KEY` opcional, acceso de servicio
6. `npx wrangler deploy`.

## Verificar al montar

- `/api/catalog` devuelve las 4 experiencias.
- `/admin/` pide login; con usuario y contrasena correctos carga catalogo y solicitudes.
- Editar un precio en el Admin y comprobar que cambia en la Home y en la pagina de la experiencia.
- Enviar una reserva de prueba en `/es/reservar/` y verla como pendiente en `/admin/`.
- Con `INDEXABLE=false` todo sale con noindex; ponerlo en `true` solo al lanzar.

## Pendientes conocidos

- Las tarjetas de la Home las pinta el navegador; mover ese render al Worker mejora el SEO.
- `src/seo/config.js` y `public/js/config.js` duplican telefono, correo y redes.
- Google Fonts es un tercero: autoalojar las fuentes antes de lanzar (chat 8).
- Textos legales, dominio propio, HEX oficiales y fotos siguen como TODO.
- Antes de lanzar: `showPending` ya no existe; nada no aprobado sale en publico.

<!-- redeploy-ping: forzar nuevo build de Cloudflare Workers -->
