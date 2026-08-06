// Campo de texto numérico com validação e borda vermelha quando inválido. Encapsula o padrão
// repetido dos inputs da aba de aposentadoria (idade, patrimônio, ano, renda, anos de saque):
// estado de texto controlado pelo pai, commit no blur/Enter, mensagem de erro abaixo.
import { colors } from "../theme.js";

export default function NumberField({
  label,
  value, // string (input controlado)
  onChange, // (raw: string) => void
  onCommit, // (raw: string) => void — validar/normalizar aqui
  isValid, // boolean
  errorHint, // texto mostrado quando inválido
  inputMode = "decimal",
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 12, color: colors.muted, display: "block", marginBottom: 6 }}>
        {label}
      </label>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onCommit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit(value);
        }}
        style={{
          fontFamily: "inherit",
          fontSize: 14,
          color: colors.text,
          background: colors.inputBg,
          border: `1px solid ${isValid ? colors.border : colors.red}`,
          borderRadius: 4,
          padding: "6px 10px",
          width: "100%",
        }}
      />
      {!isValid && (
        <div style={{ fontSize: 10, color: colors.red, marginTop: 4 }}>{errorHint}</div>
      )}
    </div>
  );
}
