// Guardia de acceso del Admin, chats 4, 5 y 6.
// Un solo lugar decide quien puede leer o escribir datos del Admin, para que el
// catalogo (chat 4) y las solicitudes de reserva (chat 6) usen exactamente la
// misma regla y no haya dos formas distintas de autenticarse.
//
// Se acepta cualquiera de dos caminos:
//   la sesion de una persona (cookie firmada, login de usuario y contrasena)
//   el secreto ADMIN_KEY como acceso de servicio, para scripts o automatizaciones
//   futuras. Se manda como Authorization: Bearer con el valor de ADMIN_KEY.
// Si ninguno de los dos secretos esta definido, nadie entra: un despliegue
// incompleto nunca deja el Admin abierto.

import { verifySessionToken, readSessionToken } from "./auth.js";

export function isServiceKeyAuthorized(request, env) {
  const expected = env && env.ADMIN_KEY;
  if (!expected) return false;
  const header = request.headers.get("Authorization") || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  return provided.length > 0 && provided === expected;
}

export async function isAdminAuthorized(request, env) {
  if (isServiceKeyAuthorized(request, env)) return true;
  const token = readSessionToken(request);
  const session = await verifySessionToken(env, token);
  return !!session;
}
