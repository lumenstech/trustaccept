# TrustAccept for Slack

**Approve risky AI-agent actions directly in Slack before they happen.**

When an AI agent, identity system, payment platform, or internal workflow
attempts a sensitive action, TrustAccept sends a structured approval request
to Slack with the risk level, evidence, source system, and decision options.
Your team can approve, reject, or escalate without leaving Slack while
TrustAccept records the full audit trail.

> Slack is where the decision happens. TrustAccept makes it auditable.
> Give AI agents a workflow, not a blank check.

---

## How it works

```
External system / AI agent
  → POST /api/decisions  (x-trustaccept-secret)
    → TrustAccept persists a pending DecisionRequest + audit event
      → chat.postMessage delivers an approval card to Slack
        → A reviewer clicks Approve / Reject / Escalate
          → POST /api/integrations/slack/interactions
            → TrustAccept updates status, writes audit, edits the message
              → (optional) downstream webhook returns the result
```

Slack is the approval inbox. TrustAccept is the system of record.

---

## Setup

### 1. Create a Slack app

1. Open https://api.slack.com/apps → **Create New App** → *From scratch*.
2. **OAuth & Permissions → Bot Token Scopes**:
   - `chat:write`
   - `commands`
   - `incoming-webhook`
   - `users:read`
   - `channels:read`
3. **OAuth & Permissions → Redirect URLs**, add:
   `https://YOUR-HOST/api/integrations/slack/oauth/callback`
4. **Interactivity & Shortcuts → Interactivity = On**. Request URL:
   `https://YOUR-HOST/api/integrations/slack/interactions`
5. **Basic Information** → copy Client ID, Client Secret, Signing Secret.

### 2. Configure environment variables

```
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_SIGNING_SECRET=...
SLACK_BOT_TOKEN=                              # optional; populated per-install
SLACK_REDIRECT_URI=https://YOUR-HOST/api/integrations/slack/oauth/callback

TRUSTACCEPT_APP_URL=https://YOUR-HOST         # used in Slack card links
TRUSTACCEPT_WEBHOOK_SECRET=$(openssl rand -hex 32)
```

Never commit secrets. Use your platform’s secret manager.

### 3. Install in a workspace

Hit `GET /api/integrations/slack/install` from a browser while signed into
the TrustAccept dashboard, or click **Install in Slack** from
`/dashboard/integrations`. The OAuth callback stores the bot token in the
TrustAccept workspace record.

---

## API surface

### `POST /api/decisions`

Required header: `x-trustaccept-secret: $TRUSTACCEPT_WEBHOOK_SECRET`.

```json
{
  "source": "stripe_agent",
  "action_type": "refund_customer",
  "title": "Approve customer refund",
  "description": "AI agent wants to refund customer $3,750.",
  "risk_level": "high",
  "requester": "agent@company.com",
  "subject": "cus_123",
  "amount": 3750,
  "currency": "USD",
  "evidence_url": "https://example.com/evidence",
  "metadata": { "reason": "Refund exceeds auto-approval threshold" },
  "slack_team_id": "T123",
  "approval_channel_id": "C123"
}
```

Response:

```json
{ "decision_id": "td-...", "status": "pending", "slack_message_sent": true }
```

If `slack_team_id` / `approval_channel_id` are omitted, TrustAccept will
route to the first installed workspace and its default channel and record
`slack.post_skipped` in the audit trail if nothing is connected yet.

### `POST /api/integrations/slack/interactions`

Slack’s Interactivity request URL. Verifies `x-slack-signature` /
`x-slack-request-timestamp` against `SLACK_SIGNING_SECRET`. Handles:

- `trustaccept_approve` – finalizes the decision to **approved**.
- `trustaccept_reject` – opens a reason modal; submission finalizes to **rejected**.
- `trustaccept_escalate` – keeps status pending, writes `decision.escalated`.
- `trustaccept_open_evidence` – link-out button, no server-side action.

Double-decision attempts are rejected and surfaced to the user as an
ephemeral Slack notification.

### `GET /api/integrations/slack/install`

Starts OAuth. Issues a signed state cookie and redirects to Slack.

### `GET /api/integrations/slack/oauth/callback`

Exchanges the code, upserts the `SlackInstallation`, and redirects back
to `/dashboard/integrations?slack=connected`.

---

## Local development

1. Copy `.env.example` to `.env` and fill in Slack + webhook secrets.
2. Run a local tunnel so Slack can reach your dev server, e.g.
   `cloudflared tunnel --url http://localhost:3000` or `ngrok http 3000`.
3. Use the tunnel URL for Slack redirect + interactivity URLs.
4. `npm install && npm run dev`.
5. From the dashboard go to **Integrations → Install in Slack**, complete OAuth.
6. From the dashboard, click **Send demo Slack approval** (or run the script):

   ```bash
   TRUSTACCEPT_WEBHOOK_SECRET=... TRUSTACCEPT_APP_URL=http://localhost:3000 \
     npx tsx scripts/create-slack-demo-decision.ts \
     --slack-team-id T123 --approval-channel-id C123
   ```

---

## Production deployment checklist

- [ ] HTTPS only. Slack will not deliver to plain HTTP endpoints.
- [ ] All Slack secrets in the platform secret manager, never in the repo.
- [ ] `TRUSTACCEPT_WEBHOOK_SECRET` generated with `openssl rand -hex 32`
      and rotated on a documented cadence.
- [ ] Encrypt the `slackBotToken` column at rest (KMS-wrapped). The MVP
      stores it verbatim — wire `Workspace.slackBotToken` through your
      KMS before going live.
- [ ] Lock down `GET /api/integrations/slack/install` behind dashboard auth.
- [ ] Add a TTL/expiry job for pending decisions (status → `expired`).
- [ ] Forward audit events to your SIEM.
- [ ] Verify Slack request timestamps stay within the 5-minute tolerance.

---

## Security notes

1. Every Slack callback is verified with HMAC-SHA256 against
   `SLACK_SIGNING_SECRET` (`src/server/slack/verify.ts`). Requests with a
   missing or stale timestamp, malformed signature, or signature mismatch
   are rejected with HTTP 401 *before* any payload parsing.
2. Slack bot tokens are never exposed to the client. They are only read
   inside server-only modules under `src/server/slack/*`.
3. `/api/decisions` is gated by `x-trustaccept-secret`. If
   `TRUSTACCEPT_WEBHOOK_SECRET` is not set, the route responds with HTTP 503
   instead of accepting writes (fail-closed).
4. The store layer prevents double decisions: once `status` is in a
   terminal state, the Slack handler responds with an ephemeral notice
   and writes no further audit events.
5. The `DecisionAuditEvent` collection is append-only by convention. No
   service-layer code path mutates or deletes entries.
6. Outgoing chat.postMessage calls use the per-workspace bot token, not
   a global token. Least-privilege scopes are requested.
7. Slack remains the approval UI. TrustAccept owns persistence,
   audit, and downstream notifications.

---

## Test / demo

- `npm test` runs Vitest. Slack signature, decision validation, state
  transitions, and double-approval prevention are covered under
  `tests/slack-verify.test.ts`, `tests/decisions.test.ts`, and
  `tests/decision-validation.test.ts`.
- The **Send demo Slack approval** button on `/dashboard/integrations`
  and `/dashboard/decisions` posts the canonical "refund customer
  $3,750" demo. It uses the first connected workspace.
- `scripts/create-slack-demo-decision.ts` does the same via the HTTP API.

---

## Known limitations / TODOs

- The in-memory store is the runtime backend; the Prisma schema is in
  place but not wired to a Prisma client. Swap `src/server/store.ts` for
  a Prisma-backed implementation when moving to production persistence.
- Expiry sweeping is not implemented. Add a cron job that flips stale
  pending decisions to `expired` and writes a `decision.expired` audit.
- Outbound webhooks (notifying the originating system on decision)
  are stubbed — wire your downstream system in `recordSlackDecision`.
- The install route currently allows demo-auth sessions. Production should
  require an authenticated TrustAccept admin.
