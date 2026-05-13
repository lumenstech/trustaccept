import { describe, expect, it } from "vitest";
import { validateExportForm } from "@/lib/evidence-ui";

describe("evidence export form validation", () => {
  it("requires from, to, and format", () => {
    const r = validateExportForm({ from: "", to: "", format: "" });
    expect(r.ok).toBe(false);
    expect(r.errors.from).toBeDefined();
    expect(r.errors.to).toBeDefined();
    expect(r.errors.format).toBeDefined();
  });

  it("requires YYYY-MM-DD dates", () => {
    const r = validateExportForm({
      from: "2026/05/01",
      to: "2026-05-31",
      format: "json",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.from).toMatch(/YYYY-MM-DD/);
  });

  it("rejects windows that exceed 90 days", () => {
    const r = validateExportForm({
      from: "2026-01-01",
      to: "2026-05-01",
      format: "json",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.to).toMatch(/90 days/);
  });

  it("rejects from > to", () => {
    const r = validateExportForm({
      from: "2026-05-20",
      to: "2026-05-10",
      format: "json",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.to).toMatch(/on or after/);
  });

  it("rejects unknown formats", () => {
    const r = validateExportForm({
      from: "2026-05-01",
      to: "2026-05-13",
      format: "pdf",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.format).toBeDefined();
  });

  it("returns an export href with proper iso timestamps when valid", () => {
    const r = validateExportForm({
      from: "2026-05-01",
      to: "2026-05-13",
      format: "zip",
    });
    expect(r.ok).toBe(true);
    expect(r.href).toContain("/api/v1/decisions/export?");
    expect(r.href).toContain("from=2026-05-01T00%3A00%3A00Z");
    expect(r.href).toContain("to=2026-05-13T23%3A59%3A59Z");
    expect(r.href).toContain("format=zip");
  });

  it("appends agent_id when supplied", () => {
    const r = validateExportForm({
      from: "2026-05-01",
      to: "2026-05-13",
      format: "json",
      agent_id: "11111111-1111-1111-1111-111111111111",
    });
    expect(r.ok).toBe(true);
    expect(r.href).toContain("agent_id=11111111-1111-1111-1111-111111111111");
  });
});
