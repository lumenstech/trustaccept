import { DEMO_ORGANIZATION_ID, DEMO_USER_ID } from "@/lib/seed-data";
import type { SessionUser } from "@/lib/types";
import { getStore } from "./store";

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

/**
 * Demo-mode auth. Returns a stable demo user so the dashboard and
 * service layer are exercised end-to-end without a real identity
 * provider. Production should swap this for a real session lookup
 * delivered via SequenceNow.
 */
export function getCurrentUser(): SessionUser | null {
  const user = getStore().users.get(DEMO_USER_ID);
  return user ?? null;
}

export function requireCurrentUser(): SessionUser {
  const user = getCurrentUser();
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

const DECISION_ROLES = new Set<SessionUser["role"]>(["OWNER", "ADMIN", "APPROVER"]);

export function requireDecisionAccess(): SessionUser {
  const user = requireCurrentUser();
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
