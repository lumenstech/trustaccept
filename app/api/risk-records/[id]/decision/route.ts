import { NextResponse } from "next/server";
import { handleApiError } from "@/src/server/api";
import { requireDecisionAccessAsync } from "@/src/server/auth";
import { updateRiskRecordDecisionAsync } from "@/src/server/riskRecords";
import { notifyDecisionRecorded } from "@/src/server/notifications";
import { ApprovalDecisionInput } from "@/src/lib/validation";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireDecisionAccessAsync();
    const json = await req.json();
    const input = ApprovalDecisionInput.parse(json);
    const record = await updateRiskRecordDecisionAsync(user, params.id, input);
    notifyDecisionRecorded(record, user);
    return NextResponse.json({ record });
  } catch (err) {
    return handleApiError(err);
  }
}
