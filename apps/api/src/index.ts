import cors from "@fastify/cors";
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { createContext } from "./trpc/context.ts";
import { appRouter, type AppRouter } from "./trpc/router.ts";

const port = Number(process.env.PORT ?? 4000);
const origin = process.env.WEB_ORIGIN ?? "http://localhost:5173";

const server = Fastify({
  logger: true,
  routerOptions: { maxParamLength: 5000 },
});

await server.register(cors, {
  origin,
  credentials: true,
});

await server.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext,
    onError({ error, path }) {
      server.log.error({ err: error, path }, "tRPC error");
    },
  } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
});

server.get("/health", async () => ({ ok: true }));

await server.listen({ port, host: "0.0.0.0" });
