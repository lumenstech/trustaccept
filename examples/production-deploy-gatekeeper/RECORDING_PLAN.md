# RECORDING_PLAN.md — 90-second TrustAccept production-deploy demo

Shot-by-shot script for the IBM submission demo recording. **No video was captured in this environment**; this document is the storyboard so anyone with a screen recorder can reproduce the recording in ~90 seconds.

Recording tool: any (Loom, QuickTime, OBS). Target resolution: 1920×1080 or 1280×720.

## Setup before recording

1. `mkdir .demo-keys && openssl …` per README to create key pair.
2. `TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM=$(cat .demo-keys/private.pem) npm run dev` in terminal 1. Wait for "ready".
3. Open browser tab to `about:blank`.
4. Open terminal 2, full screen, with a dark theme.
5. Have `examples/production-deploy-gatekeeper/index.mjs` open in a side window if you want to flash the source briefly.

## Recording

| Time | Visual | Voiceover (≤ 16 words / shot) |
|------|--------|--------------------------------|
| 0:00–0:05 | Terminal 2, prompt at `examples/production-deploy-gatekeeper/`. Title overlay: **"TrustAccept — agent → human → receipt"** | "An AI agent wants to deploy to production. Watch what happens." |
| 0:05–0:15 | Type `node index.mjs`, press enter. Lines 1–3 stream: request submitted, policy id, action hash prefix, approval URL. | "The agent calls `request_approval`. Policy says: production deploys need a human." |
| 0:15–0:25 | Switch to browser. Paste the approval URL. Page loads, scroll past the policy panel: risk badge HIGH, policy id, action hash `sha256:da72…`. | "TrustAccept renders the policy reason and the exact action hash to the approver." |
| 0:25–0:40 | Click **Accept** on the approval page. Brief success state. Switch back to terminal 2. Polling line updates to `status=accepted`. | "Approver clicks Accept. The agent's poll picks up the decision." |
| 0:40–0:55 | Terminal: `[4/6] Decision … decided_by=Alex Greene`, then `[5/6] Signed receipt (JWT, RS256):` followed by the wrapped JWT. | "The agent receives a signed receipt JWT bound to that exact action hash." |
| 0:55–1:15 | Terminal: `[6/6] Verifying receipt EXTERNALLY` then `VERIFIED` and the indented claims block. Highlight `decided_by`, `action_hash`, `decision_actor_type`. | "And here is the proof: an external verifier reads only the JWT and a public key. No TrustAccept calls." |
| 1:15–1:25 | Terminal: ✅ release-bot would now run: kubectl rollout deploy … | "Now — and only now — the agent executes the deploy. The receipt is audit-grade evidence." |
| 1:25–1:30 | Closing title card: **TrustAccept — MCP-native policy, approval, and signed receipts for AI-agent actions.** | "TrustAccept. The human checkpoint AI agents need." |

## Things to highlight visually (optional second-pass edit)

- Outline the `action_hash` prefix in the approval page panel and the `action_hash` line in the verify output to show they match.
- Outline `decided_by: Alex Greene` in the verify output to show it matches the approver's display name.
- Outline the absence of any HTTP request from `verify.mjs` to TrustAccept in a network-tab capture (post-edit overlay).

## What to AVOID showing

- Don't show `TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM` content. Demo keys are throwaway, but the visual habit matters.
- Don't show database internals — the whole point is that the receipt stands alone.
- Don't show the MCP server stdio handshake in this recording. The agent-side experience is request_approval; how MCP transports that is a separate (Block 3) story.

## Backup take

If the human approval click is slow to fire and the polling loop wraps the terminal awkwardly, paste the recorded run from `examples/production-deploy-gatekeeper/SAMPLE_RUN.md` (committed alongside) as a static reference and edit the audio over the static text.
