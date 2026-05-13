import { NextRequest, NextResponse } from "next/server";
import { handleApiError, jsonError } from "@/src/server/api";
import { requireDashboardAccess } from "@/src/server/auth";
import {
  EvidenceExportError,
  buildCsvStream,
  buildJsonStream,
  buildZipBundle,
  exportDecisions,
  validateWindow,
} from "@/src/server/evidenceExport";
import { DecisionsExportQuery, formatZodError } from "@/src/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const user = requireDashboardAccess();
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = DecisionsExportQuery.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }
    try {
      validateWindow(parsed.data.from, parsed.data.to);
    } catch (err) {
      if (err instanceof EvidenceExportError) {
        return jsonError(err.message, err.status);
      }
      throw err;
    }
    const records = exportDecisions(user, {
      from: parsed.data.from,
      to: parsed.data.to,
      format: parsed.data.format,
      agentId: parsed.data.agent_id,
    });

    if (parsed.data.format === "csv") {
      return new Response(buildCsvStream(records), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="decisions.csv"',
        },
      });
    }
    if (parsed.data.format === "zip") {
      const zip = buildZipBundle(
        records,
        user.organizationId,
        parsed.data.from,
        parsed.data.to,
      );
      return new Response(new Uint8Array(zip), {
        headers: {
          "content-type": "application/zip",
          "content-disposition": 'attachment; filename="evidence-bundle.zip"',
          "content-length": String(zip.length),
        },
      });
    }
    // Default: json
    return new Response(buildJsonStream(records), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": 'attachment; filename="decisions.json"',
      },
    });
  } catch (err) {
    if (err instanceof EvidenceExportError) {
      return jsonError(err.message, err.status);
    }
    return handleApiError(err);
  }
}
