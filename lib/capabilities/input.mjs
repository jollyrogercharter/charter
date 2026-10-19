// Validates tool input against the tool's own JSON Schema (the subset these tools use), so published and enforced rules can't drift.
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const own = (o, k) => Object.hasOwn(o ?? {}, k);

export function validateInput(schema, value, at = "$") {
  const errors = [];
  const err = (message) => errors.push({ at, message });
  if (schema.type === "object") {
    if (!isObj(value)) return [{ at, message: "must be an object" }];
    for (const k of schema.required ?? []) if (!own(value, k)) errors.push({ at: `${at}.${k}`, message: "is required" });
    for (const [k, v] of Object.entries(value)) {
      const sub = own(schema.properties, k) ? schema.properties[k] : undefined;
      if (!sub) {
        if (schema.additionalProperties === false) errors.push({ at: `${at}.${k}`, message: "is not an accepted parameter" });
        continue;
      }
      errors.push(...validateInput(sub, v, `${at}.${k}`));
    }
    if (schema.maxProperties !== undefined && Object.keys(value).length > schema.maxProperties) err(`must have at most ${schema.maxProperties} properties`);
    return errors;
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) return [{ at, message: "must be an array" }];
    if (schema.maxItems !== undefined && value.length > schema.maxItems) return [{ at, message: `must have at most ${schema.maxItems} items` }];
    if (schema.minItems !== undefined && value.length < schema.minItems) err(`must have at least ${schema.minItems} items`);
    if (schema.uniqueItems && new Set(value.map((x) => JSON.stringify(x))).size !== value.length) err("must not contain duplicates");
    if (schema.items) value.forEach((v, i) => errors.push(...validateInput(schema.items, v, `${at}[${i}]`)));
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
  if (schema.type === "number" || schema.type === "integer") {
    if (typeof value !== "number" || !Number.isFinite(value)) return [{ at, message: `must be a ${schema.type}` }];
    if (schema.type === "integer" && !Number.isInteger(value)) err("must be an integer");
    if (schema.minimum !== undefined && value < schema.minimum) err(`must be at least ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) err(`must be at most ${schema.maximum}`);
    return errors;
  }
  if (schema.type === "boolean") return typeof value === "boolean" ? errors : [{ at, message: "must be true or false" }];
  // Nullable numbers: { type: ["number", "null"] }.
  if (Array.isArray(schema.type)) {
    if (value === null && schema.type.includes("null")) return errors;
    const t = schema.type.find((x) => x !== "null");
    return validateInput({ ...schema, type: t }, value, at);
  }
  if (schema.type === undefined) return errors;
  return [{ at, message: `unsupported schema type ${schema.type}` }];
}
