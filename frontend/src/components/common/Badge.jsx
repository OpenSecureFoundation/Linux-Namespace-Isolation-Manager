import React from "react";
import { COLORS as C, FONT_MONO } from "../../styles/theme.js";

export default function Badge({ children, tone = "green" }) {
  const map = {
    green: { bg: C.greenTint, fg: C.green, bd: C.green },
    rust:  { bg: C.rustTint,  fg: C.rust,  bd: C.rust },
    amber: { bg: C.amberTint, fg: C.amber, bd: C.amber },
    ink:   { bg: C.paperSoft, fg: C.inkStrong, bd: C.border },
    // aliases hérités
    blue:     { bg: C.rustTint, fg: C.rust, bd: C.rust },
    blueSoft: { bg: C.amberTint, fg: C.amber, bd: C.amber },
  }[tone] || { bg: C.paperSoft, fg: C.inkStrong, bd: C.border };

  return (
    <span
      style={{
        background: map.bg,
        color: map.fg,
        border: `1px solid ${map.bd}`,
        fontFamily: FONT_MONO,
        fontSize: 9.5,
        letterSpacing: "0.14em",
        padding: "3px 8px",
        borderRadius: 0,
        fontWeight: 700,
        textTransform: "uppercase",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
