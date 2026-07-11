import React, { useState } from "react";
import { X } from "lucide-react";
import { COLORS as C, FONT_MONO } from "../../styles/theme.js";
import { NS_DIMS } from "../../data/constants.js";

export default function CreateModal({ onCreate, onClose }) {
  const [name, setName] = useState("");

  const label = {
    fontFamily: FONT_MONO,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: C.inkStrong,
    display: "block",
    marginBottom: 8,
  };

  return (
    <div
      role="dialog"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26,26,26,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 30,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="dossier-in"
        style={{
          width: 420,
          maxWidth: "100%",
          background: C.paperRaised,
          border: `1px solid ${C.border}`,
          boxShadow: C.shadowDossier,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 18px",
            borderBottom: `1px solid ${C.border}`,
            background: C.paperSoft,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 10, height: 10, background: C.green, display: "inline-block" }} />
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: C.inkStrong,
              }}
            >
              Nouvelle sandbox
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.inkFaint, padding: 2 }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: "22px 22px 20px" }}>
          <p style={{ margin: "0 0 18px", fontSize: 12.5, color: C.inkSoft, lineHeight: 1.55 }}>
            Provisionne un environnement isolé sur le nœud <span style={{ fontFamily: FONT_MONO, color: C.ink }}>saint-jean-lab-01</span>.
            Nommage libre — les 5 dimensions d'isolation sont appliquées par défaut.
          </p>

          <label style={label}>Nom virtuel <span style={{ color: C.inkFaint, fontWeight: 500 }}>(optionnel)</span></label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex. demo-injection"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: C.paperSoft,
              border: `1px solid ${C.border}`,
              padding: "10px 12px",
              fontFamily: FONT_MONO,
              fontSize: 13,
              color: C.ink,
              outline: "none",
              marginBottom: 18,
              borderRadius: 0,
            }}
          />

          <label style={label}>Dimensions appliquées</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 22 }}>
            {NS_DIMS.map((d) => (
              <span
                key={d.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: C.green,
                  border: `1px solid ${C.green}`,
                  background: C.greenTint,
                  padding: "4px 8px",
                }}
              >
                <d.icon size={11} strokeWidth={2} /> {d.key}
              </span>
            ))}
          </div>

          <button
            onClick={() => onCreate(name)}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: C.green,
              color: "#fff",
              border: "none",
              fontFamily: FONT_MONO,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Provisionner
          </button>
        </div>
      </div>
    </div>
  );
}
