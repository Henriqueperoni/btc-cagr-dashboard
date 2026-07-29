import { useEffect, useMemo, useRef, useState } from "react";

// Preço do BTC em 1º de janeiro de cada ano. 2015-2025: Yahoo Finance / dados agregados
// CoinGecko, artigo "Bitcoin's Price Every New Year's Day For Last Decade". 2012-2014: sem
// registro de 1/jan específico numa fonte única, usei o preço de fechamento de 31/dez do ano
// anterior (Fool.com / "Buy Bitcoin Worldwide"), que é uma aproximação razoável mas menos
// precisa que os anos mais recentes.
const ANCHOR_POINTS = [
  { date: "2012-01-01", price: 4.38 },
  { date: "2013-01-01", price: 13.41 },
  { date: "2014-01-01", price: 770 },
  { date: "2015-01-01", price: 314 },
  { date: "2016-01-01", price: 436 },
  { date: "2017-01-01", price: 998 },
  { date: "2018-01-01", price: 13657 },
  { date: "2019-01-01", price: 3843 },
  { date: "2020-01-01", price: 7200 },
  { date: "2021-01-01", price: 29374 },
  { date: "2022-01-01", price: 47686 },
  { date: "2023-01-01", price: 16625 },
  { date: "2024-01-01", price: 44167 },
  { date: "2025-01-01", price: 94419 },
];
const TODAY = { date: "2026-07-26", price: 64500 };


// Série mensal aproximada só para desenhar a forma do gráfico (não usada nos cálculos de CAGR).
// Construída a partir de marcos de preço amplamente conhecidos (topos e fundos de ciclo).
// Começa em 2015 pra não esmagar o eixo Y com os preços de centavos/dezenas de 2013-14.
// Não é uma série de fechamento diário oficial — tratar como ilustrativa.
const MONTHLY_SERIES = [
  ["2015-01", 315], ["2015-06", 230], ["2015-11", 380], ["2016-06", 670],
  ["2016-12", 960], ["2017-06", 2500], ["2017-09", 4200], ["2017-11", 9800],
  ["2017-12", 13800], ["2018-01", 10200], ["2018-06", 6400], ["2018-12", 3800],
  ["2019-06", 10800], ["2019-12", 7200], ["2020-03", 6400], ["2020-06", 9100],
  ["2020-12", 28900], ["2021-04", 57800], ["2021-07", 39900], ["2021-11", 60900],
  ["2021-12", 46200], ["2022-06", 19800], ["2022-11", 17200], ["2022-12", 16500],
  ["2023-06", 30500], ["2023-12", 42300], ["2024-03", 71300], ["2024-06", 60800],
  ["2024-11", 91500], ["2024-12", 93800], ["2025-01", 102000], ["2025-03", 82500],
  ["2025-05", 104000], ["2025-07", 117000], ["2025-10", 122000], ["2025-12", 90000],
  ["2026-03", 70000], ["2026-06", 58000], ["2026-07", 64500],
];

// Modelo Bitcoin Power Law (Giovanni Santostasi), parâmetros públicos amplamente citados
// (ex. btcpowerlaw.nl / Bitcoin Observatory): log10(preço-tendência) = -16.493 + 5.688·log10(dias
// desde o genesis block). As bandas de suporte/resistência são a tendência ±2σ em espaço log10,
// com σ ≈ 0.2 → suporte = tendência × 10^-0.4, resistência = tendência × 10^+0.4. É um modelo
// contestado (assim como o Long-Term Power Law que você já pesquisou), não uma garantia.
const GENESIS_MS = Date.UTC(2009, 0, 3);
function powerLawBands(dateMs) {
  const days = (dateMs - GENESIS_MS) / (24 * 3600 * 1000);
  if (days <= 0) return { plFloor: null, plCeiling: null };
  const logTrend = -16.493 + 5.688 * Math.log10(days);
  const trend = Math.pow(10, logTrend);
  return {
    plFloor: trend * Math.pow(10, -0.4),
    plCeiling: trend * Math.pow(10, 0.4),
  };
}

const PROJECTION_YEARS = 24;

function fmtUsd(v) {
  if (v == null) return "—";
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function fmtPct(v) {
  if (v == null) return "—";
  const s = (v * 100).toFixed(1) + "%";
  return v >= 0 ? "+" + s : s;
}

// ---------- geometria do gráfico (SVG puro, sem biblioteca de gráficos) ----------
// Desenhado à mão porque múltiplas tentativas com uma biblioteca de terceiros não
// renderizavam de forma confiável as bandas do Power Law neste ambiente. Com SVG puro
// controlamos 100% da matemática de posicionamento, sem depender de cálculo de domínio
// de eixo de nenhuma biblioteca externa.
const CHART_W = 900;
const CHART_H = 300;
const PAD_L = 54;
const PAD_R = 10;
const PAD_T = 10;
const PAD_B = 26;
const PLOT_W = CHART_W - PAD_L - PAD_R;
const PLOT_H = CHART_H - PAD_T - PAD_B;

function makeXScale(n) {
  return (i) => PAD_L + (n <= 1 ? 0 : (i / (n - 1)) * PLOT_W);
}

function makeYScale(min, max, isLog) {
  const lo = isLog ? Math.log10(min) : min;
  const hi = isLog ? Math.log10(max) : max;
  const span = hi - lo || 1;
  return (v) => {
    const vv = isLog ? Math.log10(Math.max(v, min)) : v;
    const t = (vv - lo) / span;
    return PAD_T + (1 - t) * PLOT_H;
  };
}

function seriesPoints(data, key) {
  return data
    .map((d, i) => ({ i, v: d[key] }))
    .filter((p) => p.v != null && isFinite(p.v));
}

function linePath(pts, xFn, yFn) {
  return pts
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${xFn(p.i).toFixed(2)},${yFn(p.v).toFixed(2)}`)
    .join(" ");
}

function areaPath(pts, xFn, yFn, baselineY) {
  if (!pts.length) return "";
  const top = pts
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${xFn(p.i).toFixed(2)},${yFn(p.v).toFixed(2)}`)
    .join(" ");
  const lastX = xFn(pts[pts.length - 1].i);
  const firstX = xFn(pts[0].i);
  return `${top} L ${lastX.toFixed(2)},${baselineY.toFixed(2)} L ${firstX.toFixed(2)},${baselineY.toFixed(2)} Z`;
}

function niceTicksLog(min, max) {
  const ticks = [];
  const start = Math.round(Math.log10(min));
  const end = Math.round(Math.log10(max));
  for (let e = start; e <= end; e++) ticks.push(Math.pow(10, e));
  return ticks;
}

function fmtTick(v) {
  if (v >= 1000) return "$" + Math.round(v / 1000) + "k";
  return "$" + v;
}

export default function BtcCagrDashboard() {
  const [logScale, setLogScale] = useState(true);
  const [showPowerLaw, setShowPowerLaw] = useState(true);
  const [futureCagr, setFutureCagr] = useState(25); // % ao ano
  const [cagrDecay, setCagrDecay] = useState(10); // % de queda do CAGR a cada ano
  const [currentPrice, setCurrentPrice] = useState(TODAY.price);
  const [priceInput, setPriceInput] = useState(String(TODAY.price));
  const [hoverIdx, setHoverIdx] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [isLivePrice, setIsLivePrice] = useState(false);
  const svgRef = useRef(null);

  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd")
      .then((r) => r.json())
      .then((data) => {
        const price = data?.bitcoin?.usd;
        if (price > 0) {
          setCurrentPrice(price);
          setPriceInput(String(price));
          setIsLivePrice(true);
        }
      })
      .catch(() => {});

    fetch("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=max&interval=daily")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.prices) && data.prices.length > 0) {
          setHistoricalData(data.prices);
        }
      })
      .catch(() => {});
  }, []);

  function commitPrice(raw) {
    const n = Number(raw.replace(/[^0-9.]/g, ""));
    if (n > 0) {
      setCurrentPrice(n);
      setPriceInput(String(n));
    } else {
      setPriceInput(String(currentPrice));
    }
  }

  const projectedRows = useMemo(() => {
    const r0 = futureCagr / 100;
    const decay = cagrDecay / 100;
    const startYear = new Date(TODAY.date).getFullYear();
    let price = currentPrice;
    let rate = r0;
    const out = [];
    for (let i = 0; i < PROJECTION_YEARS; i++) {
      if (i > 0) rate = rate * (1 - decay);
      price = price * (1 + rate);
      out.push({ year: startYear + i + 1, price, rate });
    }
    return out;
  }, [futureCagr, cagrDecay, currentPrice]);

  // mapa ano -> preço, combinando histórico (1/jan), o preço atual (editável, usado
  // como proxy do ano corrente) e a simulação (anos futuros)
  const yearlyPrices = useMemo(() => {
    const map = {};
    ANCHOR_POINTS.forEach((a) => {
      map[new Date(a.date).getFullYear()] = a.price;
    });
    map[new Date(TODAY.date).getFullYear()] = currentPrice;
    projectedRows.forEach((p) => {
      map[p.year] = p.price;
    });
    return map;
  }, [currentPrice, projectedRows]);

  // janelas móveis de 4 anos (2012–2016, 2013–2017, ...), incluindo janelas que já
  // usam anos futuros simulados assim que a projeção os preenche
  const WINDOW = 4;
  const rollingCagrRows = useMemo(() => {
    const years = Object.keys(yearlyPrices).map(Number).sort((a, b) => a - b);
    if (!years.length) return [];
    const minYear = years[0];
    const maxYear = years[years.length - 1];
    const currentYear = new Date(TODAY.date).getFullYear();
    const out = [];
    for (let y = minYear; y + WINDOW <= maxYear; y++) {
      const startP = yearlyPrices[y];
      const endP = yearlyPrices[y + WINDOW];
      if (startP == null || endP == null) continue;
      const cagr = Math.pow(endP / startP, 1 / WINDOW) - 1;
      out.push({
        startYear: y,
        endYear: y + WINDOW,
        start: startP,
        end: endP,
        cagr,
        simulated: y + WINDOW > currentYear,
      });
    }
    return out;
  }, [yearlyPrices]);

  const chartData = useMemo(() => {
    let historical;
    let lastDateMs;

    if (historicalData) {
      // Downsample CoinGecko daily data: keep one point per month (last entry of each month),
      // starting from 2015 so the y-axis isn't crushed by the sub-$100 era.
      const byMonth = new Map();
      for (const [tsMs, price] of historicalData) {
        const d = new Date(tsMs);
        const y = d.getUTCFullYear();
        if (y < 2015) continue;
        const key = `${y}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        byMonth.set(key, { tsMs, price });
      }
      historical = Array.from(byMonth.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([ym, { tsMs, price }]) => ({
          date: ym.slice(0, 4),
          price,
          ...powerLawBands(tsMs),
        }));
      const last = historical[historical.length - 1];
      if (last) {
        lastDateMs = new Date(last.date + "-07-15").getTime();
      } else {
        lastDateMs = Date.UTC(new Date().getUTCFullYear(), 6, 15);
      }
    } else {
      historical = MONTHLY_SERIES.map(([ym, price]) => {
        const [y, m] = ym.split("-").map(Number);
        const dateMs = Date.UTC(y, m - 1, 15);
        return { date: ym.slice(0, 4), price, ...powerLawBands(dateMs) };
      });
      const [lastY, lastM] = MONTHLY_SERIES[MONTHLY_SERIES.length - 1][0].split("-").map(Number);
      lastDateMs = Date.UTC(lastY, lastM - 1, 15);
    }

    const last = {
      ...historical[historical.length - 1],
      price: currentPrice,
      projected: currentPrice,
      ...powerLawBands(lastDateMs),
    };
    const future = projectedRows.map((p) => {
      const dateMs = Date.UTC(p.year, 6, 26);
      return { date: String(p.year), projected: p.price, ...powerLawBands(dateMs) };
    });
    return [...historical.slice(0, -1), last, ...future];
  }, [projectedRows, currentPrice, historicalData]);

  const finalProjectedPrice = projectedRows[projectedRows.length - 1]?.price;
  const finalMultiple = finalProjectedPrice ? finalProjectedPrice / currentPrice : null;

  // ---- geometria calculada a partir dos dados ----
  const geo = useMemo(() => {
    const n = chartData.length;
    const xFn = makeXScale(n);

    // domínio ÚNICO e compartilhado: preço, simulação e power law usam a MESMA
    // escala Y, senão o mesmo valor em dólar cai em alturas diferentes dependendo
    // da linha (foi exatamente o bug da versão anterior)
    let max = 0;
    let min = Infinity;
    for (const d of chartData) {
      const vals = [d.price, d.projected, showPowerLaw ? d.plCeiling : null, showPowerLaw ? d.plFloor : null];
      for (const v of vals) {
        if (v != null) {
          max = Math.max(max, v);
          if (v > 0) min = Math.min(min, v);
        }
      }
    }
    if (!isFinite(min)) min = 1;
    if (!max) max = 1;

    const yMax = logScale ? Math.pow(10, Math.ceil(Math.log10(max))) : max * 1.05;
    const yMin = logScale ? Math.pow(10, Math.floor(Math.log10(min))) : 0;
    const yFn = makeYScale(logScale ? yMin : 0, yMax, logScale);

    const pricePts = seriesPoints(chartData, "price");
    const projPts = seriesPoints(chartData, "projected");
    const floorPts = seriesPoints(chartData, "plFloor");
    const ceilPts = seriesPoints(chartData, "plCeiling");

    const baselineY = yFn(logScale ? yMin : 0);

    return {
      xFn,
      yFn,
      yMin,
      yMax,
      pricePath: linePath(pricePts, xFn, yFn),
      priceAreaPath: areaPath(pricePts, xFn, yFn, baselineY),
      projPath: linePath(projPts, xFn, yFn),
      projAreaPath: areaPath(projPts, xFn, yFn, baselineY),
      floorPath: linePath(floorPts, xFn, yFn),
      ceilPath: linePath(ceilPts, xFn, yFn),
      priceTicks: logScale ? niceTicksLog(yMin, yMax) : [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax],
      n,
    };
  }, [chartData, logScale, showPowerLaw]);

  function handleMove(e) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * CHART_W;
    const t = (relX - PAD_L) / PLOT_W;
    const idx = Math.round(t * (geo.n - 1));
    if (idx >= 0 && idx < geo.n) setHoverIdx(idx);
  }

  const hoverPoint = hoverIdx != null ? chartData[hoverIdx] : null;
  const hoverX = hoverIdx != null ? geo.xFn(hoverIdx) : null;

  // rótulos do eixo X: mostra só uma amostra pra não lotar o eixo
  const xLabelStep = Math.max(1, Math.ceil(chartData.length / 14));

  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        background: "#0b0e11",
        color: "#e8e6df",
        minHeight: "100%",
        padding: "28px 20px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap');
        .bcd-h1 { font-family: 'Space Grotesk', sans-serif; }
        .bcd-table tr:hover { background: #14181d; }
        .bcd-scrollbar::-webkit-scrollbar { height: 6px; }
        .bcd-toggle { transition: background .15s ease; }
      `}</style>

      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderBottom: "1px solid #23282f",
            paddingBottom: 16,
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.15em",
                color: "#7a8189",
                marginBottom: 6,
              }}
            >
              BTC / USD — RETORNO ANUALIZADO
            </div>
            <h1
              className="bcd-h1"
              style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "#f5b544" }}
            >
              CAGR por período
            </h1>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#7a8189" }}>
            <div style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              preço atual (editável)
              {isLivePrice
                ? <span style={{ color: "#4ade80", fontSize: 10 }}>● live</span>
                : <span style={{ color: "#5c636b", fontSize: 10 }}>● fallback</span>}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                justifyContent: "flex-end",
              }}
            >
              <span style={{ fontSize: 20, fontWeight: 700, color: "#f5b544" }}>$</span>
              <input
                type="text"
                inputMode="decimal"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                onBlur={(e) => commitPrice(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitPrice(e.target.value);
                }}
                style={{
                  fontFamily: "inherit",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#e8e6df",
                  background: "#14181d",
                  border: "1px solid #23282f",
                  borderRadius: 4,
                  padding: "2px 8px",
                  width: 110,
                  textAlign: "right",
                }}
              />
            </div>
            <div style={{ marginTop: 2 }}>referência: 26/jul/2026 = {fmtUsd(TODAY.price)}</div>
          </div>
        </div>

        <>
          {/* Chart */}
          <div
            style={{
              border: "1px solid #23282f",
              borderRadius: 8,
              padding: "16px 8px 8px",
              marginBottom: 24,
              background: "#0e1216",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0 12px 12px",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 12, color: "#7a8189" }}>
                histórico (aprox.) + simulação
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#7a8189" }}>
                  <span style={{ width: 10, height: 2, background: "#f5b544", display: "inline-block" }} />
                  histórico
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#7a8189" }}>
                  <span style={{ width: 10, height: 2, background: "#5fc9e8", display: "inline-block", borderTop: "1px dashed #5fc9e8" }} />
                  simulação
                </span>
                <button
                  onClick={() => setShowPowerLaw((v) => !v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    color: showPowerLaw ? "#7a8189" : "#4a4f57",
                    background: "none",
                    border: "none",
                    fontFamily: "inherit",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <span style={{ width: 10, height: 2, background: showPowerLaw ? "#c084fc" : "#3a3f47", display: "inline-block", borderTop: `1px dashed ${showPowerLaw ? "#c084fc" : "#3a3f47"}` }} />
                  power law {showPowerLaw ? "(on)" : "(off)"}
                </button>
                <button
                  className="bcd-toggle"
                  onClick={() => setLogScale((v) => !v)}
                  style={{
                    fontFamily: "inherit",
                    fontSize: 11,
                    color: "#0b0e11",
                    background: "#f5b544",
                    border: "none",
                    borderRadius: 4,
                    padding: "4px 10px",
                    cursor: "pointer",
                  }}
                >
                  escala: {logScale ? "log" : "linear"}
                </button>
              </div>
            </div>

            <div style={{ position: "relative" }}>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                width="100%"
                height={260}
                style={{ display: "block" }}
                onMouseMove={handleMove}
                onMouseLeave={() => setHoverIdx(null)}
              >
                <defs>
                  <linearGradient id="btcFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f5b544" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f5b544" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="projFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5fc9e8" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#5fc9e8" stopOpacity={0} />
                  </linearGradient>
                </defs>

                {/* grade horizontal + labels do eixo Y */}
                {geo.priceTicks.map((t, i) => {
                  const y = geo.yFn(Math.max(t, logScale ? geo.yMin : 0));
                  return (
                    <g key={i}>
                      <line x1={PAD_L} x2={CHART_W - PAD_R} y1={y} y2={y} stroke="#1c2127" />
                      <text x={PAD_L - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#7a8189">
                        {fmtTick(t)}
                      </text>
                    </g>
                  );
                })}

                {/* eixo X: labels de ano, amostrados */}
                {chartData.map((d, i) =>
                  i % xLabelStep === 0 ? (
                    <text
                      key={i}
                      x={geo.xFn(i)}
                      y={CHART_H - 8}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#7a8189"
                    >
                      {d.date}
                    </text>
                  ) : null
                )}

                {/* power law: desenhado antes do preço, fica "atrás" visualmente */}
                {showPowerLaw && (
                  <>
                    <path d={geo.ceilPath} fill="none" stroke="#c084fc" strokeWidth="2" strokeDasharray="5 4" />
                    <path d={geo.floorPath} fill="none" stroke="#c084fc" strokeWidth="2" strokeDasharray="5 4" />
                  </>
                )}

                {/* histórico de preço */}
                <path d={geo.priceAreaPath} fill="url(#btcFill)" stroke="none" />
                <path d={geo.pricePath} fill="none" stroke="#f5b544" strokeWidth="1.8" />

                {/* simulação futura */}
                <path d={geo.projAreaPath} fill="url(#projFill)" stroke="none" />
                <path d={geo.projPath} fill="none" stroke="#5fc9e8" strokeWidth="1.8" strokeDasharray="6 4" />

                {/* linha vertical de hover */}
                {hoverX != null && (
                  <line x1={hoverX} x2={hoverX} y1={PAD_T} y2={CHART_H - PAD_B} stroke="#3a3f47" strokeDasharray="2 2" />
                )}
              </svg>

              {/* tooltip */}
              {hoverPoint && (
                <div
                  style={{
                    position: "absolute",
                    left: `${Math.min(85, Math.max(2, (hoverX / CHART_W) * 100))}%`,
                    top: 6,
                    transform: hoverX / CHART_W > 0.7 ? "translateX(-100%)" : "none",
                    background: "#14181d",
                    border: "1px solid #23282f",
                    borderRadius: 6,
                    fontSize: 11,
                    padding: "6px 9px",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  <div style={{ color: "#7a8189", marginBottom: 2 }}>{hoverPoint.date}</div>
                  {hoverPoint.price != null && (
                    <div style={{ color: "#f5b544" }}>preço: {fmtUsd(hoverPoint.price)}</div>
                  )}
                  {hoverPoint.projected != null && (
                    <div style={{ color: "#5fc9e8" }}>simulação: {fmtUsd(hoverPoint.projected)}</div>
                  )}
                  {showPowerLaw && hoverPoint.plCeiling != null && (
                    <div style={{ color: "#c084fc" }}>power law (resist.): {fmtUsd(hoverPoint.plCeiling)}</div>
                  )}
                  {showPowerLaw && hoverPoint.plFloor != null && (
                    <div style={{ color: "#c084fc" }}>power law (suporte): {fmtUsd(hoverPoint.plFloor)}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Simulação */}
          <div
            style={{
              border: "1px solid #23282f",
              borderRadius: 8,
              padding: "18px 20px",
              marginBottom: 24,
              background: "#0e1216",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 10,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 12, color: "#7a8189" }}>
                simulação: CAGR inicial nos próximos {PROJECTION_YEARS} anos
              </span>
              <span style={{ fontSize: 22, fontWeight: 700, color: "#5fc9e8" }}>
                {futureCagr}% a.a.
              </span>
            </div>
            <input
              type="range"
              min={-30}
              max={100}
              step={1}
              value={futureCagr}
              onChange={(e) => setFutureCagr(Number(e.target.value))}
              style={{
                width: "100%",
                accentColor: "#5fc9e8",
                cursor: "pointer",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: "#5c636b",
                marginTop: 4,
                marginBottom: 18,
              }}
            >
              <span>-30%</span>
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 10,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 12, color: "#7a8189" }}>
                queda do CAGR a cada ano (retornos decrescentes)
              </span>
              <span style={{ fontSize: 22, fontWeight: 700, color: "#c084fc" }}>
                -{cagrDecay}% a.a.
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={cagrDecay}
              onChange={(e) => setCagrDecay(Number(e.target.value))}
              style={{
                width: "100%",
                accentColor: "#c084fc",
                cursor: "pointer",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: "#5c636b",
                marginTop: 4,
              }}
            >
              <span>0% (constante)</span>
              <span>10%</span>
              <span>20%</span>
              <span>30%</span>
              <span>40%</span>
              <span>50%</span>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
                gap: 8,
              }}
            >
              {projectedRows.map((p) => (
                <div
                  key={p.year}
                  style={{
                    border: "1px solid #1c2127",
                    borderRadius: 6,
                    padding: "8px 10px",
                  }}
                >
                  <div style={{ fontSize: 10, color: "#7a8189" }}>{p.year}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#e8e6df" }}>
                    {fmtUsd(p.price)}
                  </div>
                  <div style={{ fontSize: 10, color: "#c084fc", marginTop: 2 }}>
                    CAGR: {fmtPct(p.rate)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, fontSize: 11, color: "#5c636b", lineHeight: 1.6 }}>
              {cagrDecay > 0 ? (
                <>
                  Começando em {futureCagr}% ao ano e caindo {cagrDecay}% (relativo ao ano
                  anterior) a cada ano, o BTC sairia de {fmtUsd(TODAY.price)} hoje para{" "}
                  {fmtUsd(finalProjectedPrice)} em{" "}
                  {new Date(TODAY.date).getFullYear() + PROJECTION_YEARS}{" "}
                  ({finalMultiple ? finalMultiple.toFixed(1) : "—"}x), com o CAGR anual
                  caindo até {fmtPct(projectedRows[projectedRows.length - 1]?.rate)} no
                  último ano simulado.
                </>
              ) : (
                <>
                  Com {futureCagr}% ao ano constante, o BTC sairia de {fmtUsd(TODAY.price)}{" "}
                  hoje para {fmtUsd(finalProjectedPrice)} em{" "}
                  {new Date(TODAY.date).getFullYear() + PROJECTION_YEARS}{" "}
                  ({finalMultiple ? finalMultiple.toFixed(1) : "—"}x).
                </>
              )}{" "}
              Isso é uma simulação matemática de juros compostos com taxas escolhidas por
              você, não é previsão nem recomendação, o BTC nunca cresceu de forma
              constante ano a ano, veja a volatilidade no histórico acima.
            </div>
          </div>

          {/* Table */}
          <div
            style={{
              fontSize: 12,
              color: "#7a8189",
              marginBottom: 8,
            }}
          >
            CAGR em janelas móveis de {WINDOW} anos. Linhas marcadas "simulado" usam a
            projeção acima (mude o CAGR/queda pra ver essas linhas mudarem).
          </div>
          <div
            className="bcd-scrollbar"
            style={{
              overflowX: "auto",
              overflowY: "auto",
              maxHeight: 420,
              border: "1px solid #23282f",
              borderRadius: 8,
            }}
          >
            <table
              className="bcd-table"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ background: "#14181d", color: "#7a8189" }}>
                  <th style={{ ...th, position: "sticky", top: 0, background: "#14181d" }}>período</th>
                  <th style={{ ...th, position: "sticky", top: 0, background: "#14181d" }}>preço inicial</th>
                  <th style={{ ...th, position: "sticky", top: 0, background: "#14181d" }}>preço final</th>
                  <th style={{ ...th, position: "sticky", top: 0, background: "#14181d", textAlign: "right" }}>CAGR</th>
                </tr>
              </thead>
              <tbody>
                {rollingCagrRows.map((r) => (
                  <tr key={r.startYear} style={{ borderTop: "1px solid #1c2127" }}>
                    <td style={td}>
                      {r.startYear}–{r.endYear}
                      {r.simulated && (
                        <span style={{ color: "#c084fc", fontSize: 10, marginLeft: 6 }}>
                          (simulado)
                        </span>
                      )}
                    </td>
                    <td style={td}>{fmtUsd(r.start)}</td>
                    <td style={td}>{fmtUsd(r.end)}</td>
                    <td
                      style={{
                        ...td,
                        textAlign: "right",
                        fontWeight: 700,
                        color: r.cagr >= 0 ? "#5fc98d" : "#e8746a",
                      }}
                    >
                      {fmtPct(r.cagr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      </div>
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: "10px 14px",
  fontWeight: 500,
  fontSize: 11,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
};
const td = {
  padding: "10px 14px",
  color: "#e8e6df",
};