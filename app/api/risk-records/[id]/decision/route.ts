import { NextResponse } from "next/server";
import { handleApiError } from "@/src/server/api";
import { verifyApprovalToken } from "@/src/server/approvalTokens";
import { requireDecisionAccessAsync } from "@/src/server/auth";
import { updateRiskRecordDecisionAsync } from "@/src/server/riskRecords";
import { notifyDecisionRecordedAsync } from "@/src/server/notifications";
import { ApprovalDecisionInput } from "@/src/lib/validation";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireDecisionAccessAsync();
    const json = await req.json();
    const input = ApprovalDecisionInput.parse(json);
    await verifyApprovalToken(params.id, input.approvalToken, { consume: true });
    const record = await updateRiskRecordDecisionAsync(user, params.id, input);
    await notifyDecisionRecordedAsync(record, user);
    return NextResponse.json({ record });
  } catch (err) {
    return handleApiError(err);
  }
}
