import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDB } from "@/lib/db/client";
import type { MonthlyAction } from "@/types/app";


// GET /api/actions — list all monthly actions for the authenticated user
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDB();
    const rows = await db
      .prepare(
        "SELECT data FROM monthly_actions WHERE user_id = ? ORDER BY month ASC"
      )
      .bind(userId)
      .all<{ data: string }>();

    const actions: MonthlyAction[] = rows.results.map((r: { data: string }) =>
      JSON.parse(r.data)
    );

    return NextResponse.json({ actions });
  } catch (err) {
    console.error("[GET /api/actions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/actions — insert or replace a monthly action
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const action = (await request.json()) as MonthlyAction;
    const db = await getDB();

    await db
      .prepare(
        `INSERT INTO monthly_actions (id, user_id, month, data, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data`
      )
      .bind(
        action.id,
        userId,
        action.month,
        JSON.stringify(action),
        action.createdAt
      )
      .run();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/actions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/actions?id=xxx — delete a specific monthly action
export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const db = await getDB();
    await db
      .prepare("DELETE FROM monthly_actions WHERE id = ? AND user_id = ?")
      .bind(id, userId)
      .run();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/actions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
