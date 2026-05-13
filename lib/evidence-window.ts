/**
 * Shared evidence export window cap. Imported by both the server-side
 * validator (src/server/evidenceExport.ts) and the client-side form
 * validator (lib/evidence-ui.ts) so the rule cannot drift between
 * the two surfaces.
 */
export const EVIDENCE_EXPORT_MAX_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
export const EVIDENCE_EXPORT_MAX_WINDOW_LABEL = "90 days";
