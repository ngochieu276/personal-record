import "dotenv/config";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { webOrigins } from "./env.ts";
import { createContext } from "./trpc/context.ts";
import { appRouter, type AppRouter } from "./trpc/router.ts";

const port = Number(process.env.PORT ?? 4000);
const origins = webOrigins();

const server = Fastify({
  logger: true,
  routerOptions: { maxParamLength: 5000 },
});

await server.register(cors, {
  origin: origins,
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
