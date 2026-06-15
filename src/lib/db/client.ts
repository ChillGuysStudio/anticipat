import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface Env {
  DB: D1Database;
  [key: string]: unknown;
}

/**
 * Get the D1 database binding from the Cloudflare Worker context.
 * Only callable from Edge Runtime route handlers (async).
 */
export async function getDB(): Promise<D1Database> {
  const ctx = await getCloudflareContext();
  return (ctx.env as unknown as Env).DB;
}
