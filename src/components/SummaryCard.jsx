// Card de resumo da aba de aposentadoria: rótulo, valor grande e nota opcional. A borda e a
// cor do valor podem ser destacadas (verde/vermelho) via accent.
import { colors } from "../theme.js";

export default function SummaryCard({ label, value, valueColor = colors.text, note, noteColor = colors.faint, accentBorder }) {
  return (
    <div
      style={{
        border: `1px solid ${accentBorder || colors.border}`,
        borderRadius: 6,
        padding: "14px 16px",
        background: colors.panel,
      }}
    >
      <div style={{ fontSize: 11, color: colors.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: valueColor }}>{value}</div>
      {note != null && (
        <div style={{ fontSize: 10, color: noteColor, marginTop: 4 }}>{note}</div>
      )}
    </div>
  );
}
