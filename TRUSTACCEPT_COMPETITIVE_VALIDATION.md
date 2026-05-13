# TrustAccept Competitive Validation

## Summary

The current TrustAccept direction is valid, but the site must be narrowed from generic “high-risk workflow approvals” into cybersecurity-specific risk acceptance and approval evidence.

## Why the Current Direction Is Partly Right

The current message, “Accept or reject risky actions before they happen,” is strong because cybersecurity buyers understand the pain of risky actions happening too fast:
- AI agents acting autonomously.
- Admin privilege escalation.
- API key creation.
- Vulnerability exceptions.
- Secure releases with known issues.
- Unknown devices attempting network access.

The weakness is that the current examples include refunds, marketplace seller onboarding, payouts, and document review. Those examples pull the product into fintech/fraud/KYC/workflow territory.

## Competitor Landscape Checked

### 1. Compliance Automation / Trust Management

Examples:
- Vanta
- Drata
- Secureframe
- Sprinto

Observation:
These companies are broad compliance, trust, and GRC platforms. They automate evidence collection, security monitoring, compliance frameworks, internal risk, third-party risk, and audit readiness.

TrustAccept should not compete directly here.

Recommended position:
TrustAccept is not the compliance platform. TrustAccept is the decision/evidence record for a specific risky action or exception.

### 2. Security Automation / SOAR / Workflow

Examples:
- Tines
- Torq
- BlinkOps

Observation:
These tools automate security operations workflows and integrate many systems. They are powerful but broad and often aimed at security teams building automations.

TrustAccept should not sell itself as a SOAR platform.

Recommended position:
TrustAccept is the focused approval and risk acceptance record. It can integrate with SOAR later, but it should not be a SOAR clone.

### 3. Vulnerability Management / AppSec

Examples:
- Fortify
- Rapid7
- Snyk
- Tenable
- Wiz
- Semgrep
- GitHub Advanced Security
- ArmorCode

Observation:
These tools find, prioritize, and manage vulnerabilities. Some already support exceptions, but many organizations still need business-friendly records that answer:
- Who accepted the risk?
- Why?
- Until when?
- What compensating controls exist?
- What evidence can be shown to a customer, auditor, or executive?

Recommended position:
TrustAccept sits after scanners and before business signoff.

### 4. Identity / Access / Privileged Access

Examples:
- Auth0
- Okta
- Microsoft Entra
- StrongDM
- Apono
- CyberArk
- BeyondTrust

Observation:
Identity vendors are moving toward AI-agent identity, authorization, token vaults, async authorization, and privileged access workflows.

Recommended position:
TrustAccept should not replace identity platforms. It should provide approval records and acceptance evidence around high-risk identity and access events.

### 5. AI Security / Guardrails

Examples:
- Auth0 for AI Agents
- Okta for AI Agents
- Pangea AI Guard
- OWASP LLM / Agentic AI guidance

Observation:
The AI-agent security category is active and new. Vendors are focusing on identity, token management, guardrails, prompt/data filtering, and agent governance.

Recommended position:
TrustAccept should be the human approval and evidence layer for high-risk agent actions, especially when the agent wants to perform sensitive operations.

## Market Gap

The open wedge is not “general approvals.” The open wedge is:

Who accepted this cyber/AI risk, why, based on what evidence, and when does that acceptance expire?

## Recommended Category

Cyber Risk Acceptance Desk

## Recommended Product Family

1. AI Action Gate
2. Access Accept
3. Vulnerability Accept
4. CISA KEV Review
5. Secure Release Gate
6. Device Accept
7. Evidence Desk

## Strategic Conclusion

Validated with modifications:
- Keep “accept/reject before risky action happens.”
- Narrow to cybersecurity and AI risk.
- Remove fintech/marketplace/KYC examples.
- Increase pricing.
- Add productized service packages.
- Use SequenceNow as delivery rail, not as the main product.
