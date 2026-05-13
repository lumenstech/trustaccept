export interface EvidenceExportFormInput {
  from: string;
  to: string;
  format: string;
  agent_id?: string;
}

export interface EvidenceExportValidation {
  ok: boolean;
  errors: Record<string, string>;
  href?: string;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const ALLOWED_FORMATS = new Set(["json", "csv", "zip"]);

/**
 * Mirrors the server's DecisionsExportQuery rules (90-day max window,
 * required from/to, allowed formats) so the export button can stay
 * disabled until the form is internally consistent. The href that
 * comes back is ready to use as an <a download> target.
 */
export function validateExportForm(
  input: EvidenceExportFormInput,
): EvidenceExportValidation {
  const errors: Record<string, string> = {};

  if (!input.from) {
    errors.from = "Start date is required";
  } else if (!ISO_DATE.test(input.from)) {
    errors.from = "Use YYYY-MM-DD";
  }
  if (!input.to) {
    errors.to = "End date is required";
  } else if (!ISO_DATE.test(input.to)) {
    errors.to = "Use YYYY-MM-DD";
  }
  if (!ALLOWED_FORMATS.has(input.format)) {
    errors.format = "Choose JSON, CSV, or ZIP";
  }

  if (!errors.from && !errors.to) {
    const fromMs = Date.parse(`${input.from}T00:00:00Z`);
    const toMs = Date.parse(`${input.to}T23:59:59Z`);
    if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
      errors.from = "Invalid date";
    } else if (fromMs > toMs) {
      errors.to = "End must be on or after start";
    } else if (toMs - fromMs > NINETY_DAYS_MS) {
      errors.to = "Export window cannot exceed 90 days";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const params = new URLSearchParams();
  params.set("from", `${input.from}T00:00:00Z`);
  params.set("to", `${input.to}T23:59:59Z`);
  params.set("format", input.format);
  if (input.agent_id && input.agent_id.trim().length > 0) {
    params.set("agent_id", input.agent_id.trim());
  }
  return {
    ok: true,
    errors: {},
    href: `/api/v1/decisions/export?${params.toString()}`,
  };
}
