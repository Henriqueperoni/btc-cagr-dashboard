import { describe, it, expect } from "vitest";
import { computeRetirement } from "../retirement.js";

// Base de parâmetros válidos; cada teste sobrescreve o que precisa.
const base = {
  currentAge: 30,
  retirementYear: 2036,
  retirementPortfolio: 1000000,
  desiredAnnualIncome: 40000,
  inflationRate: 3,
  postRetirementGrowth: 8,
  withdrawalRate: 4,
  drawdownYears: 30,
  currentYear: 2026,
};

describe("computeRetirement — age math", () => {
  it("derives retirement age from current age + years to retirement", () => {
    const r = computeRetirement(base);
    expect(r.retirementAge).toBe(40); // 30 + (2036 - 2026)
  });

  it("derives end age from retirement age + drawdown years", () => {
    const r = computeRetirement(base);
    expect(r.endAge).toBe(70); // 40 + 30
  });
});

describe("computeRetirement — target math", () => {
  it("computes required portfolio as income / withdrawal rate", () => {
    const r = computeRetirement(base);
    expect(r.requiredPortfolio).toBeCloseTo(1000000, 6); // 40000 / 0.04
  });

  it("computes funded percent against the required portfolio", () => {
    const r = computeRetirement({ ...base, retirementPortfolio: 500000 });
    expect(r.fundedPercent).toBeCloseTo(50, 6);
  });

  it("clamps withdrawal rate to a 0.5% floor to avoid divide-by-zero", () => {
    const r = computeRetirement({ ...base, withdrawalRate: 0 });
    // 40000 / 0.005 = 8,000,000 — finite, not Infinity
    expect(Number.isFinite(r.requiredPortfolio)).toBe(true);
    expect(r.requiredPortfolio).toBeCloseTo(8000000, 6);
  });
});

describe("computeRetirement — drawdown simulation", () => {
  it("produces one row per drawdown year when money never runs out", () => {
    const r = computeRetirement({ ...base, drawdownYears: 10, postRetirementGrowth: 8 });
    expect(r.drawdownTable).toHaveLength(10);
    expect(r.depletionYear).toBeNull();
    expect(r.depletionAge).toBeNull();
  });

  it("first-year withdrawal equals the desired income", () => {
    const r = computeRetirement(base);
    expect(r.drawdownTable[0].withdrawal).toBeCloseTo(40000, 6);
  });

  it("grows the withdrawal by inflation each subsequent year", () => {
    const r = computeRetirement({ ...base, inflationRate: 3 });
    expect(r.drawdownTable[1].withdrawal).toBeCloseTo(40000 * 1.03, 6);
    expect(r.drawdownTable[2].withdrawal).toBeCloseTo(40000 * 1.03 * 1.03, 6);
  });

  it("marks the depletion year and stops when the balance hits zero", () => {
    // tiny portfolio, no growth → depletes fast
    const r = computeRetirement({
      ...base,
      retirementPortfolio: 100000,
      desiredAnnualIncome: 40000,
      postRetirementGrowth: 0,
      inflationRate: 0,
      drawdownYears: 30,
    });
    // 100k - 40k = 60k (yr1), 60k - 40k = 20k (yr2), 20k - 40k <= 0 (yr3, depleted)
    expect(r.depletionYear).toBe(2038); // 2036 + 2
    expect(r.depletionAge).toBe(42); // 40 + 2
    const last = r.drawdownTable[r.drawdownTable.length - 1];
    expect(last.depleted).toBe(true);
    expect(last.balance).toBe(0);
    // simulation stopped at depletion, did not run all 30 years
    expect(r.drawdownTable.length).toBeLessThan(30);
  });

  it("never records a negative balance", () => {
    const r = computeRetirement({
      ...base,
      retirementPortfolio: 50000,
      postRetirementGrowth: 0,
      inflationRate: 0,
    });
    for (const row of r.drawdownTable) {
      expect(row.balance).toBeGreaterThanOrEqual(0);
    }
  });

  it("finalBalance reflects the last row's balance", () => {
    const r = computeRetirement({ ...base, drawdownYears: 5 });
    expect(r.finalBalance).toBeCloseTo(r.drawdownTable[r.drawdownTable.length - 1].balance, 6);
  });
});

describe("computeRetirement — guardrails", () => {
  it("returns an empty table (no crash) when drawdownYears is zero", () => {
    const r = computeRetirement({ ...base, drawdownYears: 0 });
    expect(r.drawdownTable).toEqual([]);
    // finalBalance falls back to the starting portfolio
    expect(r.finalBalance).toBe(base.retirementPortfolio);
  });

  it("floors fractional drawdown years", () => {
    const r = computeRetirement({ ...base, drawdownYears: 5.9 });
    expect(r.drawdownTable.length).toBeLessThanOrEqual(6);
  });

  it("caps an absurd drawdownYears at the internal maximum (no runaway loop)", () => {
    const r = computeRetirement({
      ...base,
      drawdownYears: 100000,
      postRetirementGrowth: 100, // grows fast enough to never deplete
    });
    expect(r.drawdownTable.length).toBeLessThanOrEqual(200);
  });

  it("handles NaN drawdownYears as zero", () => {
    const r = computeRetirement({ ...base, drawdownYears: NaN });
    expect(r.drawdownTable).toEqual([]);
  });
});
