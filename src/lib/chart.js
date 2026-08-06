// ---------- geometria do gráfico (SVG puro, sem biblioteca de gráficos) ----------
// Desenhado à mão porque múltiplas tentativas com uma biblioteca de terceiros não
// renderizavam de forma confiável as bandas do Power Law neste ambiente. Com SVG puro
// controlamos 100% da matemática de posicionamento, sem depender de cálculo de domínio
// de eixo de nenhuma biblioteca externa.
export const CHART_W = 900;
export const CHART_H = 300;
export const PAD_L = 54;
export const PAD_R = 10;
export const PAD_T = 10;
export const PAD_B = 26;
export const PLOT_W = CHART_W - PAD_L - PAD_R;
export const PLOT_H = CHART_H - PAD_T - PAD_B;

export function makeXScale(n) {
  return (i) => PAD_L + (n <= 1 ? 0 : (i / (n - 1)) * PLOT_W);
}

export function makeYScale(min, max, isLog) {
  const lo = isLog ? Math.log10(min) : min;
  const hi = isLog ? Math.log10(max) : max;
  const span = hi - lo || 1;
  return (v) => {
    const vv = isLog ? Math.log10(Math.max(v, min)) : v;
    const t = (vv - lo) / span;
    return PAD_T + (1 - t) * PLOT_H;
  };
}

export function seriesPoints(data, key) {
  return data
    .map((d, i) => ({ i, v: d[key] }))
    .filter((p) => p.v != null && isFinite(p.v));
}

export function linePath(pts, xFn, yFn) {
  return pts
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${xFn(p.i).toFixed(2)},${yFn(p.v).toFixed(2)}`)
    .join(" ");
}

export function areaPath(pts, xFn, yFn, baselineY) {
  if (!pts.length) return "";
  const top = pts
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${xFn(p.i).toFixed(2)},${yFn(p.v).toFixed(2)}`)
    .join(" ");
  const lastX = xFn(pts[pts.length - 1].i);
  const firstX = xFn(pts[0].i);
  return `${top} L ${lastX.toFixed(2)},${baselineY.toFixed(2)} L ${firstX.toFixed(2)},${baselineY.toFixed(2)} Z`;
}

export function niceTicksLog(min, max) {
  const ticks = [];
  const start = Math.round(Math.log10(min));
  const end = Math.round(Math.log10(max));
  for (let e = start; e <= end; e++) ticks.push(Math.pow(10, e));
  return ticks;
}
