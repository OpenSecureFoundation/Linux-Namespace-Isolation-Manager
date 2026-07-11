import React, { useState } from "react";
import { X } from "lucide-react";
import { COLORS as C, FONT_MONO } from "../../styles/theme.js";
import { NS_DIMS } from "../../data/constants.js";

// Un seul namespace isolé par sandbox (refonte). L'utilisateur choisit ici
// lequel — les 4 types exposés par le helper C (cf. helper/sandbox_helper.c).
const NS_CHOICES = NS_DIMS.filter((d) => d.key !== "USER");

export default function CreateModal({ onCreate, onClose }) {
  const [name, setName] = useState("");
  const [nsType, setNsType] = useState("MNT"); // défaut : répertoires/fichiers

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
        position: "fixed", inset: 0, background: "rgba(26,26,26,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 30, padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="dossier-in"
        style={{
          width: 460, maxWidth: "100%",
          background: C.paperRaised,
          border: `1px solid ${C.border}`,
          boxShadow: C.shadowDossier,
        }}
      >
        <div
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 18px", borderBottom: `1px solid ${C.border}`,
            background: C.paperSoft,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 10, height: 10, background: C.green, display: "inline-block" }} />
            <span
              style={{
                fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700,
                letterSpacing: "0.18em", textTransform: "uppercase", color: C.inkStrong,
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
            Chaque sandbox isole <strong>un seul</strong> type de ressource — choisissez lequel
            emprisonner. Par défaut : <span style={{ fontFamily: FONT_MONO, color: C.ink }}>MNT</span>{" "}
            (arborescence de fichiers).
          </p>

          <label style={label}>Nom virtuel <span style={{ color: C.inkFaint, fontWeight: 500 }}>(optionnel)</span></label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex. demo-injection"
            style={{
              width: "100%", boxSizing: "border-box",
              background: C.paperSoft, border: `1px solid ${C.border}`,
              padding: "10px 12px",
              fontFamily: FONT_MONO, fontSize: 13, color: C.ink,
              outline: "none", marginBottom: 20, borderRadius: 0,
            }}
          />

          <label style={label}>Type d'isolation</label>
          <div
            role="radiogroup"
            style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 22 }}
          >
            {NS_CHOICES.map((d) => {
              const active = nsType === d.key;
              return (
                <button
                  key={d.key}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setNsType(d.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px",
                    background: active ? C.greenTint : C.paperSoft,
                    border: `1px solid ${active ? C.green : C.border}`,
                    color: active ? C.green : C.ink,
                    fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  <d.icon size={14} strokeWidth={2} />
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span>{d.key}</span>
                    <span
                      style={{
                        fontSize: 9, fontWeight: 500, letterSpacing: "0.08em",
                        color: active ? C.green : C.inkFaint, textTransform: "none",
                      }}
                    >
                      {d.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onCreate(name, nsType)}
            style={{
              width: "100%", padding: "12px 16px",
              background: C.green, color: "#fff", border: "none",
              fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700,
              letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer",
            }}
          >
            Provisionner
          </button>
        </div>
      </div>
    </div>
  );
}
