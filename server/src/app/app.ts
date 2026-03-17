import Fastify, { FastifyInstance } from "fastify";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true,
  });

  return app;
}
