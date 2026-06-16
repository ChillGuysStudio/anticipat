/// <reference types="svelte-clerk/env" />
/// <reference types="@cloudflare/workers-types" />

import type { Auth } from 'svelte-clerk/server';

declare global {
  namespace App {
    interface Locals {
      auth: () => Auth;
    }

    interface Platform {
      env: {
        DB: D1Database;
      };
      context: ExecutionContext;
      caches: CacheStorage & { default: Cache };
    }
  }
}

export {};
