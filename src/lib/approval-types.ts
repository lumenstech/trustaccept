import { z } from "zod";

/**
 * MCP-facing approval types. Locked from Day 1 (per the marketplace plan):
 * - `action` is an object, never a string
 * - The output schema reserves the policy/receipt/expiry fields as nullable
 *   so Blocks 4 and 5 can fill them in without breaking the contract
 *
 * The TrustAccept storage mapping for each field is documented in
 * apps/mcp-server/FIELD_MAPPING.md. Constraints below mirror the storage
 * caps so invalid input is rejected at the wrapper boundary rather than
 * surfacing as a downstream Zod error from RiskRecordCreateInput.
 */

const SOURCE_REF_EXTERNAL_ID_MAX = 120;
const TITLE_MIN = 4;
const TITLE_MAX = 280;
const LONG_TEXT_MAX = 4000;

export const PrincipalTypeEnum = z.enum(["email", "phone", "user_id"]);
export type PrincipalType = z.infer<typeof PrincipalTypeEnum>;

export const ApprovalStatusEnum = z.enum([
  "pending",
  "accepted",
  "rejected",
  "remediation_required",
  "expired",
]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusEnum>;

export const RiskLevelEnum = z.enum(["low", "medium", "high", "critical"]);
export type ApprovalRiskLevel = z.infer<typeof RiskLevelEnum>;

export const DecisionActorTypeEnum = z.enum(["human", "policy"]);
export type DecisionActorType = z.infer<typeof DecisionActorTypeEnum>;

export const ApprovalActionInput = z.object({
  type: z
    .string()
    .min(1, "action.type is required")
    .max(SOURCE_REF_EXTERNAL_ID_MAX),
  summary: z.string().min(TITLE_MIN).max(TITLE_MAX),
  payload: z.record(z.unknown()).default({}),
});
export type ApprovalActionInputType = z.infer<typeof ApprovalActionInput>;

export const ApprovalPrincipalInput = z.object({
  type: PrincipalTypeEnum,
  value: z.string().min(1).max(SOURCE_REF_EXTERNAL_ID_MAX),
});
export type ApprovalPrincipalInputType = z.infer<typeof ApprovalPrincipalInput>;

export const ApprovalContextInput = z
  .object({
    agent_name: z.string().min(1).max(SOURCE_REF_EXTERNAL_ID_MAX).optional(),
    environment: z.string().min(1).max(SOURCE_REF_EXTERNAL_ID_MAX).optional(),
    amount: z.number().finite().optional(),
    resource: z.string().min(1).max(SOURCE_REF_EXTERNAL_ID_MAX).optional(),
    business_justification: z.string().min(1).max(LONG_TEXT_MAX).optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .default({});
export type ApprovalContextInputType = z.infer<typeof ApprovalContextInput>;

export const ApprovalRequestInput = z.object({
  action: ApprovalActionInput,
  principal: ApprovalPrincipalInput,
  context: ApprovalContextInput.optional(),
  tool_id: z.string().min(1).max(SOURCE_REF_EXTERNAL_ID_MAX).optional(),
});
export type ApprovalRequestInputType = z.infer<typeof ApprovalRequestInput>;

export const ApprovalListQueryInput = z.object({
  status: ApprovalStatusEnum.optional(),
  principal_type: PrincipalTypeEnum.optional(),
  principal_value: z.string().min(1).max(SOURCE_REF_EXTERNAL_ID_MAX).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export type ApprovalListQueryInputType = z.infer<typeof ApprovalListQueryInput>;

/**
 * Locked output shape. Every reserved-for-later field is present from Day 1
 * with a `null` default until the block that populates it ships. MCP clients
 * can rely on the keys existing across the entire MVP timeline.
 */
export interface ApprovalRecord {
  id: string;
  status: ApprovalStatus;
  action: {
    type: string;
    summary: string;
  };
  principal: {
    type: PrincipalType | null;
    value: string | null;
  };
  context: {
    agent_name: string | null;
    environment: string | null;
    amount: number | null;
    resource: string | null;
    business_justification: string | null;
  };
  policy_id: string | null;
  risk_level: ApprovalRiskLevel | null;
  policy_reason: string | null;
  action_hash: string | null;
  tool_id: string | null;
  receipt_jwt: string | null;
  expires_at: string | null;
  decided_by: string | null;
  decision_actor_type: DecisionActorType | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  organization_id: string;
}
