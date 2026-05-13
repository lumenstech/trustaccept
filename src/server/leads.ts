import { DEMO_ORGANIZATION_ID } from "@/lib/seed-data";
import type { Lead, LeadFormType } from "@/lib/types";
import { recordAuditEvent } from "./auditLogs";
import { notifyLeadReceived } from "./notifications";
import { getStore } from "./store";

let counter = 0;
function generateLeadId(): string {
  counter += 1;
  return `lead-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export interface LeadCreateInput {
  formType: LeadFormType;
  name: string;
  company: string;
  email: string;
  phone?: string;
  riskArea: string;
  urgency: string;
  description: string;
}

export function createLead(input: LeadCreateInput): Lead {
  const lead: Lead = {
    id: generateLeadId(),
    formType: input.formType,
    name: input.name,
    company: input.company,
    email: input.email,
    phone: input.phone,
    riskArea: input.riskArea,
    urgency: input.urgency,
    description: input.description,
    status: "new",
    createdAt: new Date().toISOString(),
  };

  getStore().leads.set(lead.id, lead);

  recordAuditEvent({
    eventType: "lead_form.submitted",
    actor: { name: lead.email },
    organizationId: DEMO_ORGANIZATION_ID,
    metadata: {
      formType: lead.formType,
      company: lead.company,
      riskArea: lead.riskArea,
      urgency: lead.urgency,
    },
  });

  notifyLeadReceived(lead);

  return lead;
}

export function listLeads(): Lead[] {
  return Array.from(getStore().leads.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}
