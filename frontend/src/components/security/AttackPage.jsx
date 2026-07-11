import React, { useState } from "react";
import { Swords, AlertTriangle } from "lucide-react";
import Badge from "../common/Badge.jsx";
import { COLORS as C, FONT_MONO } from "../../styles/theme.js";
import { STATUT, VULNS } from "../../data/constants.js";
import { PageHeader } from "../dashboard/DashboardPage.jsx";

export default function AttackPage({ sandboxes, onRun }) {
  const sb = sandboxes.find((s) => s.statut === STATUT.EN_COURS);
  const [results, setResults] = useState({});

  function run(v) {
    if (!sb) return;
    onRun(sb.id, v.payload);
    setResults((r) => ({ ...r, [v.key]: true }));
  }

  return (
    <div style={{ padding: "28px 32px" }}>
      <PageHeader
        eyebrow="Module Attack"
        title="Vecteurs de vulnérabilité"
        subtitle="Démonstration académique de trois failles introduites volontairement dans une pile non sécurisée."
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            border: `1px solid ${C.rust}`,
            background: C.rustTint,
          }}
        >
          <Swords size={13} strokeWidth={2} style={{ color: C.rust }} />
          <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.rust }}>
            Backend non sécurisé
          </span>
        </div>
        <Badge tone="ink">Cadre strictement pédagogique</Badge>
      </div>

      {!sb && (
        <div
          style={{
            marginBottom: 18,
            padding: "10px 14px",
            border: `1px solid ${C.amber}`,
            background: C.amberTint,
            fontFamily: FONT_MONO,
            fontSize: 11.5,
            color: C.amber,
          }}
        >
          Provisionne une sandbox active pour lancer les démonstrations.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {VULNS.map((v, i) => (
          <div
            key={v.key}
            className="dossier-in"
            style={{
              background: C.paperRaised,
              border: `1px solid ${C.border}`,
              borderTop: `3px solid ${C.rust}`,
              padding: "16px 18px",
              boxShadow: C.shadowDossierSm,
            }}
          >
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: C.rust,
                marginBottom: 6,
              }}
            >
              Cve — {String(i + 1).padStart(2, "0")}
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 8 }}>
              {v.title}
            </div>
            <p style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.55, marginBottom: 12 }}>{v.body}</p>
            <code
              style={{
                display: "block",
                background: C.term,
                color: "#E39A7A",
                fontFamily: FONT_MONO,
                fontSize: 11.5,
                padding: "9px 11px",
                marginBottom: 14,
                borderRadius: 0,
              }}
            >
              $ {v.payload}
            </code>
            <button
              onClick={() => run(v)}
              disabled={!sb}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: `1px solid ${C.rust}`,
                background: results[v.key] ? C.rustTint : "transparent",
                color: C.rust,
                padding: "8px 14px",
                fontFamily: FONT_MONO,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                cursor: sb ? "pointer" : "not-allowed",
                opacity: sb ? 1 : 0.5,
              }}
            >
              <AlertTriangle size={12} /> {results[v.key] ? "Rejouée" : "Lancer"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
