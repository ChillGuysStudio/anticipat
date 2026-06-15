import { getRequestContext } from "@cloudflare/next-on-pages";

export interface Env {
  DB: D1Database;
}

/**
 * Get the D1 database binding from the Cloudflare Worker context.
 * Only callable from Edge Runtime route handlers.
 */
export function getDB(): D1Database {
  const ctx = getRequestContext();
  return (ctx.env as Env).DB;
}
