function trimSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function webOrigins() {
  const raw = process.env.WEB_ORIGIN ?? "http://localhost:5173";
  const origins = raw
    .split(",")
    .map((origin) => trimSlash(origin.trim()))
    .filter(Boolean);

  if (origins.length === 0) {
    return ["http://localhost:5173"];
  }

  return origins;
}
