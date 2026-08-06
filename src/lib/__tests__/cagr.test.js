import { describe, it, expect } from "vitest";
import { baseRate, projectRows, buildYearlyPrices, rollingCagr } from "../cagr.js";

describe("baseRate", () => {
  it("returns futureCagr as a fraction in the first year (no decay applied)", () => {
    // yearIndex 1 → decay exponent 0 → full rate
    expect(baseRate(1, 30, 5)).toBeCloseTo(0.3, 10);
  });

  it("applies decay relative to the previous year", () => {
    // yearIndex 2 → 30% * (1 - 0.05)^1 = 0.285
    expect(baseRate(2, 30, 5)).toBeCloseTo(0.285, 10);
    // yearIndex 3 → 30% * 0.95^2
    expect(baseRate(3, 30, 5)).toBeCloseTo(0.3 * 0.95 * 0.95, 10);
  });

  it("stays constant when decay is zero", () => {
    expect(baseRate(1, 40, 0)).toBeCloseTo(0.4, 10);
    expect(baseRate(10, 40, 0)).toBeCloseTo(0.4, 10);
  });

  it("handles negative CAGR", () => {
    expect(baseRate(1, -30, 5)).toBeCloseTo(-0.3, 10);
  });
});

describe("projectRows", () => {
  it("produces one row per projected year", () => {
    const rows = projectRows({ currentPrice: 100, futureCagr: 30, cagrDecay: 5, startYear: 2026, years: 5 });
    expect(rows).toHaveLength(5);
    expect(rows[0].year).toBe(2027);
    expect(rows[4].year).toBe(2031);
  });

  it("compounds price forward using the yearly rate", () => {
    const rows = projectRows({ currentPrice: 100, futureCagr: 30, cagrDecay: 0, startYear: 2026, years: 2 });
    // constant 30%: 100 → 130 → 169
    expect(rows[0].price).toBeCloseTo(130, 6);
    expect(rows[1].price).toBeCloseTo(169, 6);
  });

  it("applies a manual override for a specific year and marks it", () => {
    const rows = projectRows({
      currentPrice: 100,
      futureCagr: 30,
      cagrDecay: 0,
      cagrOverrides: { 2027: 50 }, // 50% instead of 30% in the first year
      startYear: 2026,
      years: 2,
    });
    expect(rows[0].isOverridden).toBe(true);
    expect(rows[0].rate).toBeCloseTo(0.5, 10);
    expect(rows[0].price).toBeCloseTo(150, 6);
    // subsequent non-overridden year compounds from the overridden price
    expect(rows[1].isOverridden).toBe(false);
    expect(rows[1].price).toBeCloseTo(195, 6); // 150 * 1.3
  });

  it("treats an override of 0 as a real override, not a fallback", () => {
    const rows = projectRows({
      currentPrice: 100,
      futureCagr: 30,
      cagrDecay: 0,
      cagrOverrides: { 2027: 0 },
      startYear: 2026,
      years: 1,
    });
    expect(rows[0].isOverridden).toBe(true);
    expect(rows[0].rate).toBe(0);
    expect(rows[0].price).toBeCloseTo(100, 6);
  });
});

describe("buildYearlyPrices", () => {
  it("merges anchor points, current price, and projected rows", () => {
    const projectedRows = [{ year: 2027, price: 130 }];
    const map = buildYearlyPrices({
      currentPrice: 100,
      projectedRows,
      todayYear: 2026,
      anchorPoints: [{ date: "2012-01-01", price: 4.38 }],
    });
    expect(map[2012]).toBe(4.38); // anchor
    expect(map[2026]).toBe(100); // current price
    expect(map[2027]).toBe(130); // projected
  });

  it("lets the current price override an anchor for the same year", () => {
    const map = buildYearlyPrices({
      currentPrice: 999,
      projectedRows: [],
      todayYear: 2025,
      anchorPoints: [{ date: "2025-01-01", price: 94419 }],
    });
    expect(map[2025]).toBe(999);
  });
});

describe("rollingCagr", () => {
  it("returns an empty array for an empty price map", () => {
    expect(rollingCagr({})).toEqual([]);
  });

  it("computes the CAGR over the given window", () => {
    // 2020 → 2024, price doubles each... use a clean 16x over 4 years = 2x CAGR
    const prices = { 2020: 100, 2024: 1600 };
    const rows = rollingCagr(prices, { window: 4, currentYear: 2026 });
    expect(rows).toHaveLength(1);
    // 1600/100 = 16, 16^(1/4) = 2 → CAGR of 100%
    expect(rows[0].cagr).toBeCloseTo(1.0, 10);
    expect(rows[0].startYear).toBe(2020);
    expect(rows[0].endYear).toBe(2024);
  });

  it("flags windows whose end year is beyond the current year as simulated", () => {
    const prices = { 2023: 100, 2024: 110, 2025: 120, 2026: 130, 2027: 140, 2028: 150 };
    const rows = rollingCagr(prices, { window: 4, currentYear: 2026 });
    const win2023 = rows.find((r) => r.startYear === 2023); // ends 2027 > 2026
    const win2024 = rows.find((r) => r.startYear === 2024); // ends 2028 > 2026
    expect(win2023.simulated).toBe(true);
    expect(win2024.simulated).toBe(true);
  });

  it("does not flag a window ending at or before the current year", () => {
    const prices = { 2022: 100, 2023: 110, 2024: 120, 2025: 130, 2026: 140 };
    const rows = rollingCagr(prices, { window: 4, currentYear: 2026 });
    const win2022 = rows.find((r) => r.startYear === 2022); // ends 2026, not > 2026
    expect(win2022.simulated).toBe(false);
  });

  it("skips windows with a missing endpoint", () => {
    const prices = { 2020: 100, 2025: 200 }; // no 2024, so the 2020+4 window has no endpoint
    const rows = rollingCagr(prices, { window: 4, currentYear: 2026 });
    expect(rows).toEqual([]);
  });
});
