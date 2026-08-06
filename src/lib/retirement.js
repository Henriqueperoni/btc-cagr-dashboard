// Simulação de aposentadoria (fase de saque). Função pura, testável isoladamente.
import { TODAY_YEAR } from "../constants.js";

// Limite de segurança para o loop de simulação, caso drawdownYears venha absurdo em testes.
const MAX_DRAWDOWN_YEARS = 200;

export function computeRetirement({
  currentAge,
  retirementYear,
  retirementPortfolio,
  desiredAnnualIncome,
  inflationRate,
  postRetirementGrowth,
  withdrawalRate,
  drawdownYears,
  currentYear = TODAY_YEAR,
}) {
  const yearsToRetirement = retirementYear - currentYear;
  const retirementAge = currentAge + yearsToRetirement;

  // guardrail: drawdownYears sempre inteiro >= 0 e limitado, para o loop nunca disparar
  const years = Math.max(0, Math.min(Math.floor(drawdownYears) || 0, MAX_DRAWDOWN_YEARS));
  const endAge = retirementAge + years;

  // Patrimônio inicial definido manualmente pelo usuário.
  const portfolioValueAtRetirement = retirementPortfolio;

  // Renda em valores de hoje (poder de compra constante).
  const nominalIncomeAtRetirement = desiredAnnualIncome;

  // Clampa a taxa de saque num mínimo de 0.5% para nunca dividir por zero.
  const safeWithdrawalRate = Math.max(0.5, withdrawalRate) / 100;
  const requiredPortfolio = nominalIncomeAtRetirement / safeWithdrawalRate;
  const fundedPercent = (portfolioValueAtRetirement / requiredPortfolio) * 100;

  // Simulação de saque: a cada ano saca a renda, o restante cresce postRetirementGrowth% e o
  // saque do ano seguinte sobe pela inflação (mantém o poder de compra). Para no ano em que o
  // saldo zera.
  const drawdownTable = [];
  let balance = portfolioValueAtRetirement;
  let withdrawal = nominalIncomeAtRetirement;
  let depletionYear = null;
  let depletionAge = null;

  for (let i = 0; i < years; i++) {
    const year = retirementYear + i;
    const age = retirementAge + i;
    const endingBalance = balance - withdrawal;

    if (endingBalance <= 0 && depletionYear == null) {
      depletionYear = year;
      depletionAge = age;
      drawdownTable.push({ year, age, withdrawal, balance: 0, depleted: true });
      break;
    }

    drawdownTable.push({ year, age, withdrawal, balance: endingBalance, depleted: false });

    balance = endingBalance * (1 + postRetirementGrowth / 100);
    withdrawal = withdrawal * (1 + inflationRate / 100);
  }

  // Saldo ao final (o que sobra na morte / fim da simulação).
  const finalBalance =
    drawdownTable.length > 0 ? drawdownTable[drawdownTable.length - 1].balance : portfolioValueAtRetirement;

  return {
    portfolioValueAtRetirement,
    nominalIncomeAtRetirement,
    requiredPortfolio,
    fundedPercent,
    drawdownTable,
    depletionYear,
    depletionAge,
    finalBalance,
    retirementAge,
    endAge,
  };
}
