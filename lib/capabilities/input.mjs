// Validates tool input against the tool's own JSON Schema (the subset these tools use), so published and enforced rules can't drift.
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

export function validateInput(schema, value, at = "$") {
  const errors = [];
  const err = (message) => errors.push({ at, message });
  if (schema.type === "object") {
    if (!isObj(value)) return [{ at, message: "must be an object" }];
    for (const k of schema.required ?? []) if (!Object.hasOwn(value, k)) errors.push({ at: `${at}.${k}`, message: "is required" });
    for (const [k, v] of Object.entries(value)) {
      const sub = Object.hasOwn(schema.properties ?? {}, k) ? schema.properties[k] : undefined;
      if (!sub) {
        if (schema.additionalProperties === false) errors.push({ at: `${at}.${k}`, message: "is not an accepted parameter" });
        continue;
      }
      errors.push(...validateInput(sub, v, `${at}.${k}`));
    }
    return errors;
  }
  if (schema.type === "string") {
    if (typeof value !== "string") return [{ at, message: "must be a string" }];
    if (schema.enum && !schema.enum.includes(value)) err(`must be one of: ${schema.enum.join(", ")}`);
    if (schema.maxLength !== undefined && [...value].length > schema.maxLength) err(`must be at most ${schema.maxLength} characters`);
    if (schema.minLength !== undefined && [...value].length < schema.minLength) err(`must be at least ${schema.minLength} characters`);
    if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) err("has an invalid format");
    return errors;
  }
  if (schema.type === undefined) return errors;
  return [{ at, message: `unsupported schema type ${schema.type}` }];
}
