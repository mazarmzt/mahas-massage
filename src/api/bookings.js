// Endpoints de reservas, chat 6.
// Toda solicitud queda en estado pending; el frontend nunca confirma disponibilidad real.
// GET /api/admin/bookings requiere Authorization: Bearer <ADMIN_TOKEN> (wrangler secret).
// TODO chat 5: cuando exista sesion real de Admin, esta lista debe autenticarse con ella
// en vez de un token compartido.

import { saveBooking, listBookings } from "../booking/store.js";
import { validateBooking, needsHumanReview } from "../booking/validate.js";

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function sanitize(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function handleCreateBooking(request, env) {
  if (!env.BOOKINGS_KV) return json({ error: "storage_not_configured" }, 500);

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return json({ error: "invalid_json" }, 400);
  }

  const { ok, errors } = validateBooking(body);
  if (!ok) return json({ error: "validation_failed", details: errors }, 422);

  // Private, grupos y demas casos complejos no tienen automatizacion en esta version;
  // needsHumanReview solo marca la solicitud, no cambia el flujo
  const record = {
    status: "pending",
    createdAt: new Date().toISOString(),
    experience: sanitize(body.experience, 60),
    modality: sanitize(body.modality, 30),
    date: sanitize(body.date, 20),
    time: sanitize(body.time, 20),
    name: sanitize(body.name, 120),
    contact: sanitize(body.contact, 60),
    notes: sanitize(body.notes, 800),
    lang: sanitize(body.lang, 5) || "es",
    needsHumanReview: needsHumanReview(body)
  };

  const stored = await saveBooking(env, record);
  return json({ id: stored.id, status: stored.status });
}

function isAuthorized(request, env) {
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return Boolean(env.ADMIN_TOKEN) && token === env.ADMIN_TOKEN;
}

export async function handleListBookings(request, env) {
  if (!isAuthorized(request, env)) return json({ error: "unauthorized" }, 401);
  if (!env.BOOKINGS_KV) return json({ error: "storage_not_configured" }, 500);

  const bookings = await listBookings(env, 200);
  return json({ bookings });
}
