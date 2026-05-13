# TrustAccept Website Update Prompt

Use this prompt in Replit, Bolt, Claude Code, or another website builder.

```text
Update trustaccept.com from a generic high-risk workflow approval product into a cybersecurity and AI risk acceptance platform.

Keep the dark, modern, secure visual style. Preserve the clean mobile-first design and API-demo feel, but sharpen the positioning so the site clearly feels like a cybersecurity product.

Core positioning:
TrustAccept is cyber risk acceptance and approval infrastructure for AI agents, identity events, vulnerability exceptions, CISA KEV exposure, secure software releases, and device access.

Brand architecture:
- TrustAccept is the cyber decision and evidence layer.
- SequenceNow is the approval delivery and identity workflow rail.
- Use this phrase: “Approval delivery powered by SequenceNow.”
- Do not claim official Auth0, Okta, CISA, NIST, or government certification.
- Use careful language only: “NIST-aligned,” “CISA KEV-aware,” “designed to support audit evidence,” “framework-informed.”

Replace the hero with:

Headline:
Accept or reject cyber risk before it becomes an incident.

Subheadline:
TrustAccept gives teams a defensible approval record for high-risk AI-agent actions, identity events, vulnerability exceptions, CISA KEV exposure, secure software releases, and device access.

Primary CTA:
Book a Risk Acceptance Review

Secondary CTA:
View API Demo

Small line below CTA:
Approval delivery powered by SequenceNow.

Remove or de-emphasize fintech/marketplace examples:
- AI Refund Request
- Marketplace Seller Onboarding
- Payment Payout
- Document Acceptance
- KYC document verification
- Generic marketplace trust language

Replace the live decision feed with cybersecurity examples:
- AI Agent Data Export — Manual Review
- Admin Role Escalation — Escalated
- Fortify Critical Finding — Exception Requested
- API Key Creation — Manual Review
- Unknown Device Join Request — Held
- CISA KEV Exposure — Remediate
- MFA Recovery Request — Manual Review
- Production Deployment Exception — Escalated

Update the “Automation outpaces governance” section:

Headline:
Cyber and AI actions now move faster than approval processes.

Body:
AI agents, API keys, admin escalation, vulnerability exceptions, and secure software releases can happen before anyone has created a defensible record. TrustAccept gives teams a structured way to accept, reject, escalate, and document high-risk decisions with owner, reason, evidence, compensating controls, and expiration date.

Update “How it works”:

1. Risky action is submitted
Your app, identity platform, scanner, or security workflow sends TrustAccept an action, finding, or exception request.

2. TrustAccept evaluates policy
Clear actions are accepted or rejected. High-risk or ambiguous actions are routed for human approval with context and evidence.

3. Decision is recorded
TrustAccept sends the decision back by webhook and creates a signed evidence record showing who decided, why, when, and when the decision expires.

Keep the API section but update the examples.

API example 1: AI agent action
{
  "actor": "agent_support_01",
  "action": "delete_customer_record",
  "system": "crm",
  "risk_signals": {
    "data_classification": "customer_pii",
    "agent_confidence": 0.71,
    "action_reversibility": "low",
    "customer_impact": "high"
  }
}

API response:
{
  "id": "dec_8h2m",
  "decision": "manual_review",
  "risk_score": 86,
  "required_action": "human_approval",
  "status": "pending",
  "approver_group": "security_admins"
}

API example 2: identity event
{
  "actor": "usr_admin_19",
  "action": "api_key_create",
  "scope_requested": "production_write",
  "risk_signals": {
    "new_device": true,
    "privilege_level": "high",
    "mfa_recent": false
  }
}

API example 3: vulnerability exception
{
  "source": "fortify",
  "finding_id": "FND-10492",
  "severity": "critical",
  "action": "request_exception",
  "release": "2026.05.1",
  "risk_signals": {
    "internet_facing": true,
    "customer_deadline": true,
    "compensating_control_present": true
  }
}

Replace “Built for critical workflows” with:

Headline:
Built for high-risk cyber decisions

Product cards:

1. AI Action Gate
Approve or reject autonomous AI actions before agents touch sensitive systems, data, APIs, or customer records.

2. Access Accept
Add approval records to admin escalation, API key creation, MFA recovery, break-glass access, and suspicious login events across identity systems.

3. Vulnerability Accept
Convert Fortify, SAST, SCA, GitHub, cloud scanner, and pen test findings into accept/reject/remediate decisions with owners and expiration dates.

4. CISA KEV Review
Prioritize known exploited vulnerabilities and document exposure decisions with compensating controls and review dates.

5. Secure Release Gate
Create go/no-go approval records before risky software releases ship to production.

6. Device Accept
Approve new IoT, edge, camera, contractor, or operational devices before they join sensitive networks.

7. Evidence Desk
Managed monthly risk registers, decision logs, approval evidence, and executive-ready summaries.

Add product pages:
- /ai-action-gate
- /access-accept
- /vulnerability-acceptance
- /cisa-kev-review
- /secure-release-gate
- /device-accept
- /evidence-desk
- /pricing
- /security
- /docs

Replace pricing with service-led offers:

1. Risk Record — $750 one-time
For one high-risk decision.
Includes:
- 1 risk decision record
- Accept/reject/remediate recommendation
- Evidence PDF
- Owner + expiration date
- Compensating controls

2. 48-Hour Risk Acceptance Pack — $1,500 one-time
For up to 10 findings or one workflow.
Includes:
- Risk register
- Approval matrix
- Evidence packet
- Executive summary
- NIST/CISA-aligned language

3. TrustAccept Pilot — $2,500 to $5,000
For one workflow integration.
Includes:
- Approval schema
- Webhook demo
- SequenceNow approval delivery
- 30-day pilot
- Evidence export

4. Managed Evidence Desk — from $999/month
Includes:
- Up to 10 decision records/month
- Monthly register
- Review dates
- CISA KEV tracking
- Secure release approvals
- AI-agent approval logs

5. Secure Release Program — from $3,500/month
Includes:
- Fortify/SAST triage
- Release approval records
- Exception tracking
- Executive reporting
- CI/CD risk acceptance workflow

Add clarification section:

Headline:
Not another scanner. Not another GRC suite.

Body:
TrustAccept does not replace Auth0, Okta, Entra, Fortify, Snyk, Wiz, Tenable, GitHub, or your existing security tools. It creates the approval, acceptance, and evidence layer around high-risk decisions those systems expose.

Add framework section:

Headline:
Designed around modern cyber risk governance.

Body:
TrustAccept workflows are designed to support NIST CSF 2.0 risk governance, NIST SSDF secure development practices, CISA KEV-aware vulnerability prioritization, and OWASP LLM / Agentic AI risk review. TrustAccept does not claim NIST, CISA, OWASP, Auth0, or Okta certification.

Add FAQ:
- Is TrustAccept a scanner?
No. TrustAccept does not scan code, cloud, networks, or endpoints. It documents and routes decisions around risky findings and actions.

- Is TrustAccept a GRC platform?
No. TrustAccept is a focused risk decision and evidence layer. It can support GRC programs but does not replace a full GRC platform.

- Is TrustAccept NIST or CISA certified?
No. TrustAccept uses NIST-aligned and CISA KEV-aware workflows but does not claim government certification.

- Does TrustAccept replace Auth0 or Okta?
No. It works beside identity platforms and can use SequenceNow for approval delivery.

- What does SequenceNow do?
SequenceNow powers approval delivery through WhatsApp, SMS, email, and identity workflow channels.

- Can customers start before API integration?
Yes. Customers can start with a 48-Hour Risk Acceptance Pack and move into API or workflow integration later.

SEO metadata:
Title:
TrustAccept | Cyber Risk Acceptance for AI Agents, Identity, and Secure Releases

Meta description:
TrustAccept helps teams accept, reject, escalate, and document high-risk cyber and AI decisions, including AI-agent actions, identity events, vulnerability exceptions, CISA KEV exposure, and secure software releases.

Design:
- Dark cybersecurity SaaS theme
- Strong mobile layout
- Blue/white/black/gray palette
- Clean product cards
- Technical API blocks
- Visual decision feed
- No cartoon graphics
- Use shield, lock, audit trail, approval, and workflow icons
- Make the site feel enterprise-ready, not generic workflow software
```
