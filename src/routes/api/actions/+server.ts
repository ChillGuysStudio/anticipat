import { json, type RequestHandler } from '@sveltejs/kit';
import type { MonthlyAction } from '$lib/types/app';

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
    const rows = await getDB(platform)
      .prepare('SELECT data FROM monthly_actions WHERE user_id = ? ORDER BY month ASC')
      .bind(userId)
      .all<{ data: string }>();

    const actions: MonthlyAction[] = rows.results.map((row) => JSON.parse(row.data));
    return json({ actions });
  } catch (err) {
    console.error('[GET /api/actions]', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ locals, platform, request }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const action = (await request.json()) as MonthlyAction;

    await getDB(platform)
      .prepare(
        `INSERT INTO monthly_actions (id, user_id, month, data, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data`
      )
      .bind(action.id, userId, action.month, JSON.stringify(action), action.createdAt)
      .run();

    return json({ ok: true });
  } catch (err) {
    console.error('[POST /api/actions]', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ locals, platform, url }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const id = url.searchParams.get('id');
    if (!id) {
      return json({ error: 'Missing id' }, { status: 400 });
    }

    await getDB(platform)
      .prepare('DELETE FROM monthly_actions WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .run();

    return json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/actions]', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
