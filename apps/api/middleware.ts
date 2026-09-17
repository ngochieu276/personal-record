const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://web-git-main-nguyen-ngoc-hieus-projects.vercel.app",
];

export const config = {
  matcher: "/:path*",
};

export default function middleware(request: Request) {
  const origin = request.headers.get("origin");
  const isAllowedOrigin = origin !== null && ALLOWED_ORIGINS.includes(origin);

  if (request.method !== "OPTIONS") {
    return;
  }

  return new Response(null, {
    status: 204,
    headers: {
      ...(isAllowedOrigin ? { "Access-Control-Allow-Origin": origin } : {}),
      "Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, trpc-accept, authorization",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });
}
