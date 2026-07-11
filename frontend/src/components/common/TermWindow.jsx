import React from "react";
import { COLORS as C, FONT_MONO } from "../../styles/theme.js";

/**
 * Fenêtre terminal — chrome minimal, deux barres mono avec un point
 * accent, ombre décalée papier. Reste dark : c'est l'élément signature.
 */
export default function TermWindow({ title, children, accent = C.green, style }) {
  return (
    <div
      style={{
        background: C.term,
        border: `1px solid ${C.termLine}`,
        boxShadow: C.shadowDossier,
        borderRadius: 0,
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          background: C.termRaised,
          borderBottom: `1px solid ${C.termLine}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 8, height: 8, background: accent, display: "inline-block" }} />
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#8AA098",
            }}
          >
            {title}
          </span>
        </div>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9.5,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#4C6157",
          }}
        >
          tty0
        </span>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}
