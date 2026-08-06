// Objetos de estilo compartilhados. Hasteados para fora do render para não serem recriados a
// cada frame (o padrão que th/td já usavam — estendido aqui para os demais primitivos).
import { colors } from "../theme.js";

export const th = {
  textAlign: "left",
  padding: "10px 14px",
  fontWeight: 500,
  fontSize: 11,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
};

export const td = {
  padding: "10px 14px",
  color: colors.text,
};

// Célula de cabeçalho fixa (sticky) usada nas duas tabelas.
export const thSticky = {
  ...th,
  position: "sticky",
  top: 0,
  background: colors.inputBg,
};

// Painel/card padrão (borda + cantos arredondados + fundo).
export const panel = {
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  background: colors.panel,
};

// Container rolável usado pelas tabelas.
export const scrollBox = {
  overflowX: "auto",
  overflowY: "auto",
  maxHeight: 420,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
};

export const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};
