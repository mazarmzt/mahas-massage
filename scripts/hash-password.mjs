// MAHAS MASSAGE, chat 5. Se corre en tu maquina, no en el Worker, y no
// necesita ninguna dependencia (solo el modulo crypto de Node).
//
// Genera la sal y el hash PBKDF2-SHA256 de una contrasena, con el mismo
// algoritmo, las mismas iteraciones y la misma codificacion base64 que
// src/admin/auth.js usa para verificar. Pegas el resultado en el arreglo del
// secreto ADMIN_USERS, uno por persona.
//
// Uso, contrasena como argumento (mas simple, queda un momento en el
// historial de la terminal):
//   node scripts/hash-password.mjs unaContrasenaLarga
//
// Uso alterno, sin dejar la contrasena en el historial:
//   printf %s unaContrasenaLarga | node scripts/hash-password.mjs

import { randomBytes, pbkdf2Sync } from "node:crypto";

const ITERATIONS = 210000;
const KEY_LENGTH_BYTES = 32;

async function readPasswordFromStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
}

async function main() {
  const fromArg = process.argv[2];
  const password = fromArg && fromArg.length > 0 ? fromArg : await readPasswordFromStdin();

  if (!password) {
    console.error("Falta la contrasena. Ve el uso al inicio de este archivo.");
    process.exit(1);
  }

  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH_BYTES, "sha256");

  const entry = {
    username: "TODO-usuario",
    name: "TODO-nombre-para-mostrar",
    salt: salt.toString("base64"),
    hash: hash.toString("base64"),
    iterations: ITERATIONS
  };

  console.log("Reemplaza username y name, y agrega esta entrada al arreglo de ADMIN_USERS:\n");
  console.log(JSON.stringify(entry, null, 2));
}

main();
