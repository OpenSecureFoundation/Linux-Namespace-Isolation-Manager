import React from "react";
import { X } from "lucide-react";
import { COLORS as C, FONT_MONO } from "../../styles/theme.js";

export default function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        width: 360,
      }}
    >
      {toasts.map((t) => {
        const isError = t.tone === "error";
        const accent = isError ? C.rust : C.green;
        return (
          <div
            key={t.id}
            className="dossier-in"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              background: C.paperRaised,
              border: `1px solid ${C.border}`,
              borderLeft: `4px solid ${accent}`,
              padding: "12px 14px",
              boxShadow: C.shadowDossierSm,
              borderRadius: 0,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: accent,
                  marginBottom: 4,
                }}
              >
                {isError ? "Erreur" : "Confirmation"}
              </div>
              <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5 }}>{t.text}</div>
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: C.inkFaint,
                padding: 2,
              }}
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
