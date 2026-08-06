import { describe, it, expect } from "vitest";
import { fmtUsd, fmtPct, fmtTick } from "../format.js";

describe("fmtUsd", () => {
  it("returns em dash for null/undefined", () => {
    expect(fmtUsd(null)).toBe("—");
    expect(fmtUsd(undefined)).toBe("—");
  });

  it("formats as USD with no decimals", () => {
    expect(fmtUsd(64500)).toBe("$64,500");
    expect(fmtUsd(1000000)).toBe("$1,000,000");
  });

  it("rounds to whole dollars", () => {
    expect(fmtUsd(4.38)).toBe("$4");
    expect(fmtUsd(999.9)).toBe("$1,000");
  });

  it("handles zero", () => {
    expect(fmtUsd(0)).toBe("$0");
  });
});

describe("fmtPct", () => {
  it("returns em dash for null", () => {
    expect(fmtPct(null)).toBe("—");
  });

  it("prefixes non-negative values with +", () => {
    expect(fmtPct(0.3)).toBe("+30.0%");
    expect(fmtPct(0)).toBe("+0.0%");
  });

  it("keeps the minus sign for negatives (no extra +)", () => {
    expect(fmtPct(-0.15)).toBe("-15.0%");
  });

  it("rounds to one decimal place", () => {
    expect(fmtPct(0.12345)).toBe("+12.3%");
  });
});

describe("fmtTick", () => {
  it("uses k suffix at or above 1000", () => {
    expect(fmtTick(1000)).toBe("$1k");
    expect(fmtTick(10000)).toBe("$10k");
    expect(fmtTick(94419)).toBe("$94k");
  });

  it("shows raw dollars below 1000", () => {
    expect(fmtTick(500)).toBe("$500");
    expect(fmtTick(1)).toBe("$1");
  });
});
