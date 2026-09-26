// Validacion minima del lado servidor, chat 6.
// Nunca decide disponibilidad; solo evita datos vacios, campos fuera de tamano
// razonable y payloads con forma incorrecta.

const MAX_LEN = {
  experience: 60,
  modality: 30,
  date: 20,
  time: 20,
  name: 120,
  contact: 60,
  notes: 800,
  lang: 5
};

const REQUIRED = ["experience", "modality", "date", "time", "name", "contact"];
const MODALITIES = ["cabina", "domicilio", "hotel"];

export function validateBooking(body) {
  const errors = [];
  if (!body || typeof body !== "object") return { ok: false, errors: ["invalid_payload"] };

  for (const field of REQUIRED) {
    const value = body[field];
    if (typeof value !== "string" || value.trim() === "") errors.push("missing_" + field);
  }

  if (body.modality && !MODALITIES.includes(body.modality)) errors.push("invalid_modality");

  for (const [field, max] of Object.entries(MAX_LEN)) {
    const value = body[field];
    if (typeof value === "string" && value.length > max) errors.push("too_long_" + field);
  }

  return { ok: errors.length === 0, errors };
}

// Hoteles y domicilios requieren revisar condiciones especiales; cualquier nota tambien
// se revisa a mano, siguiendo la regla del proyecto de no automatizar casos complejos
export function needsHumanReview(body) {
  return body.modality === "hotel" || body.modality === "domicilio" || Boolean(body.notes && body.notes.trim());
}
