import { describe, expect, it } from "vitest";
import {
  RISK_RECORDS_CSV_HEADERS,
  buildRiskRecordsCsv,
  escapeCsvValue,
  riskRecordToCsvRow,
} from "@/src/server/csv";
import { SEED_RECORDS } from "@/lib/seed-data";

describe("escapeCsvValue", () => {
  it("returns plain values untouched", () => {
    expect(escapeCsvValue("hello")).toBe("hello");
    expect(escapeCsvValue(42)).toBe("42");
  });

  it("quotes values containing commas, quotes, or newlines and doubles inner quotes", () => {
    expect(escapeCsvValue("a, b")).toBe('"a, b"');
    expect(escapeCsvValue('She said "no"')).toBe('"She said ""no"""');
    expect(escapeCsvValue("line1\nline2")).toBe('"line1\nline2"');
  });

  it("quotes empty strings to preserve column positions", () => {
    expect(escapeCsvValue("")).toBe('""');
  });

  it("handles null and undefined", () => {
    expect(escapeCsvValue(null)).toBe("");
    expect(escapeCsvValue(undefined)).toBe("");
  });

  it("joins arrays with semicolons", () => {
    expect(escapeCsvValue(["a", "b", "c"])).toBe("a; b; c");
  });
});

describe("riskRecordToCsvRow", () => {
  it("includes module names, framework tags, and dates", () => {
    const record = SEED_RECORDS.find((r) => r.id === "ra-ai-001")!;
    const row = riskRecordToCsvRow(record);
    expect(row[0]).toBe("ra-ai-001");
    expect(row[1]).toBe("AI Action Gate");
    expect(row[5]).toBe("high");
    expect(row[16]).toContain("NIST AI RMF GOVERN 1.3");
  });
});

describe("buildRiskRecordsCsv", () => {
  it("emits a stable header row and a row per record", () => {
    const csv = buildRiskRecordsCsv(SEED_RECORDS);
    const lines = csv.trimEnd().split("\r\n");
    expect(lines.length).toBe(SEED_RECORDS.length + 1);
    const headers = lines[0].split(",");
    expect(headers).toEqual([...RISK_RECORDS_CSV_HEADERS]);
  });

  it("emits a header-only CSV when there are no records", () => {
    expect(buildRiskRecordsCsv([])).toBe(RISK_RECORDS_CSV_HEADERS.join(",") + "\r\n");
  });

  it("escapes values that contain commas or quotes", () => {
    const csv = buildRiskRecordsCsv([
      {
        ...SEED_RECORDS[0],
        title: 'A risky decision, "with quotes"',
      },
    ]);
    expect(csv).toContain('"A risky decision, ""with quotes"""');
  });
});
