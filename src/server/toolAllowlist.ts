const TOOL_ID_ENV = "TRUSTACCEPT_ALLOWED_TOOL_IDS";

export function allowedToolIds(): string[] {
  return (process.env[TOOL_ID_ENV] ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isToolAllowlistConfigured(): boolean {
  return allowedToolIds().length > 0;
}

export function toolAllowlistEnvName(): string {
  return TOOL_ID_ENV;
}

export function isToolAllowed(toolId: string | undefined): boolean {
  const allowed = allowedToolIds();
  if (allowed.length === 0) return true;
  if (!toolId) return false;
  return allowed.includes(toolId);
}
