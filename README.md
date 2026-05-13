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
- Prisma + PostgreSQL-compatible schema
- Seed data for all seven modules
- Mock authentication (production auth is delivered via SequenceNow)

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
    product-modules/           # Seven product modules
    evidence-desk/             # Evidence Desk
    integrations/              # Connected systems
    settings/                  # Workspace settings
  approve/[id]/                # Hosted approval page for a single Risk Record
components/
  ui/                          # Button, Card, Badge, Section primitives
  site/                        # Marketing header, footer, logo, module template
  dashboard/                   # Dashboard shell + header
  risk/                        # Inbox card
lib/
  types.ts                     # RiskRecord type and supporting types
  modules.ts                   # Seven product modules + decision button labels
  seed-data.ts                 # In-memory seed records (used by UI and Prisma seed)
  cn.ts                        # className helper
prisma/
  schema.prisma                # PostgreSQL-compatible schema
  seed.ts                      # Prisma seed script (uses lib/seed-data.ts)
```

## Run locally

```bash
# 1. Install dependencies
npm install

# 2. (optional) Bring up Postgres and seed the database
cp .env.example .env
npm run db:push
npm run db:seed

# 3. Start the dev server
npm run dev
```

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
- `/dashboard/risk-records` — Risk Records table
- `/dashboard/product-modules` — module index
- `/dashboard/evidence-desk` — Evidence Desk
- `/dashboard/integrations` — connected systems
- `/dashboard/settings` — workspace settings

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

- `id`, `module`, `title`, `description`
- `sourceSystem`, `sourceType`
- `riskLevel`, `status`
- `owner`, `department`
- `dueDate`, `expirationDate`, `reviewDate`
- `decision`, `decisionBy`, `decisionAt`
- `compensatingControls`, `evidenceSummary`, `businessJustification`, `technicalContext`
- `frameworkTags`, `sourceReferences`
- `auditTimeline`

## Module-aware decision buttons

The Inbox and hosted approval page automatically relabel the three decision buttons per
module:

| Module | Accept | Reject | Remediate |
| --- | --- | --- | --- |
| AI Action Gate | Approve Action | Reject Action | Require Review |
| Secure Release Gate | Approve Release | Block Release | Require Remediation |
| Device Accept | Approve Device | Reject Device | Require More Evidence |
| All others | Accept Risk | Reject Risk | Require Remediation |

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
