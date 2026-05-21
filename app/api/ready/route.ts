import { NextResponse } from "next/server";
import { readinessReport } from "@/src/server/readiness";

export async function GET() {
  const report = await readinessReport();
  return NextResponse.json(report, {
    status: report.status === "ok" ? 200 : 503,
  });
}
