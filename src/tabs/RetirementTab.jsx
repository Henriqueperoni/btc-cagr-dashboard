// Aba "Aposentadoria": parâmetros + cards de resumo + tabela de saque + avisos. Dona de todo o
// seu estado e dos handlers de commit/validação (só esta aba os usa). O cálculo em si é a função
// pura computeRetirement.
import { useMemo, useState } from "react";
import { colors } from "../theme.js";
import { fmtUsd } from "../lib/format.js";
import { TODAY_YEAR } from "../constants.js";
import { computeRetirement } from "../lib/retirement.js";
import { td, thSticky, scrollBox, tableStyle } from "../components/ui.js";
import NumberField from "../components/NumberField.jsx";
import PercentSlider from "../components/PercentSlider.jsx";
import SummaryCard from "../components/SummaryCard.jsx";

export default function RetirementTab() {
  const [currentAge, setCurrentAge] = useState(30);
  const [currentAgeInput, setCurrentAgeInput] = useState("30");
  const [retirementPortfolio, setRetirementPortfolio] = useState(500000);
  const [retirementPortfolioInput, setRetirementPortfolioInput] = useState("500000");
  const [retirementYear, setRetirementYear] = useState(TODAY_YEAR + 10);
  const [retirementYearInput, setRetirementYearInput] = useState(String(TODAY_YEAR + 10));
  const [desiredAnnualIncome, setDesiredAnnualIncome] = useState(40000);
  const [desiredIncomeInput, setDesiredIncomeInput] = useState("40000");
  const [inflationRate, setInflationRate] = useState(3);
  const [postRetirementGrowth, setPostRetirementGrowth] = useState(8);
  const [withdrawalRate, setWithdrawalRate] = useState(4);
  const [drawdownYears, setDrawdownYears] = useState(30);
  const [drawdownYearsInput, setDrawdownYearsInput] = useState("30");

  // ---- commit handlers: normalizam e revertem para o último valor válido em caso de lixo ----
  function commitRetirementPortfolio(raw) {
    const n = Number(raw.replace(/[^0-9.]/g, ""));
    if (n > 0) {
      setRetirementPortfolio(n);
      setRetirementPortfolioInput(String(n));
    } else {
      setRetirementPortfolioInput(String(retirementPortfolio));
    }
  }

  function commitRetirementYear(raw) {
    const n = parseInt(raw, 10);
    if (isFinite(n) && n > TODAY_YEAR) {
      setRetirementYear(n);
      setRetirementYearInput(String(n));
    } else {
      setRetirementYearInput(String(retirementYear));
    }
  }

  function commitDesiredIncome(raw) {
    const n = Number(raw.replace(/[^0-9.]/g, ""));
    if (n > 0) {
      setDesiredAnnualIncome(n);
      setDesiredIncomeInput(String(n));
    } else {
      setDesiredIncomeInput(String(desiredAnnualIncome));
    }
  }

  function commitDrawdownYears(raw) {
    const n = parseInt(raw, 10);
    if (isFinite(n) && n > 0) {
      setDrawdownYears(n);
      setDrawdownYearsInput(String(n));
    } else {
      setDrawdownYearsInput(String(drawdownYears));
    }
  }

  function commitCurrentAge(raw) {
    const n = parseInt(raw, 10);
    if (isFinite(n) && n > 0 && n < 120) {
      setCurrentAge(n);
      setCurrentAgeInput(String(n));
    } else {
      setCurrentAgeInput(String(currentAge));
    }
  }

  // ---- validadores para o feedback visual (borda vermelha) ----
  function isValidRetirementYear(raw) {
    const n = parseInt(raw, 10);
    return raw.trim() !== "" && isFinite(n) && n > TODAY_YEAR;
  }
  function isValidPositiveNumber(raw) {
    const n = Number(raw.replace(/[^0-9.]/g, ""));
    return raw.trim() !== "" && isFinite(n) && n > 0;
  }
  function isValidPositiveInteger(raw) {
    const n = parseInt(raw, 10);
    return raw.trim() !== "" && isFinite(n) && n > 0;
  }
  function isValidAge(raw) {
    const n = parseInt(raw, 10);
    return raw.trim() !== "" && isFinite(n) && n > 0 && n < 120;
  }

  const calc = useMemo(
    () =>
      computeRetirement({
        currentAge,
        retirementYear,
        retirementPortfolio,
        desiredAnnualIncome,
        inflationRate,
        postRetirementGrowth,
        withdrawalRate,
        drawdownYears,
      }),
    [
      currentAge,
      retirementYear,
      retirementPortfolio,
      desiredAnnualIncome,
      inflationRate,
      postRetirementGrowth,
      withdrawalRate,
      drawdownYears,
    ]
  );

  return (
    <>
      {/* Parâmetros */}
      <div
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          padding: "18px 20px",
          marginBottom: 24,
          background: colors.panel,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 500, color: colors.muted, marginBottom: 16 }}>
          Parâmetros da aposentadoria
        </div>

        <NumberField
          label="Idade atual"
          inputMode="numeric"
          value={currentAgeInput}
          onChange={setCurrentAgeInput}
          onCommit={commitCurrentAge}
          isValid={isValidAge(currentAgeInput)}
          errorHint="Digite uma idade válida (1-119)"
        />

        <NumberField
          label="Patrimônio na aposentadoria (USD)"
          value={retirementPortfolioInput}
          onChange={setRetirementPortfolioInput}
          onCommit={commitRetirementPortfolio}
          isValid={isValidPositiveNumber(retirementPortfolioInput)}
          errorHint="Digite um valor positivo"
        />

        <NumberField
          label="Ano de aposentadoria"
          inputMode="numeric"
          value={retirementYearInput}
          onChange={setRetirementYearInput}
          onCommit={commitRetirementYear}
          isValid={isValidRetirementYear(retirementYearInput)}
          errorHint={`Digite um ano futuro (atual: ${TODAY_YEAR})`}
        />

        <NumberField
          label="Renda anual desejada (USD, em valores de hoje)"
          value={desiredIncomeInput}
          onChange={setDesiredIncomeInput}
          onCommit={commitDesiredIncome}
          isValid={isValidPositiveNumber(desiredIncomeInput)}
          errorHint="Digite um valor positivo"
        />

        <PercentSlider
          label="Taxa de inflação anual"
          value={inflationRate}
          onChange={setInflationRate}
          min={0}
          max={15}
          accent={colors.cyan}
        />

        <PercentSlider
          label="Crescimento pós-aposentadoria"
          value={postRetirementGrowth}
          onChange={setPostRetirementGrowth}
          min={-10}
          max={30}
          accent={colors.violet}
        />

        <PercentSlider
          label="Taxa de saque anual"
          value={withdrawalRate}
          onChange={setWithdrawalRate}
          min={0.5}
          max={10}
          accent={colors.green}
        />

        {/* Anos de simulação de saque — sem margem inferior por ser o último campo */}
        <div style={{ marginBottom: -16 }}>
          <NumberField
            label="Anos de simulação de saque"
            inputMode="numeric"
            value={drawdownYearsInput}
            onChange={setDrawdownYearsInput}
            onCommit={commitDrawdownYears}
            isValid={isValidPositiveInteger(drawdownYearsInput)}
            errorHint="Digite um número inteiro positivo"
          />
        </div>
      </div>

      {/* Cards de resumo */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <SummaryCard
          label="Idade na aposentadoria"
          value={`${calc.retirementAge} anos`}
          valueColor={colors.cyan}
          note={`em ${retirementYear}`}
        />
        <SummaryCard
          label="Anos na aposentadoria"
          value={`${drawdownYears} anos`}
          valueColor={colors.violet}
          note={`até ${calc.endAge} anos`}
        />
        <SummaryCard
          label="Renda anual desejada"
          value={fmtUsd(calc.nominalIncomeAtRetirement)}
          valueColor={colors.green}
          note="em valores de hoje"
        />
        <SummaryCard
          label="Saldo ao final"
          value={fmtUsd(calc.finalBalance)}
          valueColor={calc.finalBalance > 0 ? colors.green : colors.red}
          accentBorder={calc.finalBalance > 0 ? colors.green : colors.red}
          note={
            calc.depletionAge
              ? `acaba aos ${calc.depletionAge} anos`
              : `sobra aos ${calc.endAge} anos`
          }
          noteColor={calc.depletionAge ? colors.red : colors.faint}
        />
      </div>

      {/* Tabela de saque */}
      <div style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>
        Simulação de saques anuais após a aposentadoria em {retirementYear} (idade {calc.retirementAge})
      </div>
      <div className="bcd-scrollbar" style={{ ...scrollBox, marginBottom: 24 }}>
        <table className="bcd-table" style={tableStyle}>
          <thead>
            <tr style={{ background: colors.inputBg, color: colors.muted }}>
              <th style={thSticky}>ano</th>
              <th style={thSticky}>idade</th>
              <th style={{ ...thSticky, textAlign: "right" }}>saque</th>
              <th style={{ ...thSticky, textAlign: "right" }}>saldo restante</th>
            </tr>
          </thead>
          <tbody>
            {calc.drawdownTable.map((row) => (
              <tr
                key={row.year}
                style={{
                  borderTop: `1px solid ${colors.borderSubtle}`,
                  background: row.depleted ? colors.depletedRow : "transparent",
                }}
              >
                <td style={td}>{row.year}</td>
                <td style={td}>
                  {row.age}
                  {row.depleted && (
                    <span style={{ color: colors.red, fontSize: 10, marginLeft: 8 }}>dinheiro acaba</span>
                  )}
                </td>
                <td style={{ ...td, textAlign: "right", color: row.depleted ? colors.red : colors.text }}>
                  {fmtUsd(row.withdrawal)}
                </td>
                <td
                  style={{
                    ...td,
                    textAlign: "right",
                    fontWeight: 700,
                    color: row.depleted ? colors.red : colors.green,
                  }}
                >
                  {fmtUsd(row.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Avisos */}
      <div
        style={{
          fontSize: 11,
          color: colors.faint,
          lineHeight: 1.6,
          padding: "12px 16px",
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          background: colors.panel,
        }}
      >
        <strong style={{ color: colors.muted }}>Avisos importantes:</strong> Esta
        simulação usa um patrimônio inicial que você define manualmente. A inflação ({inflationRate}%)
        aumenta os saques anuais para manter o poder de compra constante. O crescimento
        pós-aposentadoria ({postRetirementGrowth}%) é uma taxa fixa que não modela ciclos
        ou volatilidade. O "Saldo ao final" mostra quanto sobraria após {drawdownYears} anos
        de saques, ou zero se o dinheiro acabar antes. Esta é uma ferramenta educacional
        simplificada, não é aconselhamento financeiro. Não considera impostos, taxas de
        corretagem, ou outros custos reais.
      </div>
    </>
  );
}
