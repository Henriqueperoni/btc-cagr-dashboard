// Shell do dashboard: estado compartilhado (preço atual + busca de preço/histórico), o seletor
// de abas e o motor de projeção de preço/CAGR que tanto o gráfico quanto a aba CAGR consomem.
// Cada aba fica em seu próprio componente; as duas permanecem montadas (alternadas via
// display) para preservar seus valores ao trocar de aba.
import { useEffect, useMemo, useState } from "react";
import { colors } from "./theme.js";
import { TODAY } from "./constants.js";
import { projectRows, buildYearlyPrices, rollingCagr } from "./lib/cagr.js";
import PriceHeader from "./components/PriceHeader.jsx";
import CagrTab from "./tabs/CagrTab.jsx";
import RetirementTab from "./tabs/RetirementTab.jsx";

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "inherit",
        fontSize: 13,
        fontWeight: 500,
        color: active ? colors.amber : colors.muted,
        background: "none",
        border: "none",
        borderBottom: active ? `2px solid ${colors.amber}` : "2px solid transparent",
        padding: "8px 16px",
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}

export default function BtcCagrDashboard() {
  const [activeTab, setActiveTab] = useState("cagr"); // 'cagr' | 'retirement'
  const [logScale, setLogScale] = useState(true);
  const [showPowerLaw, setShowPowerLaw] = useState(true);
  const [futureCagr, setFutureCagr] = useState(30); // % ao ano
  const [cagrDecay, setCagrDecay] = useState(5); // % de queda do CAGR a cada ano
  const [currentPrice, setCurrentPrice] = useState(TODAY.price);
  const [priceInput, setPriceInput] = useState(String(TODAY.price));
  const [historicalData, setHistoricalData] = useState(null);
  const [isLivePrice, setIsLivePrice] = useState(false);
  const [cagrOverrides, setCagrOverrides] = useState({});

  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const price = data?.bitcoin?.usd;
        if (price > 0) {
          setCurrentPrice(price);
          setPriceInput(String(price));
          setIsLivePrice(true);
        }
      })
      .catch((err) => console.warn("[BTC] live price fetch failed:", err.message));

    fetch("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=max&interval=daily")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data?.prices) && data.prices.length > 0) {
          setHistoricalData(data.prices);
        }
      })
      .catch((err) => console.warn("[BTC] historical data fetch failed:", err.message));
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

  // Motor de projeção: derivações consumidas pelo gráfico e pela aba CAGR. Ficam no shell porque
  // são compartilhadas; o cálculo em si vive em lib/cagr.js.
  const projectedRows = useMemo(
    () => projectRows({ currentPrice, futureCagr, cagrDecay, cagrOverrides }),
    [futureCagr, cagrDecay, currentPrice, cagrOverrides]
  );

  const yearlyPrices = useMemo(
    () => buildYearlyPrices({ currentPrice, projectedRows }),
    [currentPrice, projectedRows]
  );

  const rollingCagrRows = useMemo(() => rollingCagr(yearlyPrices), [yearlyPrices]);

  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        background: colors.bg,
        color: colors.text,
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
        <PriceHeader
          priceInput={priceInput}
          setPriceInput={setPriceInput}
          commitPrice={commitPrice}
          isLivePrice={isLivePrice}
        />

        {/* Seletor de abas */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: `1px solid ${colors.border}` }}>
          <TabButton active={activeTab === "cagr"} onClick={() => setActiveTab("cagr")}>
            CAGR Dashboard
          </TabButton>
          <TabButton active={activeTab === "retirement"} onClick={() => setActiveTab("retirement")}>
            Aposentadoria
          </TabButton>
        </div>

        {/* Ambas as abas permanecem montadas; a inativa fica escondida para preservar seu estado. */}
        <div style={{ display: activeTab === "cagr" ? "block" : "none" }}>
          <CagrTab
            currentPrice={currentPrice}
            historicalData={historicalData}
            logScale={logScale}
            setLogScale={setLogScale}
            showPowerLaw={showPowerLaw}
            setShowPowerLaw={setShowPowerLaw}
            futureCagr={futureCagr}
            setFutureCagr={setFutureCagr}
            cagrDecay={cagrDecay}
            setCagrDecay={setCagrDecay}
            cagrOverrides={cagrOverrides}
            setCagrOverrides={setCagrOverrides}
            projectedRows={projectedRows}
            rollingCagrRows={rollingCagrRows}
          />
        </div>
        <div style={{ display: activeTab === "retirement" ? "block" : "none" }}>
          <RetirementTab />
        </div>
      </div>
    </div>
  );
}
