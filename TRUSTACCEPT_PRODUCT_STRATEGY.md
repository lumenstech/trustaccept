# TrustAccept Product Strategy

## Product Family

### 1. AI Action Gate

Approves, rejects, escalates, or logs high-risk AI-agent actions before execution.

Example actions:
- Delete customer record
- Export sensitive data
- Send external email
- Deploy code
- Change CRM/ERP records
- Create admin user
- Call production API
- Execute payment/refund only when framed as cyber/approval risk, not fintech fraud

Offer:
AI Agent Approval Review — $1,500

Deliverables:
- High-risk agent action inventory
- Approval policy
- Reviewer matrix
- Evidence packet
- Sample API/webhook workflow
- NIST AI RMF / OWASP LLM risk notes

### 2. Access Accept

Approval and evidence records around high-risk identity events.

Example events:
- Admin role escalation
- API key creation
- MFA recovery
- Break-glass access
- New privileged user
- Contractor access
- Suspicious login
- Machine-to-machine credential request

Offer:
Identity Risk Approval Pilot — $2,500 to $5,000

Deliverables:
- Auth0/Okta/Entra event map
- TrustAccept decision schema
- SequenceNow approval delivery
- Admin escalation workflow
- Evidence export

### 3. Vulnerability Accept

Turns vulnerability findings into documented risk decisions.

Inputs:
- Fortify/SAST findings
- SCA/dependency findings
- GitHub security alerts
- Pen test findings
- Cloud misconfigurations
- Critical CVE exceptions

Offer:
Finding Acceptance Pack — $1,500

Deliverables:
- Up to 10 findings reviewed
- Accept/reject/remediate matrix
- Compensating controls
- Expiration/review dates
- Risk memo
- Executive summary
- Evidence PDF

### 4. CISA KEV Review

Prioritizes known exploited vulnerabilities and documents exposure decisions.

Offer:
CISA KEV Exposure Review — $750 to $1,500

Deliverables:
- KEV lookup
- Affected asset notes
- Remediation priority
- Acceptance memo where needed
- 7/14/30-day action plan
- Evidence PDF

### 5. Secure Release Gate

Creates go/no-go approval records before risky software releases.

Example triggers:
- Critical finding still open
- Dependency issue unresolved
- AI-generated code not reviewed
- Emergency release
- Hotfix with incomplete QA
- Customer deadline requiring exception

Offer:
Secure Release Acceptance Pack — $2,500

Deliverables:
- Release risk checklist
- Open findings review
- Go/no-go matrix
- Compensating controls
- Rollback evidence
- Signoff memo
- Executive summary

### 6. Device Accept

Approves or rejects new devices before joining sensitive networks.

Example devices:
- Cameras
- IoT sensors
- Edge gateways
- Contractor laptops
- Building automation devices
- Solar-powered network devices
- OT/industrial equipment

Offer:
Device Acceptance Policy Pack — $1,500 to $3,500

Deliverables:
- Device onboarding policy
- Approval workflow
- Network access checklist
- Risk categories
- Installer/customer handoff form
- Evidence packet

### 7. Evidence Desk

Recurring managed service for monthly decision records and risk acceptance evidence.

Offer:
Managed Evidence Desk — from $999/month

Includes:
- Up to 10 decision records/month
- Monthly risk register
- Review dates
- CISA KEV notes
- Vulnerability acceptance records
- AI-agent approval logs
- Executive-ready summary

## Pricing Strategy

Avoid cheap SaaS pricing as the primary monetization model. Use service-led pricing first.

Recommended pricing:
- Risk Record: $750 one-time
- 48-Hour Risk Acceptance Pack: $1,500 one-time
- TrustAccept Pilot: $2,500 to $5,000
- Managed Evidence Desk: from $999/month
- Secure Release Program: from $3,500/month

## MVP Stack

- Website: Replit, Bolt, Framer, or Webflow
- Intake form: Tally, Typeform, Jotform, or custom form
- Payment: Stripe Checkout
- Scheduling: Calendly
- Risk register: Airtable, Notion, Coda, or Google Sheets
- Evidence storage: Google Drive / OneDrive
- Automation: Zapier / Make
- PDF output: Google Docs template to PDF
- Delivery: Email + SequenceNow for approval routing
