// Slider de porcentagem com rótulo e valor destacado. Cobre os sliders simples da aba de
// aposentadoria (inflação, crescimento pós-aposentadoria, taxa de saque). Os sliders da aba
// CAGR têm réguas de marcações próprias e ficam inline lá.
export default function PercentSlider({ label, value, onChange, min, max, step = 0.5, accent }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 12, color: "#7a8189" }}>{label}</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: accent }}>{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: accent, cursor: "pointer" }}
      />
    </div>
  );
}
