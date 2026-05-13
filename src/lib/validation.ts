import { z } from "zod";
import { RISK_AREAS } from "@/lib/leads";
import { MODULES } from "@/lib/modules";

const moduleKeys = MODULES.map((m) => m.key) as [string, ...string[]];
const riskAreaValues = RISK_AREAS.map((r) => r.value) as [string, ...string[]];

const sourceReferenceSchema = z.object({
  label: z.string().min(1).max(200),
  system: z.string().min(1).max(120),
  externalId: z.string().max(120).optional(),
  url: z.string().url().max(500).optional(),
});

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, "Expected YYYY-MM-DD")
  .or(z.string().datetime())
  .optional();

export const RiskRecordCreateInput = z.object({
  module: z.enum(moduleKeys),
  title: z.string().min(4, "Title is required").max(280),
  description: z.string().min(4, "Description is required").max(4000),
  sourceSystem: z.string().min(1).max(120),
  sourceType: z.string().min(1).max(120),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  riskScore: z.number().int().min(0).max(100).optional(),
  owner: z.string().min(1).max(120),
  department: z.string().min(1).max(120),
  dueDate: isoDate,
  expirationDate: isoDate,
  reviewDate: isoDate,
  compensatingControls: z.string().min(1).max(4000),
  evidenceSummary: z.string().min(1).max(4000),
  businessJustification: z.string().min(1).max(4000),
  technicalContext: z.string().max(4000).default(""),
  frameworkTags: z.array(z.string().min(1).max(120)).max(20).default([]),
  sourceReferences: z.array(sourceReferenceSchema).max(20).default([]),
});
export type RiskRecordCreateInputType = z.infer<typeof RiskRecordCreateInput>;

export const RiskRecordUpdateInput = RiskRecordCreateInput.partial().extend({
  status: z
    .enum(["pending", "accepted", "rejected", "remediation_required", "expired"])
    .optional(),
});
export type RiskRecordUpdateInputType = z.infer<typeof RiskRecordUpdateInput>;

export const ApprovalDecisionInput = z.object({
  action: z.enum(["accept", "reject", "remediate"]),
  decisionNote: z.string().max(2000).optional(),
  compensatingControlsNote: z.string().max(2000).optional(),
  reviewDate: isoDate,
});
export type ApprovalDecisionInputType = z.infer<typeof ApprovalDecisionInput>;

export const LeadCaptureInput = z.object({
  formType: z.enum([
    "book-risk-review",
    "start-pilot",
    "request-evidence-desk",
    "contact",
  ]),
  name: z.string().min(1, "Name is required").max(120),
  company: z.string().min(1, "Company is required").max(160),
  email: z.string().email("Valid email required").max(200),
  phone: z.string().max(60).optional().or(z.literal("")),
  riskArea: z.enum(riskAreaValues),
  urgency: z.enum(["48-hours", "this-week", "this-month", "exploring"]),
  description: z.string().min(1, "Description is required").max(4000),
});
export type LeadCaptureInputType = z.infer<typeof LeadCaptureInput>;

export const EvidencePacketExportInput = z.object({
  recordId: z.string().min(1).max(120),
  format: z.enum(["pdf"]).default("pdf"),
});
export type EvidencePacketExportInputType = z.infer<typeof EvidencePacketExportInput>;

export const AdminSettingsInput = z.object({
  workspaceName: z.string().min(1).max(160),
  defaultApproverGroup: z.string().max(160).optional(),
  evidenceRetentionYears: z.number().int().min(1).max(50),
});
export type AdminSettingsInputType = z.infer<typeof AdminSettingsInput>;

export function formatZodError(error: z.ZodError) {
  return {
    error: "validation_failed",
    issues: error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
      code: i.code,
    })),
  };
}
