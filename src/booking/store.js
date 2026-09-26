// Almacenamiento de solicitudes de reserva, chat 6.
// Cada solicitud es un registro independiente bajo la clave booking:<id>.
// KV.list con prefijo evita mantener un indice aparte.
// TODO chat 4: si el catalogo se unifica en KV, revisar si conviene compartir namespace.

const KEY_PREFIX = "booking:";

function newId() {
  return "bk_" + Date.now().toString(36) + "_" + crypto.randomUUID().slice(0, 8);
}

// Guarda una solicitud ya validada y devuelve el registro completo con su id
export async function saveBooking(env, record) {
  const id = newId();
  const stored = { id, ...record };
  await env.BOOKINGS_KV.put(KEY_PREFIX + id, JSON.stringify(stored));
  return stored;
}

// Lista las solicitudes mas recientes primero. limit protege al Admin de listas enormes
export async function listBookings(env, limit = 100) {
  const list = await env.BOOKINGS_KV.list({ prefix: KEY_PREFIX, limit: 1000 });
  const values = await Promise.all(
    list.keys.map((entry) => env.BOOKINGS_KV.get(entry.name, "json"))
  );
  return values
    .filter(Boolean)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, limit);
}
