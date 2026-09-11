import { NextResponse } from "next/server.js";
import { checkDatabaseConnection } from "../../../lib/db.ts";

export async function GET() {
  const database = await checkDatabaseConnection();

  return NextResponse.json({
    ok: true,
    service: "EdolasSG",
    database
  });
}
