// Aba "CAGR Dashboard": gráfico + sliders da simulação + cards de anos projetados + tabela de
// CAGR em janelas móveis. Dona do estado da simulação (futureCagr, cagrDecay, overrides) e das
// derivações que só esta aba usa. projectedRows e yearlyPrices são levantados para o pai porque
// o gráfico também os consome.
import { useState } from "react";
import { colors } from "../theme.js";
import { fmtUsd, fmtPct } from "../lib/format.js";
import { PROJECTION_YEARS, WINDOW, TODAY, TODAY_YEAR } from "../constants.js";
import { th, td, thSticky, scrollBox, tableStyle } from "../components/ui.js";
import CagrInput from "../components/CagrInput.jsx";
import PriceChart from "../components/PriceChart.jsx";

export default function CagrTab({
  currentPrice,
  historicalData,
  logScale,
  setLogScale,
  showPowerLaw,
  setShowPowerLaw,
  futureCagr,
  setFutureCagr,
  cagrDecay,
  setCagrDecay,
  cagrOverrides,
  setCagrOverrides,
  projectedRows,
  rollingCagrRows,
}) {
  const finalProjectedPrice = projectedRows[projectedRows.length - 1]?.price;
  const finalMultiple = finalProjectedPrice ? finalProjectedPrice / currentPrice : null;

  return (
    <>
      <PriceChart
        projectedRows={projectedRows}
        currentPrice={currentPrice}
        historicalData={historicalData}
        logScale={logScale}
        setLogScale={setLogScale}
        showPowerLaw={showPowerLaw}
        setShowPowerLaw={setShowPowerLaw}
      />

      {/* Simulação */}
      <div
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          padding: "18px 20px",
          marginBottom: 24,
          background: colors.panel,
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
          <span style={{ fontSize: 12, color: colors.muted }}>
            simulação: CAGR inicial nos próximos {PROJECTION_YEARS} anos
          </span>
          <span style={{ fontSize: 22, fontWeight: 700, color: colors.cyan }}>{futureCagr}% a.a.</span>
        </div>
        <input
          type="range"
          min={-30}
          max={100}
          step={1}
          value={futureCagr}
          onChange={(e) => setFutureCagr(Number(e.target.value))}
          style={{ width: "100%", accentColor: colors.cyan, cursor: "pointer" }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: colors.faint,
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
          <span style={{ fontSize: 12, color: colors.muted }}>
            queda do CAGR a cada ano (retornos decrescentes)
          </span>
          <span style={{ fontSize: 22, fontWeight: 700, color: colors.violet }}>-{cagrDecay}% a.a.</span>
        </div>
        <input
          type="range"
          min={0}
          max={50}
          step={1}
          value={cagrDecay}
          onChange={(e) => setCagrDecay(Number(e.target.value))}
          style={{ width: "100%", accentColor: colors.violet, cursor: "pointer" }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: colors.faint,
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
                border: `1px solid ${p.isOverridden ? colors.amber : colors.borderSubtle}`,
                borderRadius: 6,
                padding: "8px 10px",
                position: "relative",
              }}
            >
              <div style={{ fontSize: 10, color: colors.muted, display: "flex", justifyContent: "space-between" }}>
                <span>{p.year}</span>
                {p.isOverridden && (
                  <span style={{ color: colors.amber, fontSize: 9, letterSpacing: "0.04em" }}>editado</span>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{fmtUsd(p.price)}</div>
              <div style={{ fontSize: 10, marginTop: 2 }}>
                <CagrInput
                  year={p.year}
                  rate={p.rate}
                  isOverridden={p.isOverridden}
                  onCommit={(year, pct) => {
                    setCagrOverrides((prev) => {
                      const next = { ...prev };
                      if (pct == null) delete next[year];
                      else next[year] = pct;
                      return next;
                    });
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {Object.keys(cagrOverrides).length > 0 && (
          <div style={{ marginTop: 10, textAlign: "right" }}>
            <button
              onClick={() => setCagrOverrides({})}
              style={{
                fontFamily: "inherit",
                fontSize: 11,
                color: colors.muted,
                background: "none",
                border: `1px solid ${colors.border}`,
                borderRadius: 4,
                padding: "4px 10px",
                cursor: "pointer",
              }}
            >
              limpar edições manuais
            </button>
          </div>
        )}

        <div style={{ marginTop: 14, fontSize: 11, color: colors.faint, lineHeight: 1.6 }}>
          {cagrDecay > 0 ? (
            <>
              Começando em {futureCagr}% ao ano e caindo {cagrDecay}% (relativo ao ano
              anterior) a cada ano, o BTC sairia de {fmtUsd(TODAY.price)} hoje para{" "}
              {fmtUsd(finalProjectedPrice)} em {TODAY_YEAR + PROJECTION_YEARS}{" "}
              ({finalMultiple ? finalMultiple.toFixed(1) : "—"}x), com o CAGR anual
              caindo até {fmtPct(projectedRows[projectedRows.length - 1]?.rate)} no
              último ano simulado.
            </>
          ) : (
            <>
              Com {futureCagr}% ao ano constante, o BTC sairia de {fmtUsd(TODAY.price)}{" "}
              hoje para {fmtUsd(finalProjectedPrice)} em {TODAY_YEAR + PROJECTION_YEARS}{" "}
              ({finalMultiple ? finalMultiple.toFixed(1) : "—"}x).
            </>
          )}{" "}
          Isso é uma simulação matemática de juros compostos com taxas escolhidas por
          você, não é previsão nem recomendação, o BTC nunca cresceu de forma
          constante ano a ano, veja a volatilidade no histórico acima.
        </div>
      </div>

      {/* Table */}
      <div style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>
        CAGR em janelas móveis de {WINDOW} anos. Linhas marcadas "simulado" usam a
        projeção acima (mude o CAGR/queda pra ver essas linhas mudarem).
      </div>
      <div className="bcd-scrollbar" style={scrollBox}>
        <table className="bcd-table" style={tableStyle}>
          <thead>
            <tr style={{ background: colors.inputBg, color: colors.muted }}>
              <th style={thSticky}>período</th>
              <th style={thSticky}>preço inicial</th>
              <th style={thSticky}>preço final</th>
              <th style={{ ...thSticky, textAlign: "right" }}>CAGR</th>
            </tr>
          </thead>
          <tbody>
            {rollingCagrRows.map((r) => (
              <tr key={r.startYear} style={{ borderTop: `1px solid ${colors.borderSubtle}` }}>
                <td style={td}>
                  {r.startYear}–{r.endYear}
                  {r.simulated && (
                    <span style={{ color: colors.violet, fontSize: 10, marginLeft: 6 }}>(simulado)</span>
                  )}
                </td>
                <td style={td}>{fmtUsd(r.start)}</td>
                <td style={td}>{fmtUsd(r.end)}</td>
                <td
                  style={{
                    ...td,
                    textAlign: "right",
                    fontWeight: 700,
                    color: r.cagr >= 0 ? colors.green : colors.red,
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
  );
}
