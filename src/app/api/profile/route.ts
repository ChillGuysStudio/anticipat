import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDB } from "@/lib/db/client";
import type { LoanProfile } from "@/types/app";

export const runtime = "edge";

// GET /api/profile — load the authenticated user's loan profile from D1
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDB();
    const row = await db
      .prepare("SELECT data FROM loan_profiles WHERE user_id = ?")
      .bind(userId)
      .first<{ data: string }>();

    if (!row) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({ profile: JSON.parse(row.data) as LoanProfile });
  } catch (err) {
    console.error("[GET /api/profile]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/profile — upsert the authenticated user's loan profile
export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = (await request.json()) as LoanProfile;
    const now = new Date().toISOString();

    const db = await getDB();
    await db
      .prepare(
        `INSERT INTO loan_profiles (user_id, data, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
      )
      .bind(userId, JSON.stringify(profile), now)
      .run();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/profile]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/profile — delete the authenticated user's loan profile and action history
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDB();
    await db.batch([
      db.prepare("DELETE FROM loan_profiles WHERE user_id = ?").bind(userId),
      db.prepare("DELETE FROM monthly_actions WHERE user_id = ?").bind(userId)
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/profile]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

