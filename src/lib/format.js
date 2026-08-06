// Formatadores puros compartilhados por todo o dashboard.

export function fmtUsd(v) {
  if (v == null) return "—";
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function fmtPct(v) {
  if (v == null) return "—";
  const s = (v * 100).toFixed(1) + "%";
  return v >= 0 ? "+" + s : s;
}

// Rótulo curto do eixo Y do gráfico ($1k, $10k, ...).
export function fmtTick(v) {
  if (v >= 1000) return "$" + Math.round(v / 1000) + "k";
  return "$" + v;
}
