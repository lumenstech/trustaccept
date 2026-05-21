import { z } from "zod";

/**
 * Zod schemas mirroring the contract in apps/mcp-server/FIELD_MAPPING.md.
 * The same schemas live in the main repo at src/lib/approval-types.ts;
 * they are intentionally duplicated here so the MCP server stays a
 * truly standalone npm package with no parent-repo imports.
 *
 * If you change a constraint here, change FIELD_MAPPING.md and
 * src/lib/approval-types.ts in the same PR or the contract drifts.
 */

const MAX_SHORT_REF = 120;
const TITLE_MIN = 4;
const TITLE_MAX = 280;
const LONG_TEXT = 4000;

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
export type RiskLevel = z.infer<typeof RiskLevelEnum>;

export const DecisionActorTypeEnum = z.enum(["human", "policy"]);
export type DecisionActorType = z.infer<typeof DecisionActorTypeEnum>;

export const ApprovalRequestInput = z.object({
  action: z.object({
    type: z.string().min(1).max(MAX_SHORT_REF),
    summary: z.string().min(TITLE_MIN).max(TITLE_MAX),
    payload: z.record(z.unknown()).optional(),
  }),
  principal: z.object({
    type: PrincipalTypeEnum,
    value: z.string().min(1).max(MAX_SHORT_REF),
  }),
  context: z
    .object({
      agent_name: z.string().min(1).max(MAX_SHORT_REF).optional(),
      environment: z.string().min(1).max(MAX_SHORT_REF).optional(),
      amount: z.number().finite().optional(),
      resource: z.string().min(1).max(MAX_SHORT_REF).optional(),
      business_justification: z.string().min(1).max(LONG_TEXT).optional(),
      metadata: z.record(z.unknown()).optional(),
    })
    .optional(),
  tool_id: z.string().min(1).max(MAX_SHORT_REF).optional(),
});
export type ApprovalRequestInputType = z.infer<typeof ApprovalRequestInput>;

export const GetApprovalStatusInput = z.object({
  request_id: z.string().min(1).max(MAX_SHORT_REF),
});
export type GetApprovalStatusInputType = z.infer<typeof GetApprovalStatusInput>;

export const ListPendingApprovalsInput = z.object({
  principal_type: PrincipalTypeEnum.optional(),
  principal_value: z.string().min(1).max(MAX_SHORT_REF).optional(),
  limit: z.number().int().min(1).max(200).optional(),
});
export type ListPendingApprovalsInputType = z.infer<
  typeof ListPendingApprovalsInput
>;

/**
 * Locked output shape returned by the wrapper. Mirrored from
 * src/lib/approval-types.ts. All reserved fields are present from
 * Day 1 with `null` as the default until later blocks fill them.
 */
export interface ApprovalRecord {
  id: string;
  status: ApprovalStatus;
  action: { type: string; summary: string };
  principal: { type: PrincipalType | null; value: string | null };
  context: {
    agent_name: string | null;
    environment: string | null;
    amount: number | null;
    resource: string | null;
    business_justification: string | null;
  };
  policy_id: string | null;
  risk_level: RiskLevel | null;
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
