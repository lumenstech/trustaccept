import { z } from "zod";

export const DecisionCreateInput = z.object({
  external_id: z.string().min(1).max(200).optional(),
  source: z.string().min(1).max(160),
  action_type: z.string().min(1).max(160),
  title: z.string().min(1).max(240),
  description: z.string().min(1).max(4000),
  risk_level: z.enum(["low", "medium", "high", "critical"]),
  requester: z.string().min(1).max(200),
  subject: z.string().min(1).max(200),
  amount: z.number().finite().optional(),
  currency: z
    .string()
    .min(3)
    .max(8)
    .regex(/^[A-Z]{3,8}$/, "currency must be an ISO code like USD")
    .optional(),
  evidence_url: z.string().url().max(2000).optional(),
  metadata: z.record(z.unknown()).optional(),
  slack_team_id: z.string().min(1).max(64).optional(),
  approval_channel_id: z.string().min(1).max(64).optional(),
});

export type DecisionCreateInputType = z.infer<typeof DecisionCreateInput>;
