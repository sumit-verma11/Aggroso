import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ status: "ok", db: "connected" });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        db: "unreachable",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 503 }
    );
  }
}
