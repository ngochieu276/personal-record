const DEFAULT_WEB_ORIGINS = [
  "http://localhost:5173",
  "https://web-git-main-nguyen-ngoc-hieus-projects.vercel.app",
];

function toOrigin(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return `${url.protocol}//${url.host}`;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

export function webOrigins() {
  const fromEnv = (process.env.WEB_ORIGIN ?? "")
    .split(",")
    .map(toOrigin)
    .filter(Boolean);

  return [...new Set([...DEFAULT_WEB_ORIGINS, ...fromEnv])];
}
