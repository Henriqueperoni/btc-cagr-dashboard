// Rótulo "CAGR: x%" clicável que vira input para editar o CAGR de um ano específico da
// projeção. Vazio + Enter/blur remove o override (volta ao valor calculado).
import { useState } from "react";
import { colors } from "../theme.js";

export default function CagrInput({ year, rate, isOverridden, onCommit }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");

  function startEdit() {
    setVal((rate * 100).toFixed(1));
    setEditing(true);
  }

  function commit(raw) {
    setEditing(false);
    if (raw.trim() === "") {
      onCommit(year, null);
      return;
    }
    const n = parseFloat(raw);
    if (isFinite(n)) onCommit(year, n);
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(val);
          if (e.key === "Escape") setEditing(false);
        }}
        style={{
          fontFamily: "inherit",
          fontSize: 10,
          width: 52,
          background: colors.bg,
          border: `1px solid ${colors.violet}`,
          borderRadius: 3,
          color: colors.violet,
          padding: "1px 4px",
          textAlign: "right",
        }}
      />
    );
  }

  return (
    <span
      onClick={startEdit}
      title="clique para editar"
      style={{
        color: isOverridden ? colors.amber : colors.violet,
        cursor: "text",
        borderBottom: "1px dashed",
        borderColor: isOverridden ? colors.amber : colors.violet,
      }}
    >
      CAGR: {(rate * 100).toFixed(1)}%
    </span>
  );
}
