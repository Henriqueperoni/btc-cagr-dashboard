// Modelo Bitcoin Power Law (Giovanni Santostasi), parâmetros públicos amplamente citados
// (ex. btcpowerlaw.nl / Bitcoin Observatory): log10(preço-tendência) = -16.493 + 5.688·log10(dias
// desde o genesis block). As bandas de suporte/resistência são a tendência ±2σ em espaço log10,
// com σ ≈ 0.2 → suporte = tendência × 10^-0.4, resistência = tendência × 10^+0.4. É um modelo
// contestado (assim como o Long-Term Power Law que você já pesquisou), não uma garantia.
const GENESIS_MS = Date.UTC(2009, 0, 3);

export function powerLawBands(dateMs) {
  const days = (dateMs - GENESIS_MS) / (24 * 3600 * 1000);
  if (days <= 0) return { plFloor: null, plCeiling: null };
  const logTrend = -16.493 + 5.688 * Math.log10(days);
  const trend = Math.pow(10, logTrend);
  return {
    plFloor: trend * Math.pow(10, -0.4),
    plCeiling: trend * Math.pow(10, 0.4),
  };
}
