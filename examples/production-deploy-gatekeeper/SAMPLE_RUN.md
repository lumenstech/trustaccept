# SAMPLE_RUN.md — captured end-to-end run

This is a verbatim transcript captured against a local Next.js dev server. Use this as a static backup for the screen recording if the live take is awkward (see RECORDING_PLAN.md).

```
$ node examples/production-deploy-gatekeeper/index.mjs
[1/6] release-bot requesting approval for production_deploy …
      policy → production-deploys-require-human-approval (risk high, action_hash sha256:02556632e9e24cce…)
      request id: ra-mpezxco3-1

[2/6] Human approver: open the approval page in a browser:
      http://localhost:3000/approve/ra-mpezxco3-1
      Click "Accept" to continue.

[3/6] Polling get_approval_status every 3s for up to 5 minutes …
      status=pending      status=accepted
[4/6] Decision: status=accepted, decided_by=Alex Greene

[5/6] Signed receipt (JWT, RS256):
      eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRydXN0YWNjZXB0LXJlY2VpcHQtcnMyNTYtMSJ9.eyJhcHByb3ZhbF9pZCI6InJhLW1wZXp4Y28zLTEiLCJhZ2VudCI6InJlbGVhc2UtYm90IiwiYWN0aW9uX2hhc2giOiJzaGEyNTY6MDI1NTY2MzJlOWUyNGNjZWVjZGJhODJlNDgyMDUwM2NiM2E4MWI0NGE4NGJjYjg1MzE1NWQxNDIyOTIzZDRkNCIsInBvbGljeV9pZCI6InByb2R1Y3Rpb24tZGVwbG95cy1yZXF1aXJlLWh1bWFuLWFwcHJvdmFsIiwic3RhdHVzIjoiYXBwcm92ZWQiLCJkZWNpZGVkX2J5IjoiQWxleCBHcmVlbmUiLCJkZWNpc2lvbl9hY3Rvcl90eXBlIjoiaHVtYW4iLCJkZWNpZGVkX2F0IjoiMjAyNi0wNS0yMVQwNDozNDowMS45MTFaIiwiZXhwaXJlc19hdCI6IjIwMjYtMDUtMjFUMDQ6NDM6NTcuNjAzWiIsInRlbmFudF9pZCI6ImRlbW8tb3JnIiwiYXVkaXRfbG9nX3JlZiI6InJhLW1wZXp4Y28zLTE6MjAyNi0wNS0yMVQwNDozNDowMS45MTFaIiwiaXNzIjoidHJ1c3RhY2NlcHQiLCJpYXQiOjE3NzkzMzgwNDR9.JBhCEmEqomOTGYrO8HPa9J83GZs8OcMzRp4f6nQMy5CJqXwesI9dyk0G7SqTKZ8LVA_0HocKNC4a8w85BXE5FrmqJiWt105CLD9mi4znB7XesgSK3BEVVBUrsVZ3ydoGCsh7TKBc7P40KEXTLnxlADG61mCB6tgHlMmh05rErxvlqFogHntDhSF0O3kD_d_tobLOHJA65NMzV6ENAje_fyhFWpNbKcwVp5bS2UGBjRbuPxLqpDdMvtLVoRIqfVGJPL81ogZtd9QUPvJbj0-O8BNUvr_hnqJzYmxKPzyYsmggvzp814YKLOiagFxbMe7-LJe9H2XpD4yFo3mTTj8yvA

[6/6] Verifying receipt EXTERNALLY (no TrustAccept calls) …
VERIFIED
  approval_id:         ra-mpezxco3-1
  action_hash:         sha256:02556632e9e24cceecdba82e4820503cb3a81b44a84bcb853155d1422923d4d4
  policy_id:           production-deploys-require-human-approval
  status:              approved
  decided_by:          Alex Greene
  decision_actor_type: human
  decided_at:          2026-05-21T04:34:01.911Z
  expires_at:          2026-05-21T04:43:57.603Z
  tenant_id:           demo-org
  audit_log_ref:       ra-mpezxco3-1:2026-05-21T04:34:01.911Z
  iss:                 trustaccept
  kid:                 trustaccept-receipt-rs256-1

✅ release-bot would now run: kubectl rollout deploy …
   The receipt JWT above is the audit-grade proof that a named human approved this exact action payload.
```

Decoded JWT payload (for reference; the JWT above is the canonical artifact):

```json
{
  "approval_id": "ra-mpezxco3-1",
  "agent": "release-bot",
  "action_hash": "sha256:02556632e9e24cceecdba82e4820503cb3a81b44a84bcb853155d1422923d4d4",
  "policy_id": "production-deploys-require-human-approval",
  "status": "approved",
  "decided_by": "Alex Greene",
  "decision_actor_type": "human",
  "decided_at": "2026-05-21T04:34:01.911Z",
  "expires_at": "2026-05-21T04:43:57.603Z",
  "tenant_id": "demo-org",
  "audit_log_ref": "ra-mpezxco3-1:2026-05-21T04:34:01.911Z",
  "iss": "trustaccept",
  "iat": 1779338044
}
```

Note: this run used a throwaway demo key pair generated via `openssl genpkey`. Public-key path passed to `verify.mjs` was `.demo-keys/public.pem` (gitignored).
