import { describe, it, expect } from "vitest";
import { powerLawBands } from "../powerLaw.js";

describe("powerLawBands", () => {
  it("returns null bands for dates at or before the genesis block", () => {
    const genesisMs = Date.UTC(2009, 0, 3);
    expect(powerLawBands(genesisMs)).toEqual({ plFloor: null, plCeiling: null });
    expect(powerLawBands(genesisMs - 1000)).toEqual({ plFloor: null, plCeiling: null });
  });

  it("returns positive floor and ceiling for a date well after genesis", () => {
    const { plFloor, plCeiling } = powerLawBands(Date.UTC(2025, 0, 1));
    expect(plFloor).toBeGreaterThan(0);
    expect(plCeiling).toBeGreaterThan(0);
  });

  it("keeps ceiling above floor", () => {
    const { plFloor, plCeiling } = powerLawBands(Date.UTC(2025, 0, 1));
    expect(plCeiling).toBeGreaterThan(plFloor);
  });

  it("has ceiling/floor ratio of 10^0.8 (the ±0.4 log band)", () => {
    const { plFloor, plCeiling } = powerLawBands(Date.UTC(2025, 0, 1));
    expect(plCeiling / plFloor).toBeCloseTo(Math.pow(10, 0.8), 6);
  });

  it("grows over time (trend is increasing)", () => {
    const early = powerLawBands(Date.UTC(2015, 0, 1));
    const late = powerLawBands(Date.UTC(2025, 0, 1));
    expect(late.plFloor).toBeGreaterThan(early.plFloor);
    expect(late.plCeiling).toBeGreaterThan(early.plCeiling);
  });
});
