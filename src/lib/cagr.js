// Motor de projeção de preço do BTC e CAGR em janelas móveis. Funções puras (sem React)
// para poderem ser testadas isoladamente.
import { ANCHOR_POINTS, PROJECTION_YEARS, TODAY_YEAR, WINDOW } from "../constants.js";

// CAGR base de um ano da projeção: começa em futureCagr e decai cagrDecay% (relativo ao ano
// anterior) a cada ano — retornos decrescentes.
export function baseRate(yearIndex, futureCagr, cagrDecay) {
  return (futureCagr / 100) * Math.pow(1 - cagrDecay / 100, yearIndex - 1);
}

// Projeta o preço ano a ano a partir de currentPrice. Overrides manuais (cagrOverrides, em %)
// substituem o CAGR calculado para aquele ano específico.
export function projectRows({
  currentPrice,
  futureCagr,
  cagrDecay,
  cagrOverrides = {},
  startYear = TODAY_YEAR,
  years = PROJECTION_YEARS,
}) {
  let price = currentPrice;
  const out = [];
  for (let i = 0; i < years; i++) {
    const yearIndex = i + 1;
    const year = startYear + yearIndex;
    const rate =
      cagrOverrides[year] != null ? cagrOverrides[year] / 100 : baseRate(yearIndex, futureCagr, cagrDecay);
    price = price * (1 + rate);
    out.push({ year, price, rate, isOverridden: cagrOverrides[year] != null });
  }
  return out;
}

// Mapa ano -> preço, combinando histórico (1/jan), o preço atual (editável, usado como proxy
// do ano corrente) e a simulação (anos futuros).
export function buildYearlyPrices({
  currentPrice,
  projectedRows,
  todayYear = TODAY_YEAR,
  anchorPoints = ANCHOR_POINTS,
}) {
  const map = {};
  anchorPoints.forEach((a) => {
    map[new Date(a.date).getFullYear()] = a.price;
  });
  map[todayYear] = currentPrice;
  projectedRows.forEach((p) => {
    map[p.year] = p.price;
  });
  return map;
}

// Janelas móveis de `window` anos (2012–2016, 2013–2017, ...), incluindo janelas que já usam
// anos futuros simulados assim que a projeção os preenche.
export function rollingCagr(yearlyPrices, { window = WINDOW, currentYear = TODAY_YEAR } = {}) {
  const years = Object.keys(yearlyPrices).map(Number).sort((a, b) => a - b);
  if (!years.length) return [];
  const minYear = years[0];
  const maxYear = years[years.length - 1];
  const out = [];
  for (let y = minYear; y + window <= maxYear; y++) {
    const startP = yearlyPrices[y];
    const endP = yearlyPrices[y + window];
    if (startP == null || endP == null) continue;
    const cagr = Math.pow(endP / startP, 1 / window) - 1;
    out.push({
      startYear: y,
      endYear: y + window,
      start: startP,
      end: endP,
      cagr,
      simulated: y + window > currentYear,
    });
  }
  return out;
}
