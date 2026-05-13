import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/src/server/api";
import { requireDashboardAccess } from "@/src/server/auth";
import { listDecisions } from "@/src/server/decisions";
import { EvidenceExportInput } from "@/src/lib/validation";
import { evidenceSha256 } from "@/src/server/evidenceHash";
import {
  buildDecisionsCsv,
  buildEvidenceZip,
  MAX_EXPORT_WINDOW_DAYS,
} from "@/src/server/evidenceExport";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = requireDashboardAccess();
    const parsed = EvidenceExportInput.parse({
      from: req.nextUrl.searchParams.get("from") ?? "",
      to: req.nextUrl.searchParams.get("to") ?? "",
      agentId: req.nextUrl.searchParams.get("agentId") ?? undefined,
      format: req.nextUrl.searchParams.get("format") ?? undefined,
    });

    const from = new Date(`${parsed.from}T00:00:00Z`);
    const to = new Date(`${parsed.to}T23:59:59Z`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json(
        { error: "invalid_dates" },
        { status: 400 },
      );
    }
    if (to.getTime() < from.getTime()) {
      return NextResponse.json(
        { error: "to_before_from" },
        { status: 400 },
      );
    }
    const windowDays =
      (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    if (windowDays > MAX_EXPORT_WINDOW_DAYS) {
      return NextResponse.json(
        {
          error: "window_too_large",
          max_window_days: MAX_EXPORT_WINDOW_DAYS,
          requested_window_days: Math.ceil(windowDays),
        },
        { status: 400 },
      );
    }

    const decisions = listDecisions(user, {
      agentId: parsed.agentId,
      from,
      to,
    });

    if (parsed.format === "csv") {
      const csv = buildDecisionsCsv(decisions);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="trustaccept-decisions-${parsed.from}-${parsed.to}.csv"`,
        },
      });
    }

    if (parsed.format === "zip") {
      const zip = buildEvidenceZip(decisions, {
        tenantId: user.organizationId,
        from: parsed.from,
        to: parsed.to,
        agentId: parsed.agentId,
      });
      return new NextResponse(new Uint8Array(zip), {
        status: 200,
        headers: {
          "content-type": "application/zip",
          "content-disposition": `attachment; filename="trustaccept-evidence-${parsed.from}-${parsed.to}.zip"`,
        },
      });
    }

    // Default: json
    const payload = {
      tenantId: user.organizationId,
      from: parsed.from,
      to: parsed.to,
      agentId: parsed.agentId ?? null,
      count: decisions.length,
      manifestSha256: evidenceSha256(
        decisions.map((d) => ({ id: d.id, sha: d.evidenceSha256 })),
      ),
      decisions,
    };
    return NextResponse.json(payload);
  } catch (err) {
    return handleApiError(err);
  }
}
