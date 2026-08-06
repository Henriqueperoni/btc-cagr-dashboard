// Gráfico de preço (histórico + simulação + bandas do Power Law), SVG puro. Dono da geometria,
// dos dados do gráfico e do estado de hover — tudo colocalizado aqui.
import { useMemo, useRef, useState } from "react";
import { colors } from "../theme.js";
import { fmtUsd, fmtTick } from "../lib/format.js";
import { MONTHLY_SERIES } from "../constants.js";
import { powerLawBands } from "../lib/powerLaw.js";
import {
  CHART_W, CHART_H, PAD_L, PAD_R, PAD_T, PAD_B, PLOT_W,
  makeXScale, makeYScale, seriesPoints, linePath, areaPath, niceTicksLog,
} from "../lib/chart.js";

export default function PriceChart({
  projectedRows,
  currentPrice,
  historicalData,
  logScale,
  setLogScale,
  showPowerLaw,
  setShowPowerLaw,
}) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

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
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: "16px 8px 8px",
        marginBottom: 24,
        background: colors.panel,
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
        <span style={{ fontSize: 12, color: colors.muted }}>histórico (aprox.) + simulação</span>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: colors.muted }}>
            <span style={{ width: 10, height: 2, background: colors.amber, display: "inline-block" }} />
            histórico
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: colors.muted }}>
            <span style={{ width: 10, height: 2, background: colors.cyan, display: "inline-block", borderTop: `1px dashed ${colors.cyan}` }} />
            simulação
          </span>
          <button
            onClick={() => setShowPowerLaw((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: showPowerLaw ? colors.muted : colors.off,
              background: "none",
              border: "none",
              fontFamily: "inherit",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <span style={{ width: 10, height: 2, background: showPowerLaw ? colors.violet : "#3a3f47", display: "inline-block", borderTop: `1px dashed ${showPowerLaw ? colors.violet : "#3a3f47"}` }} />
            power law {showPowerLaw ? "(on)" : "(off)"}
          </button>
          <button
            className="bcd-toggle"
            onClick={() => setLogScale((v) => !v)}
            style={{
              fontFamily: "inherit",
              fontSize: 11,
              color: colors.bg,
              background: colors.amber,
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
              <stop offset="0%" stopColor={colors.amber} stopOpacity={0.35} />
              <stop offset="100%" stopColor={colors.amber} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="projFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.cyan} stopOpacity={0.25} />
              <stop offset="100%" stopColor={colors.cyan} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* grade horizontal + labels do eixo Y */}
          {geo.priceTicks.map((t, i) => {
            const y = geo.yFn(Math.max(t, logScale ? geo.yMin : 0));
            return (
              <g key={i}>
                <line x1={PAD_L} x2={CHART_W - PAD_R} y1={y} y2={y} stroke={colors.borderSubtle} />
                <text x={PAD_L - 6} y={y + 3} textAnchor="end" fontSize="10" fill={colors.muted}>
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
                fill={colors.muted}
              >
                {d.date}
              </text>
            ) : null
          )}

          {/* power law: desenhado antes do preço, fica "atrás" visualmente */}
          {showPowerLaw && (
            <>
              <path d={geo.ceilPath} fill="none" stroke={colors.violet} strokeWidth="2" strokeDasharray="5 4" />
              <path d={geo.floorPath} fill="none" stroke={colors.violet} strokeWidth="2" strokeDasharray="5 4" />
            </>
          )}

          {/* histórico de preço */}
          <path d={geo.priceAreaPath} fill="url(#btcFill)" stroke="none" />
          <path d={geo.pricePath} fill="none" stroke={colors.amber} strokeWidth="1.8" />

          {/* simulação futura */}
          <path d={geo.projAreaPath} fill="url(#projFill)" stroke="none" />
          <path d={geo.projPath} fill="none" stroke={colors.cyan} strokeWidth="1.8" strokeDasharray="6 4" />

          {/* linha vertical de hover */}
          {hoverX != null && (
            <line x1={hoverX} x2={hoverX} y1={PAD_T} y2={CHART_H - PAD_B} stroke={colors.hoverLine} strokeDasharray="2 2" />
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
              background: colors.inputBg,
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              fontSize: 11,
              padding: "6px 9px",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ color: colors.muted, marginBottom: 2 }}>{hoverPoint.date}</div>
            {hoverPoint.price != null && (
              <div style={{ color: colors.amber }}>preço: {fmtUsd(hoverPoint.price)}</div>
            )}
            {hoverPoint.projected != null && (
              <div style={{ color: colors.cyan }}>simulação: {fmtUsd(hoverPoint.projected)}</div>
            )}
            {showPowerLaw && hoverPoint.plCeiling != null && (
              <div style={{ color: colors.violet }}>power law (resist.): {fmtUsd(hoverPoint.plCeiling)}</div>
            )}
            {showPowerLaw && hoverPoint.plFloor != null && (
              <div style={{ color: colors.violet }}>power law (suporte): {fmtUsd(hoverPoint.plFloor)}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
