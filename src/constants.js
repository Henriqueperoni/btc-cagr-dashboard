// Dados e configuração compartilhados pelo dashboard.

// Preço do BTC em 1º de janeiro de cada ano. 2015-2025: Yahoo Finance / dados agregados
// CoinGecko, artigo "Bitcoin's Price Every New Year's Day For Last Decade". 2012-2014: sem
// registro de 1/jan específico numa fonte única, usei o preço de fechamento de 31/dez do ano
// anterior (Fool.com / "Buy Bitcoin Worldwide"), que é uma aproximação razoável mas menos
// precisa que os anos mais recentes.
export const ANCHOR_POINTS = [
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

export const TODAY = { date: "2026-07-26", price: 64500 };

// TODAY.date é constante, então o ano corrente também é — calculado uma vez aqui em vez de
// refazer new Date(TODAY.date).getFullYear() espalhado pelo código.
export const TODAY_YEAR = new Date(TODAY.date).getFullYear();

// Série mensal aproximada só para desenhar a forma do gráfico (não usada nos cálculos de CAGR).
// Construída a partir de marcos de preço amplamente conhecidos (topos e fundos de ciclo).
// Começa em 2015 pra não esmagar o eixo Y com os preços de centavos/dezenas de 2013-14.
// Não é uma série de fechamento diário oficial — tratar como ilustrativa.
export const MONTHLY_SERIES = [
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

// Horizonte da simulação de preço futura (anos à frente de TODAY_YEAR).
export const PROJECTION_YEARS = 24;

// Tamanho das janelas móveis de CAGR (2012–2016, 2013–2017, ...).
export const WINDOW = 4;
