# TrustAccept

**Accept or reject cyber risk before it becomes an incident.**

TrustAccept is a cyber risk acceptance, approval, and evidence platform. It produces a
defensible approval record for high-risk AI-agent actions, identity events,
vulnerability exceptions, CISA KEV-aware exposure reviews, secure software releases,
device access decisions, and the executive evidence packet that ties them together.

One platform · seven product modules:

1. **AI Action Gate** — approve or reject high-impact AI agent actions before they execute.
2. **Access Accept** — break-glass and privileged access decisions with evidence.
3. **Vulnerability Accept** — risk acceptance records for vulnerabilities you can't patch today.
4. **KEV Exposure Review** — CISA KEV-aware exposure reviews with auditable trails.
5. **Secure Release Gate** — signed approval checkpoint for risky software releases.
6. **Device Accept** — device onboarding as a reviewable decision.
7. **Evidence Desk** — system of record for every accepted, rejected, or remediated decision.

TrustAccept is a Lumens Technology product. Approval delivery and identity workflow
support powered by SequenceNow.

---

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- shadcn/ui-style components (locally vendored under `components/ui/*`)
- Prisma + PostgreSQL-compatible schema (multi-tenant, append-only audit logs)
- Zod-validated API surface
- In-memory demo persistence backend, swap-ready for Prisma
- Seed data for all seven modules
- Mock authentication (production auth is delivered via SequenceNow)

## Vulnerability Accept (second deep module)

Vulnerability Accept converts Fortify, SAST, SCA, GitHub, cloud scanner, and
penetration test findings into accept, reject, or remediate decisions with
owners, expiration dates, compensating controls, and evidence packets.

TrustAccept does not replace Fortify, Snyk, Wiz, Tenable, GitHub, Jira,
ServiceNow, or cloud scanners. TrustAccept creates the approval, acceptance,
and evidence layer around the high-risk vulnerability decisions those systems
expose.

### Routes

- `/vulnerability-acceptance` — enhanced marketing page (problem statement, scanner clarification, eight example decision cards, four-step workflow timeline, evidence packet preview, source-system cards, primary + secondary CTAs).
- `/dashboard/vulnerability-acceptance` — Vulnerability Accept command center. Eight summary cards (pending, critical, expiring exceptions, remediation required, scanner imports, pen test findings, release-blocking findings, accepted risks). Records table with finding ID, asset, CVE/CWE, severity, status, owner, expiration. Buttons: **New Vulnerability Record** and **View Scanner Findings**.
- `/dashboard/vulnerability-acceptance/new` — Vulnerability Accept-specific intake form (finding source, finding title, severity, affected asset, repository/application, CVE, CWE, scanner finding ID, business impact, technical impact, remediation plan, requested decision, owner, expiration date, review date, compensating controls, evidence summary, release-blocking flag). POSTs to `/api/risk-records` with `module = vulnerability-accept` and a `vulnerabilityContext` payload.
- `/dashboard/vulnerability-acceptance/findings` — mock scanner finding feed (Fortify SQL injection, Snyk dependency, GHAS secret scanning, Wiz exposure, Tenable critical CVE, pen test privilege escalation, container critical CVE, SCA finding). Each card has a **Create Risk Record** button that prefills the intake form via query params.

### Module-aware decision labels

| Vulnerability Accept record type | Accept | Reject | Remediate |
| --- | --- | --- | --- |
| Default Vulnerability Accept | Accept Finding Risk | Reject Acceptance | Require Remediation |
| Release-blocking finding | Accept for Release | Block Release | Require Fix |

The resolver (`getApprovalLabels` in `lib/access.ts`) now also branches on
Vulnerability Accept records and, when `vulnerabilityContext.releaseBlocking`
is true, swaps to the release-blocking label set. Access Accept labels are
unchanged.

### Demo workflow

```
1. Scanner finding detected by Fortify / Snyk / GitHub Advanced Security / Wiz / Tenable / Qualys / Rapid7 / pen test
2. TrustAccept creates a Vulnerability Accept risk record
3. Owner accepts, rejects, or requires remediation via the hosted approval page
4. Evidence packet created in the Evidence Desk
5. Ticket or release workflow updated downstream
```

Inbound scanner event payload (also returned by `/api/demo/risk-flow` and
shown on `/docs`):

```json
{
  "source": "fortify",
  "event_type": "critical_finding_exception_request",
  "finding_id": "FORTIFY-2026-1182",
  "application": "customer-portal",
  "severity": "critical",
  "cwe": "CWE-89",
  "requested_decision": "accept_until_next_release",
  "business_justification": "Emergency production release with compensating WAF rule"
}
```

### Verification commands

```bash
npm install
npm run prisma:generate
npm run typecheck
npm test
npm run build
```

End-to-end live verification (May 2026): identity event-style POST →
Vulnerability Accept record with `vulnerabilityContext.releaseBlocking: true`
→ hosted approval page renders `Accept for Release` / `Block Release` /
`Require Fix` → PATCH decision sets status `accepted` and appends an
audit log entry → evidence packet card renders the **Finding context**
block → `/api/evidence-packets/<id>/export.pdf` returns a real
`application/pdf` whose body embeds the audit log entries
`risk_record.created`, `decision.accepted`, and `evidence_packet.generated`.

## Access Accept (first deep module)

Access Accept is the first TrustAccept module built out as a deep, end-to-end
product surface. It creates evidence-ready approval records for privileged
access, admin escalation, API key creation, MFA recovery, break-glass access,
suspicious login events, admin consent, and temporary contractor access.

TrustAccept does not replace Auth0, Okta, Microsoft Entra, Duo, GitHub, Jira, or
ServiceNow. TrustAccept creates the approval, acceptance, and evidence layer
around the high-risk identity and access decisions those systems expose.

### Routes

- `/access-accept` — enhanced marketing page (problem statement, identity-provider clarification, example decision cards, workflow timeline, evidence packet preview, source-system cards, primary + secondary CTAs).
- `/dashboard/access-accept` — Access Accept command center. Summary cards for pending approvals, critical events, expiring temporary access, MFA recovery, API key, suspicious login, break-glass, and contractor access. Empty state and table of every Access Accept record. Buttons: **New Access Record** and **View Identity Events**.
- `/dashboard/access-accept/new` — Access Accept-specific intake form (request type, requester, identity provider, user/service account, target system, privilege level, business justification, requested duration, expiration, review date, compensating controls, approval owner, evidence summary). POSTs to `/api/risk-records` with `module = access-accept` and an `accessContext` payload, then offers links to the command center, hosted approval page, evidence packet, and 48-Hour Review.
- `/dashboard/access-accept/events` — mock identity event feed. Each event has a **Create Risk Record** button that links to `/dashboard/access-accept/new` with the request type, identity source, user, risk level, target system, and event id prefilled via query params.

### Module-aware decision labels

| Access Accept record type | Accept | Reject | Remediate |
| --- | --- | --- | --- |
| Default Access Accept | Approve Access | Reject Access | Require More Evidence |
| Suspicious login record | Accept Login Risk | Reject / Block | Escalate Login |

Resolved through `getApprovalLabels(record)` in `lib/access.ts`. The inbox card,
hosted approval page, and Access Accept dashboard all use the same helper so
the labels stay consistent across surfaces.

### End-to-end verification (live)

The full Access Accept flow has been driven against a running dev server (May 2026):

| Step | Surface | Result |
| --- | --- | --- |
| 1. Identity event feed | `GET /dashboard/access-accept/events` | 200, renders the eight seeded events with prefilled "Create Risk Record" links |
| 2. Prefilled intake form | `GET /dashboard/access-accept/new?requestType=…&source=…&user=…&riskLevel=…&targetSystem=…&eventId=…` | 200, form fields prefilled |
| 3. Event → risk record | `POST /api/risk-records` (module=access-accept + accessContext) | 201, new record `ra-…`, status `pending`, audit timeline length 1 |
| 4. Hosted approval page | `GET /approve/<id>` | 200, module-aware labels render: `Approve Access`, `Reject Access`, `Require More Evidence` |
| 5. Decision recorded | `PATCH /api/risk-records/<id>/decision` action=accept | status flips to `accepted`, `decision=accept`, `decisionBy` set, audit timeline length 2, last action `decided.accept` |
| 6. Evidence packet | `GET /dashboard/risk-records/<id>/evidence` | 200, "Identity & access context" card renders requester/target/privilege/duration/approval owner |
| 7. PDF export | `GET /api/evidence-packets/<id>/export.pdf` | 200, `content-type: application/pdf`, `content-disposition: attachment`, body starts with `%PDF-1.4` and ends with `%%EOF`; embeds the audit log including `risk_record.created`, `decision.accepted`, `evidence_packet.generated` |
| 8. API demo | `GET /api/demo/risk-flow` | returns `counts.accessAccept`, `counts.accessAcceptPending`, and the Access Accept example event payload + five-step flow |

To reproduce:

```bash
PORT=3100 npm run dev &
until curl -fsS http://127.0.0.1:3100/api/demo/risk-flow >/dev/null; do sleep 2; done
# Then walk the table above; sample commands live in the commit message of
# the verification pass.
```

### Demo workflow

```
1. Identity event detected by Okta / Auth0 / Microsoft Entra / Duo / GitHub
2. TrustAccept creates an Access Accept risk record
3. Approver approves or rejects access via the hosted approval page
4. Evidence record created in the Evidence Desk
5. Callback or ticket update sent to the source identity / ITSM system
```

The shape of an inbound identity event is documented at `/docs` and returned
by `/api/demo/risk-flow`:

```json
{
  "source": "okta",
  "event_type": "break_glass_access_request",
  "requester": "admin@company.com",
  "target_system": "production tenant",
  "privilege_level": "super_admin",
  "duration": "4 hours",
  "risk_level": "critical",
  "business_justification": "Production incident response"
}
```

## Hardening status

| Concern | Status | Notes |
| --- | --- | --- |
| Tenant-scoped persistence | demo-backed in-memory store + Prisma schema | Swap to Prisma adapter when `DATABASE_URL` is set |
| Append-only audit logs | done | `src/server/auditLogs.ts`; never mutates or deletes existing entries |
| Risk record wizard persistence | done | Posts to `POST /api/risk-records`; new record visible in Inbox, /approve, evidence packet |
| Decision persistence | done | `PATCH /api/risk-records/[id]/decision` with optional note + review date |
| Evidence PDF export | done | `GET /api/evidence-packets/[id]/export.pdf` returns a real `application/pdf` |
| CSV export | done | `GET /api/risk-records/export.csv`, RFC-4180 escaping |
| Lead capture persistence | done | `POST /api/leads`; mock notification dispatched |
| Auth structure | demo user (Owner) | `src/server/auth.ts`; replace `getCurrentUser` in production |
| Zod validation | done | `src/lib/validation.ts` |
| Security headers | done | XCTO, XFO, Referrer-Policy, Permissions-Policy, CSP, HSTS (prod-only) |
| Dashboard route protection | scaffolded | `middleware.ts` allows demo user; gate with `TRUSTACCEPT_DISABLE_DEMO_AUTH=1` |

## Project layout

```
app/
  (marketing)/                 # Public marketing site (shared header/footer)
    page.tsx                   # Homepage (12-section narrative)
    ai-action-gate/
    access-accept/
    vulnerability-acceptance/
    cisa-kev-review/
    secure-release-gate/
    device-accept/
    evidence-desk/
    pricing/
    integrations/
    security/
    docs/
  dashboard/                   # Authenticated app shell
    page.tsx                   # Overview
    inbox/                     # Approval Inbox
    risk-records/              # Risk Records table
      new/                     # Risk Record Creation Wizard
      [id]/evidence/           # Evidence Packet
    product-modules/           # Seven product modules
    evidence-desk/             # Evidence Desk
    integrations/              # Connected systems
    settings/                  # Workspace settings
  approve/[id]/                # Hosted approval page (decision actions live here)
  (marketing)/book-risk-review/        # 48-Hour Risk Acceptance Pack intake
  (marketing)/start-pilot/             # TrustAccept Pilot intake
  (marketing)/request-evidence-desk/   # Managed Evidence Desk intake
  (marketing)/contact/                 # Contact / Secure Release Program intake
components/
  ui/                          # Button, Card, Badge, Section primitives
  site/                        # Marketing header, footer, logo, module template
  dashboard/                   # Dashboard shell + header
  risk/                        # Inbox card, wizard, decision actions, evidence actions
  forms/                       # Shared lead capture form
lib/                           # Browser-safe shared code
  types.ts                     # RiskRecord, Organization, SessionUser, AuditLog, Lead types
  modules.ts                   # Seven product modules + decision button labels
  seed-data.ts                 # Seed records (with demo org + risk score), used by UI + Prisma seed
  module-query.ts              # ?module=... query param parsing + reverse mapping
  decision.ts                  # Pure decision state transitions + next-step CTA
  evidence.ts                  # Evidence packet summary + executive summary generator
  cta.ts                       # Marketing CTA → route mapping
  leads.ts                     # Lead form vocab (risk areas, urgency)
  cn.ts                        # className helper
src/
  lib/validation.ts            # Zod input schemas for every write endpoint
  server/
    auth.ts                    # Demo user + organization-aware access helpers
    store.ts                   # In-memory persistence backend (singleton via globalThis)
    riskRecords.ts             # Risk record service (list/get/create/update/decision)
    auditLogs.ts               # Append-only audit log writer + reader
    evidencePackets.ts         # Packet summary + PDF generator
    leads.ts                   # Lead capture persistence + notification trigger
    notifications.ts           # Mock notification dispatcher (production: SequenceNow)
    csv.ts                     # CSV escaping + risk record CSV builder
    api.ts                     # API route error handler (Zod + auth errors)
app/api/                       # Route handlers (risk records, decision, csv, pdf, leads, demo)
middleware.ts                  # Dashboard + API route protection (demo-auth-friendly)
tests/                         # Vitest unit tests
prisma/
  schema.prisma                # PostgreSQL-compatible schema
  seed.ts                      # Prisma seed script (uses lib/seed-data.ts)
```

## Run locally

```bash
# 1. Install dependencies and generate the Prisma client
npm install
npm run db:generate

# 2. (optional) Bring up Postgres and seed the database
cp .env.example .env       # set DATABASE_URL
npm run db:push
npm run db:seed

# 3. Start the dev server
npm run dev

# 4. Verify
npm run typecheck          # tsc --noEmit
npm run test               # vitest run
npm run build              # next build
```

### Verification commands

```bash
npm install
npm run prisma:generate   # prisma generate (alias: npm run db:generate)
npm run typecheck         # tsc --noEmit
npm test                  # vitest run
npm run build             # next build
```

If `npm install` fails with `ETARGET No matching version found for hasown@^2.0.3`
(or a similar error mentioning a transitive dep), it means npm is being forced
to read from a stale offline cache. The fix is to **let npm reach the live
registry** — drop any `--prefer-offline` / `--offline` flag and ensure the
machine can reach `https://registry.npmjs.org`. The repo's `package-lock.json`
pins resolved tarballs to that registry; once the lockfile is honored, the
install completes without modifying versions.

### Environment variables

| Variable | Purpose | Default in demo |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection string used by Prisma | Not required while the in-memory store is active |
| `NODE_ENV` | `production` flips on HSTS and tightens CSP | `development` |
| `TRUSTACCEPT_DISABLE_DEMO_AUTH` | Set to `1` to make middleware reject requests without a real `ta_session` cookie | unset (demo user allowed through) |

### What is mocked vs real

- **Mocked**: identity (single demo user, `Owner` role, `demo-org`), notification delivery (logs to stdout instead of SequenceNow), PDF rendering (compact hand-rolled PDF; swap for pdfkit/react-pdf in production).
- **Real**: append-only audit log writes, organization-scoped reads, Zod validation, RFC 4180 CSV escaping, dynamic Next.js rendering of dashboard pages, security headers + middleware, decision lifecycle including `decision`/`decisionBy`/`decisionAt`/`decisionNote`/`reviewDate`/audit entry.

The UI reads seed records directly from `lib/seed-data.ts`, so you can develop the
front-end without a database. Prisma and the seed script are wired up for when you're
ready to back the platform with PostgreSQL.

Open <http://localhost:3000> for the marketing site, or
<http://localhost:3000/dashboard> for the workspace.

## Sample routes to visit

Marketing:

- `/` — homepage with all 12 sections
- `/ai-action-gate`, `/access-accept`, `/vulnerability-acceptance`,
  `/cisa-kev-review`, `/secure-release-gate`, `/device-accept`, `/evidence-desk`
- `/pricing`, `/integrations`, `/security`, `/docs`

Workspace:

- `/dashboard` — overview with stats and recent records
- `/dashboard/inbox` — Approval Inbox across all seven modules
- `/dashboard/access-accept` — Access Accept command center
- `/dashboard/access-accept/new` — Access Accept intake form (accepts prefill query params)
- `/dashboard/access-accept/events` — Mock identity event feed
- `/dashboard/risk-records` — Risk Records table
- `/dashboard/risk-records/new` — six-step Risk Record Creation Wizard
- `/dashboard/risk-records/new?module=ai_action_gate` — wizard with module preselected
- `/dashboard/risk-records/[id]/evidence` — Evidence Packet for a record
- `/dashboard/product-modules` — module index
- `/dashboard/evidence-desk` — Evidence Desk
- `/dashboard/integrations` — connected systems
- `/dashboard/settings` — workspace settings

Service-led intake:

- `/book-risk-review` — 48-Hour Risk Acceptance Pack
- `/start-pilot` — TrustAccept Pilot
- `/request-evidence-desk` — Managed Evidence Desk
- `/contact` — Secure Release Program / custom engagements

Hosted approval:

- `/approve/ra-ai-001` — AI Action Gate decision
- `/approve/ra-acc-001` — Access Accept decision
- `/approve/ra-vul-001` — Vulnerability Accept decision
- `/approve/ra-kev-001` — KEV Exposure Review decision
- `/approve/ra-rel-001` — Secure Release Gate decision
- `/approve/ra-dev-001` — Device Accept decision
- `/approve/ra-evd-001` — Evidence Desk executive register

## Core data model

Every module produces the same `RiskRecord` shape. See `lib/types.ts` and
`prisma/schema.prisma`:

- Identity: `id`, `organizationId`, `createdById`, `updatedById`, `createdAt`, `updatedAt`
- Classification: `module`, `riskLevel`, `riskScore`, `frameworkTags`
- Narrative: `title`, `description`, `compensatingControls`, `evidenceSummary`, `businessJustification`, `technicalContext`
- Source: `sourceSystem`, `sourceType`, `sourceReferences`
- Lifecycle: `status`, `dueDate`, `expirationDate`, `reviewDate`
- Decision: `decision`, `decisionBy`, `decisionAt`, `decisionNote`
- Audit: `auditTimeline` (human-readable) + organization-scoped `AuditLog` entries

`AuditLog` (`src/server/auditLogs.ts`) is append-only by application convention.
The schema enforces foreign keys but the service module never mutates or deletes
existing entries.

## API surface

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/risk-records` | List records for the caller's org (filter by `?module=`, `?status=`) |
| `POST` | `/api/risk-records` | Create a record (Zod-validated, audit logged) |
| `GET` | `/api/risk-records/[id]` | Fetch one record, organization-scoped |
| `PATCH` | `/api/risk-records/[id]/decision` | Persist a decision with optional note + review date |
| `GET` | `/api/risk-records/export.csv` | Tenant-scoped CSV export |
| `GET`/`POST` | `/api/evidence-packets/[id]/export.pdf` | Stream a real `application/pdf` evidence packet |
| `POST` | `/api/leads` | Persist a service-led lead capture submission |
| `GET` | `/api/demo/risk-flow` | Demo overview JSON for integration smoke tests |

All write endpoints validate input with Zod (`src/lib/validation.ts`),
enforce organization scope (`src/server/auth.ts`), and append an audit log.

## Module-aware decision buttons

The Inbox and hosted approval page automatically relabel the three decision buttons per
module:

| Module | Accept | Reject | Remediate |
| --- | --- | --- | --- |
| AI Action Gate | Approve Action | Reject Action | Require Review |
| Access Accept (default) | Approve Access | Reject Access | Require More Evidence |
| Access Accept (suspicious login) | Accept Login Risk | Reject / Block | Escalate Login |
| Vulnerability Accept (default) | Accept Finding Risk | Reject Acceptance | Require Remediation |
| Vulnerability Accept (release-blocking) | Accept for Release | Block Release | Require Fix |
| Secure Release Gate | Approve Release | Block Release | Require Remediation |
| Device Accept | Approve Device | Reject Device | Require More Evidence |
| Evidence Desk | Mark Reviewed | Request Update | Export Evidence |
| All others | Accept Risk | Reject Risk | Require Remediation |

Clicking a decision button on `/approve/[id]` simulates the state change locally:

- updates the displayed status badge
- appends a new entry to the audit timeline
- shows a confirmation card with the next-step CTA (Evidence Desk for accepted records, Risk Records for rejected, Approval Inbox for remediation)

## Risk Record Creation Wizard

`/dashboard/risk-records/new` is a six-step wizard:

1. Select product module
2. Describe the risk decision
3. Add source system and risk context
4. Assign owner and dates
5. Add compensating controls and evidence summary
6. Review and create record

Pass `?module=ai_action_gate` (or any of `access_accept`, `vulnerability_accept`,
`kev_exposure_review`, `secure_release_gate`, `device_accept`, `evidence_desk`) to
preselect the module and skip step 1. This is how every product marketing page's
secondary CTA is wired.

## Service-led CTAs

| CTA | Route |
| --- | --- |
| Homepage primary | `/book-risk-review` |
| 48-Hour Risk Acceptance Pack | `/book-risk-review` |
| TrustAccept Pilot | `/start-pilot` |
| Managed Evidence Desk | `/request-evidence-desk` |
| Secure Release Program | `/contact` |
| Product page primary | `/book-risk-review` |
| Product page secondary | `/dashboard/risk-records/new?module=<module>` |

Wired through `lib/cta.ts`; see `tests/cta.test.ts` for the contract.

## Tests

```bash
npm run test
```

Covers:

- `lib/module-query.ts` — `?module=...` parsing across underscore, hyphen, mixed case, and array inputs
- `lib/decision.ts` — pure decision state transitions, audit timeline append, immutability, next-step CTA mapping
- `lib/evidence.ts` — evidence packet summary, executive summary generation, language guardrails
- `lib/cta.ts` — CTA → route map including module-prefilled product secondary CTA
- `src/lib/validation.ts` — Zod schemas for risk record create, decision input, lead capture, evidence export
- `src/server/auth.ts` — organization-aware access helper (forbidden errors for cross-tenant or missing records)
- `src/server/riskRecords.ts` — `createRiskRecord` + `updateRiskRecordDecision` persistence, audit-log append, status filters
- `src/server/auditLogs.ts` — append-only behavior
- `src/server/evidencePackets.ts` — packet summary, audit emission, PDF buffer starts with `%PDF-`
- `src/server/leads.ts` — lead persistence + mock notification dispatch
- `src/server/csv.ts` — CSV escaping (RFC 4180), stable headers across all seven modules

## Language guardrails

TrustAccept-facing copy uses:

- NIST-aligned
- CISA KEV-aware
- Designed to support audit evidence
- Framework-informed
- Evidence-ready

We **do not** use:

- NIST certified
- CISA approved
- Guaranteed compliant
- Eliminates risk
- Auditor approved

## Brand architecture

TrustAccept is a Lumens Technology product. Approval delivery and identity workflow
support powered by SequenceNow.
