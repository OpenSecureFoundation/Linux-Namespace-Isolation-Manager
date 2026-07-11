import React from "react";
import { COLORS as C, FONT_MONO } from "../../styles/theme.js";

export default function NavItem({ icon: Icon, label, active, onClick, danger, badge }) {
  const accent = danger ? C.rust : C.green;
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "9px 10px 9px 12px",
        border: "none",
        borderRadius: 0,
        cursor: "pointer",
        background: active ? (danger ? C.rustTint : C.greenTint) : "transparent",
        color: active ? accent : C.inkStrong,
        fontFamily: FONT_MONO,
        fontSize: 11,
        fontWeight: active ? 700 : 500,
        letterSpacing: "0.06em",
        textAlign: "left",
        textTransform: "none",
        transition: "background 120ms, color 120ms",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "rgba(31,122,76,0.05)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {active && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 6,
            bottom: 6,
            width: 2,
            background: accent,
          }}
        />
      )}
      <Icon size={14} strokeWidth={1.8} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9.5,
            fontWeight: 700,
            color: accent,
            border: `1px solid ${accent}55`,
            padding: "1px 5px",
            letterSpacing: "0.05em",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
