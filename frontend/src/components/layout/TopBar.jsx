import React from "react";
import { Shield, Swords } from "lucide-react";
import { COLORS as C, FONT_MONO } from "../../styles/theme.js";

/**
 * Bandeau de contexte — chapelet de fil d'Ariane mono + bascule
 * ATTACK/DEFENSE en pastille rectangulaire. Pas de radius, pas de gradient.
 */
export default function TopBar({ title, mode, setMode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 28px",
        borderBottom: `1px solid ${C.border}`,
        background: C.paperRaised,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: C.inkFaint,
          }}
        >
          Portal //
        </span>
        <h1
          style={{
            fontFamily: FONT_MONO,
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: "-0.005em",
            color: C.ink,
            margin: 0,
          }}
        >
          {title}
        </h1>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          border: `1px solid ${C.border}`,
          background: C.paperSoft,
        }}
      >
        <ModeBtn
          active={mode === "defense"}
          onClick={() => setMode("defense")}
          icon={Shield}
          color={C.green}
        >
          Defense
        </ModeBtn>
        <div style={{ width: 1, background: C.border }} />
        <ModeBtn
          active={mode === "attack"}
          onClick={() => setMode("attack")}
          icon={Swords}
          color={C.rust}
        >
          Attack
        </ModeBtn>
      </div>
    </div>
  );
}

function ModeBtn({ active, onClick, icon: Icon, color, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "8px 14px",
        border: "none",
        cursor: "pointer",
        background: active ? color : "transparent",
        color: active ? "#fff" : C.inkStrong,
        fontFamily: FONT_MONO,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
      }}
    >
      <Icon size={12} strokeWidth={2} /> {children}
    </button>
  );
}
