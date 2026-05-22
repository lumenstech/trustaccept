import { createHash } from "node:crypto";
import { DEMO_ORGANIZATION_ID, DEMO_USER_ID } from "@/lib/seed-data";
import type { Role, SessionUser } from "@/lib/types";
import { getStore } from "./store";
import { getUpstashJson, isUpstashConfigured } from "./upstash";

export class UnauthorizedError extends Error {
  status = 401 as const;
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  status = 403 as const;
  constructor(message = "Access denied") {
    super(message);
    this.name = "ForbiddenError";
  }
}

const ROLE_VALUES = new Set<Role>(["OWNER", "ADMIN", "APPROVER", "VIEWER"]);
const SESSION_COOKIE_NAME = "ta_session";
const DEFAULT_SESSION_KEY_PREFIX = "trustaccept:session";

function demoAuthEnabled(): boolean {
  return process.env.TRUSTACCEPT_DISABLE_DEMO_AUTH !== "1";
}

function sessionKeyPrefix(): string {
  return process.env.TRUSTACCEPT_SESSION_KEY_PREFIX ?? DEFAULT_SESSION_KEY_PREFIX;
}

function sessionKey(token: string): string {
  const digest = createHash("sha256").update(token).digest("hex");
  return `${sessionKeyPrefix()}:${digest}`;
}

function normalizeSessionUser(value: unknown): SessionUser | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SessionUser>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.email !== "string" ||
    typeof candidate.organizationId !== "string" ||
    !ROLE_VALUES.has(candidate.role as Role)
  ) {
    return null;
  }
  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    role: candidate.role as Role,
    organizationId: candidate.organizationId,
  };
}

async function sessionTokenFromCookie(): Promise<string | null> {
  try {
    const { cookies } = await import("next/headers");
    return (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

async function getSessionUserFromUpstash(token: string): Promise<SessionUser | null> {
  if (!isUpstashConfigured()) {
    if (demoAuthEnabled()) return null;
    throw new UnauthorizedError("Session store is not configured");
  }

  const raw = await getUpstashJson<unknown>(sessionKey(token));
  const user = normalizeSessionUser(raw);
  if (!user && !demoAuthEnabled()) {
    throw new UnauthorizedError("Session is invalid or expired");
  }
  return user;
}

/**
 * Demo-mode auth. Returns a stable demo user so the dashboard and
 * service layer are exercised end-to-end without a real identity
 * provider. Production requests use getCurrentUserAsync(), which resolves
 * SequenceNow-issued ta_session cookies through Upstash.
 */
export function getCurrentUser(): SessionUser | null {
  const user = getStore().users.get(DEMO_USER_ID);
  return user ?? null;
}

export async function getCurrentUserAsync(): Promise<SessionUser | null> {
  const token = await sessionTokenFromCookie();
  if (token) {
    const sessionUser = await getSessionUserFromUpstash(token);
    if (sessionUser) return sessionUser;
  }
  if (demoAuthEnabled()) return getCurrentUser();
  return null;
}

export function requireCurrentUser(): SessionUser {
  const user = getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireCurrentUserAsync(): Promise<SessionUser> {
  const user = await getCurrentUserAsync();
  if (!user) throw new UnauthorizedError();
  return user;
}

const DASHBOARD_ROLES = new Set<SessionUser["role"]>([
  "OWNER",
  "ADMIN",
  "APPROVER",
  "VIEWER",
]);

export function requireDashboardAccess(): SessionUser {
  const user = requireCurrentUser();
  if (!DASHBOARD_ROLES.has(user.role)) {
    throw new ForbiddenError("Role cannot access dashboard");
  }
  return user;
}

export async function requireDashboardAccessAsync(): Promise<SessionUser> {
  const user = await requireCurrentUserAsync();
  if (!DASHBOARD_ROLES.has(user.role)) {
    throw new ForbiddenError("Role cannot access dashboard");
  }
  return user;
}

const DECISION_ROLES = new Set<SessionUser["role"]>(["OWNER", "ADMIN", "APPROVER"]);

export function requireDecisionAccess(): SessionUser {
  const user = requireCurrentUser();
  if (!DECISION_ROLES.has(user.role)) {
    throw new ForbiddenError("Role cannot record decisions");
  }
  return user;
}

export async function requireDecisionAccessAsync(): Promise<SessionUser> {
  const user = await requireCurrentUserAsync();
  if (!DECISION_ROLES.has(user.role)) {
    throw new ForbiddenError("Role cannot record decisions");
  }
  return user;
}

export interface OrganizationScoped {
  organizationId?: string;
}

/**
 * Assert that the entity belongs to the caller's organization.
 * Records seeded before tenant isolation may have an undefined
 * organizationId — we treat those as belonging to the demo org.
 */
export function assertCanAccessOrganizationRecord(
  user: SessionUser,
  entity: OrganizationScoped | null | undefined,
): void {
  if (!entity) throw new ForbiddenError("Record not found");
  const recordOrg = entity.organizationId ?? DEMO_ORGANIZATION_ID;
  if (recordOrg !== user.organizationId) {
    throw new ForbiddenError("Record belongs to another organization");
  }
}
