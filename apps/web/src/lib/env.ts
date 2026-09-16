function trimSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function apiBaseUrl() {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (!raw) {
    throw new Error("VITE_API_URL is required (API origin, no trailing slash).");
  }
  return trimSlash(raw);
}

export function trpcUrl() {
  return `${apiBaseUrl()}/trpc`;
}
