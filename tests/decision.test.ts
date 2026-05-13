import { describe, expect, it } from "vitest";
import { applyDecision, nextStepFor, statusToneFor } from "@/lib/decision";
import { SEED_RECORDS } from "@/lib/seed-data";

const pendingRecord = SEED_RECORDS.find((r) => r.id === "ra-ai-001")!;

describe("applyDecision", () => {
  it("flips status to accepted and appends a timeline entry", () => {
    const next = applyDecision(pendingRecord, "accept", {
      actor: "Alex Greene",
      occurredAt: "2026-05-13T10:00:00Z",
    });

    expect(next.status).toBe("accepted");
    expect(next.decision).toBe("accept");
    expect(next.decisionBy).toBe("Alex Greene");
    expect(next.decisionAt).toBe("2026-05-13T10:00:00Z");
    expect(next.auditTimeline.length).toBe(pendingRecord.auditTimeline.length + 1);
    expect(next.auditTimeline.at(-1)).toMatchObject({
      actor: "Alex Greene",
      action: "decided.accept",
    });
  });

  it("flips status to rejected and records the decision", () => {
    const next = applyDecision(pendingRecord, "reject", { actor: "Alex Greene" });
    expect(next.status).toBe("rejected");
    expect(next.decision).toBe("reject");
  });

  it("flips status to remediation_required for remediate", () => {
    const next = applyDecision(pendingRecord, "remediate", { actor: "Alex Greene" });
    expect(next.status).toBe("remediation_required");
    expect(next.decision).toBe("remediate");
  });

  it("does not mutate the original record", () => {
    const before = pendingRecord.auditTimeline.length;
    applyDecision(pendingRecord, "accept", { actor: "Alex Greene" });
    expect(pendingRecord.auditTimeline.length).toBe(before);
    expect(pendingRecord.status).toBe("pending");
  });
});

describe("statusToneFor", () => {
  it("maps each status to a badge tone", () => {
    expect(statusToneFor("pending")).toBe("amber");
    expect(statusToneFor("accepted")).toBe("success");
    expect(statusToneFor("rejected")).toBe("danger");
    expect(statusToneFor("remediation_required")).toBe("info");
    expect(statusToneFor("expired")).toBe("neutral");
  });
});

describe("nextStepFor", () => {
  it("sends accepted records to the evidence packet", () => {
    expect(nextStepFor("accept", "ra-ai-001").href).toBe(
      "/dashboard/risk-records/ra-ai-001/evidence",
    );
  });

  it("sends rejected records to risk records", () => {
    expect(nextStepFor("reject", "ra-ai-001").href).toBe("/dashboard/risk-records");
  });

  it("sends remediation records to the inbox", () => {
    expect(nextStepFor("remediate", "ra-ai-001").href).toBe("/dashboard/inbox");
  });
});
