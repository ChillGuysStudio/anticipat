import { json, type RequestHandler } from '@sveltejs/kit';
import type { LoanProfile } from '$lib/types/app';

function getDB(platform: App.Platform | undefined): D1Database {
  const db = platform?.env.DB;
  if (!db) {
    throw new Error('Cloudflare D1 binding DB is not available.');
  }
  return db;
}

export const GET: RequestHandler = async ({ locals, platform }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const row = await getDB(platform)
      .prepare('SELECT data FROM loan_profiles WHERE user_id = ?')
      .bind(userId)
      .first<{ data: string }>();

    if (!row) {
      return json({ profile: null });
    }

    return json({ profile: JSON.parse(row.data) as LoanProfile });
  } catch (err) {
    console.error('[GET /api/profile]', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ locals, platform, request }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const profile = (await request.json()) as LoanProfile;
    const now = new Date().toISOString();

    await getDB(platform)
      .prepare(
        `INSERT INTO loan_profiles (user_id, data, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
      )
      .bind(userId, JSON.stringify(profile), now)
      .run();

    return json({ ok: true });
  } catch (err) {
    console.error('[PUT /api/profile]', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ locals, platform }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getDB(platform);
    await db.batch([
      db.prepare('DELETE FROM loan_profiles WHERE user_id = ?').bind(userId),
      db.prepare('DELETE FROM monthly_actions WHERE user_id = ?').bind(userId)
    ]);

    return json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/profile]', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
