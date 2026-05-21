import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/src/server/api";
import { LeadCaptureInput } from "@/src/lib/validation";
import { createLeadAsync } from "@/src/server/leads";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = LeadCaptureInput.parse(json);
    const phone = parsed.phone && parsed.phone.length > 0 ? parsed.phone : undefined;
    const lead = await createLeadAsync({ ...parsed, phone });
    return NextResponse.json({ lead }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
