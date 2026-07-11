import React from "react";
import { COLORS as C, FONT_MONO } from "../../styles/theme.js";

export default function StatCard({ icon: Icon, label, value, tone = "green" }) {
  const fg = tone === "green" ? C.green : tone === "rust" ? C.rust : C.ink;
  return (
    <div
      className="dossier-in"
      style={{
        background: C.paperRaised,
        border: `1px solid ${C.border}`,
        padding: "16px 18px 18px",
        flex: 1,
        minWidth: 168,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 40,
          height: 2,
          background: fg,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <Icon size={13} strokeWidth={1.8} style={{ color: fg }} />
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: C.inkStrong,
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 30,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: C.ink,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}
