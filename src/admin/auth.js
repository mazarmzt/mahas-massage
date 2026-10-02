// Autenticacion del Admin, chat 5.
// Reemplaza el ADMIN_KEY compartido del chat 4 como unica puerta: ahora cada
// persona (Silvia, Sergio, quien se agregue despues) entra con su propio
// usuario y contrasena. El ADMIN_KEY se conserva aparte, en worker.js, como
// acceso de servicio para scripts o automatizaciones futuras.
//
// Dos secretos nuevos, ninguno va en el codigo fuente:
//   ADMIN_USERS            JSON con un arreglo de usuarios, cada uno con
//                           username, name, salt y hash (contrasena con
//                           PBKDF2-SHA256), generado con scripts/hash-password.mjs
//   ADMIN_SESSION_SECRET    cadena aleatoria larga para firmar la sesion
//
// La sesion es una cookie firmada (HMAC-SHA256), no un registro en KV. Con
// KV, justo despues de iniciar sesion, una peticion atendida por otro nodo de
// Cloudflare podria no ver todavia la sesion (KV es eventualmente consistente,
// hasta ~60s de retraso) y el login se sentiria roto. Firmando la sesion no
// hay nada que buscar: se verifica la firma y listo. El costo es que cerrar
// sesion solo borra la cookie en el navegador; el token en si sigue siendo
// valido hasta que expire (8 horas). Para un panel interno de dos personas es
// un intercambio razonable.
//
// El contador de intentos fallidos si vive en CATALOG_KV (el mismo namespace
// del catalogo, sin crear uno nuevo), porque ahi un poco de retraso entre
// nodos no rompe nada, solo hace el limite un poco menos exacto.
//
// TEMPORAL 2026-10-01: usuario temporal/Temporal2026 agregado directo en el
// codigo (no depende del secreto ADMIN_USERS) para diagnosticar y destrabar el
// acceso mientras se confirma por que el secreto guardado en Cloudflare no
// deja entrar. QUITAR este bloque (TEMP_USER y su uso en parseAdminUsers) en
// cuanto el login con el secreto real funcione.

import { readCookie } from "../seo/lang.js";

export const SESSION_COOKIE = "mahas_admin_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

const PBKDF2_ITERATIONS_DEFAULT = 210000;
const LOGIN_FAIL_LIMIT = 5;
const LOGIN_FAIL_WINDOW_SECONDS = 15 * 60;

// TEMPORAL: usuario "temporal", contrasena "Temporal2026". Quitar junto con el
// comentario de arriba una vez resuelto el problema del secreto ADMIN_USERS.
const TEMP_USER = {
  username: "temporal",
  name: "Temporal",
  salt: "FEaoHeNTYWV82iNlaxi94Q==",
  hash: "DmWSyvqbGbWdeGYGYwhIx+hrO2Jxa4HPBs74sHjeWzc=",
  iterations: 210000
};

// Sal y hash sin significado, de 32 bytes, usados solo para que verificar un
// usuario que no existe tome el mismo tiempo que verificar uno que si existe.
// Sin esto, alguien podria adivinar usuarios validos por la diferencia de
// tiempo de respuesta entre uno que corre PBKDF2 y uno que responde al toque.
const DUMMY_SALT_B64 = "MTIzNDU2Nzg5MDEyMzQ1Ng==";
const DUMMY_HASH_B64 = "MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=";

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function bytesFromBase64(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toBase64Url(b64) {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64url) {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return b64;
}

function bytesToBase64Url(bytes) {
  return toBase64Url(bytesToBase64(bytes));
}

function bytesFromBase64Url(str) {
  return bytesFromBase64(fromBase64Url(str));
}

// Compara dos arreglos de bytes en tiempo constante, para que una firma o un
// hash casi correctos no tarden perceptiblemente mas que uno muy distinto.
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hmacSha256(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return new Uint8Array(signature);
}

// Deriva una clave PBKDF2-SHA256 de 256 bits. El mismo algoritmo, con la
// misma sal y las mismas iteraciones, se usa en scripts/hash-password.mjs
// (con el modulo crypto de Node) para generar el hash guardado en ADMIN_USERS.
async function derivePbkdf2(password, saltBytes, iterations) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}

export async function verifyPassword(password, saltB64, hashB64, iterations) {
  try {
    const saltBytes = bytesFromBase64(saltB64);
    const expected = bytesFromBase64(hashB64);
    const derived = await derivePbkdf2(password, saltBytes, iterations || PBKDF2_ITERATIONS_DEFAULT);
    return timingSafeEqual(derived, expected);
  } catch (err) {
    return false;
  }
}

// Verifica una contrasena contra un usuario que puede no existir, tomando
// siempre el mismo tiempo. Cuando user es null se usa la sal y el hash de
// relleno, y el resultado real siempre se descarta a favor de false.
export async function verifyPasswordConstantTime(password, user) {
  const target = user
    ? { salt: user.salt, hash: user.hash, iterations: user.iterations }
    : { salt: DUMMY_SALT_B64, hash: DUMMY_HASH_B64, iterations: PBKDF2_ITERATIONS_DEFAULT };
  const result = await verifyPassword(password, target.salt, target.hash, target.iterations);
  return !!user && result;
}

// Lee y valida ADMIN_USERS. Un secreto ausente o mal formado deja el arreglo
// vacio, para que ningun login pueda entrar por un despliegue incompleto,
// igual que ADMIN_KEY en el chat 4.
// TEMPORAL: siempre se agrega TEMP_USER al final, sin importar si el secreto
// cargo bien o no. Quitar ese agregado cuando se resuelva el problema real.
export function parseAdminUsers(env) {
  const raw = env && env.ADMIN_USERS;
  let parsed = [];
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      parsed = [];
    }
  }
  if (!Array.isArray(parsed)) parsed = [];
  const fromSecret = parsed.filter(
    (u) =>
      u &&
      typeof u.username === "string" &&
      u.username.length > 0 &&
      typeof u.name === "string" &&
      u.name.length > 0 &&
      typeof u.salt === "string" &&
      typeof u.hash === "string"
  );
  return [...fromSecret, TEMP_USER];
}

export function findUser(users, username) {
  if (!username) return null;
  const needle = username.trim().toLowerCase();
  return users.find((u) => u.username.toLowerCase() === needle) || null;
}

// Sesion firmada. El payload va en claro (usuario y nombre no son secretos),
// pero la firma impide que alguien fabrique o altere una cookie por su cuenta.
export async function createSessionToken(env, user) {
  const secret = env && env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  const now = Math.floor(Date.now() / 1000);
  const payload = { u: user.username, n: user.name, iat: now, exp: now + SESSION_TTL_SECONDS };
  const payloadB64 = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmacSha256(secret, payloadB64);
  const token = payloadB64 + "." + bytesToBase64Url(signature);
  return { token, exp: payload.exp };
}

export async function verifySessionToken(env, token) {
  const secret = env && env.ADMIN_SESSION_SECRET;
  if (!secret || !token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;

  let expectedSig;
  let providedSig;
  try {
    expectedSig = await hmacSha256(secret, payloadB64);
    providedSig = bytesFromBase64Url(sigB64);
  } catch (err) {
    return null;
  }
  if (!timingSafeEqual(expectedSig, providedSig)) return null;

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(bytesFromBase64Url(payloadB64)));
  } catch (err) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload || typeof payload.exp !== "number" || payload.exp < now) return null;
  if (typeof payload.u !== "string" || typeof payload.n !== "string") return null;

  return { username: payload.u, name: payload.n };
}

export function readSessionToken(request) {
  return readCookie(request.headers.get("Cookie"), SESSION_COOKIE);
}

// Path=/api/admin limita la cookie a las rutas del Admin: el navegador no la
// manda en ninguna peticion publica del sitio. Secure exige HTTPS, con la
// excepcion estandar de los navegadores para localhost en desarrollo.
export function buildSessionCookie(token, maxAgeSeconds) {
  return (
    SESSION_COOKIE + "=" + token +
    "; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=" + maxAgeSeconds
  );
}

export function buildClearSessionCookie() {
  return SESSION_COOKIE + "=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}

// Limite de intentos de login por IP + usuario, en CATALOG_KV. Sin KV
// disponible el limite simplemente no aplica; la contrasena sigue siendo la
// defensa real, esto es una capa adicional, no la unica.
function rateLimitKey(ip, username) {
  return "login_fail:" + ip + ":" + username.trim().toLowerCase();
}

export async function isLoginRateLimited(env, ip, username) {
  const kv = env && env.CATALOG_KV;
  if (!kv) return false;
  try {
    const raw = await kv.get(rateLimitKey(ip, username));
    const count = raw ? parseInt(raw, 10) || 0 : 0;
    return count >= LOGIN_FAIL_LIMIT;
  } catch (err) {
    return false;
  }
}

export async function recordLoginFailure(env, ip, username) {
  const kv = env && env.CATALOG_KV;
  if (!kv) return;
  try {
    const key = rateLimitKey(ip, username);
    const raw = await kv.get(key);
    const count = (raw ? parseInt(raw, 10) || 0 : 0) + 1;
    await kv.put(key, String(count), { expirationTtl: LOGIN_FAIL_WINDOW_SECONDS });
  } catch (err) {
    // KV no disponible: el intento fallido simplemente no queda contado
  }
}

export async function clearLoginFailures(env, ip, username) {
  const kv = env && env.CATALOG_KV;
  if (!kv) return;
  try {
    await kv.delete(rateLimitKey(ip, username));
  } catch (err) {
    // KV no disponible: no hay nada que limpiar
  }
}
