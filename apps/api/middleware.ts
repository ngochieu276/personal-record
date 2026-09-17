const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://web-git-main-nguyen-ngoc-hieus-projects.vercel.app",
] as const;

export const config = {
  matcher: "/:path*",
};

type EdgeRequest = {
  method: string;
  headers: {
    get(name: string): string | null;
  };
};

export default function middleware(request: EdgeRequest) {
  const origin = request.headers.get("origin");
  const isAllowedOrigin =
    origin !== null && (ALLOWED_ORIGINS as readonly string[]).includes(origin);

  if (request.method !== "OPTIONS") {
    return;
  }

  return new Response(null, {
    status: 204,
    headers: {
      ...(isAllowedOrigin && origin ? { "Access-Control-Allow-Origin": origin } : {}),
      "Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, trpc-accept, authorization",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });
}
