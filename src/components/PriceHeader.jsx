// Cabeçalho compartilhado com o preço atual editável (usado pelas duas abas, o preço é o
// estado que ambas dependem). Indicador live/fallback conforme a busca de preço em tempo real.
import { colors } from "../theme.js";
import { fmtUsd } from "../lib/format.js";
import { TODAY } from "../constants.js";

export default function PriceHeader({ priceInput, setPriceInput, commitPrice, isLivePrice }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        borderBottom: `1px solid ${colors.border}`,
        paddingBottom: 16,
        marginBottom: 24,
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 11, letterSpacing: "0.15em", color: colors.muted, marginBottom: 6 }}>
          BTC / USD — RETORNO ANUALIZADO
        </div>
        <h1 className="bcd-h1" style={{ fontSize: 28, fontWeight: 700, margin: 0, color: colors.amber }}>
          CAGR por período
        </h1>
      </div>
      <div style={{ textAlign: "right", fontSize: 12, color: colors.muted }}>
        <div style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
          preço atual (editável)
          {isLivePrice ? (
            <span style={{ color: colors.live, fontSize: 10 }}>● live</span>
          ) : (
            <span style={{ color: colors.faint, fontSize: 10 }}>● fallback</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: colors.amber }}>$</span>
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
              color: colors.text,
              background: colors.inputBg,
              border: `1px solid ${colors.border}`,
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
  );
}
