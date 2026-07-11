import React, { useState } from "react";
import { Shield, CheckCircle2 } from "lucide-react";
import Badge from "../common/Badge.jsx";
import { COLORS as C, FONT_MONO } from "../../styles/theme.js";
import { STATUT, DEFENSES } from "../../data/constants.js";
import { PageHeader } from "../dashboard/DashboardPage.jsx";

export default function DefensePage({ sandboxes, onRun }) {
  const sb = sandboxes.find((s) => s.statut === STATUT.EN_COURS);
  const [results, setResults] = useState({});

  function run(d) {
    if (!sb) return;
    onRun(sb.id, d.testPayload);
    setResults((r) => ({ ...r, [d.key]: true }));
  }

  return (
    <div style={{ padding: "28px 32px" }}>
      <PageHeader
        eyebrow="Module Defense"
        title="Contre-mesures d'isolation"
        subtitle="Les mêmes charges utiles doivent échouer ici — preuve d'efficacité des protections."
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            border: `1px solid ${C.green}`,
            background: C.greenTint,
          }}
        >
          <Shield size={13} strokeWidth={2} style={{ color: C.green }} />
          <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.green }}>
            Backend durci
          </span>
        </div>
        <Badge tone="ink">Whitelist + user namespace</Badge>
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
          Provisionne une sandbox active pour tester les protections.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {DEFENSES.map((d, i) => (
          <div
            key={d.key}
            className="dossier-in"
            style={{
              background: C.paperRaised,
              border: `1px solid ${C.border}`,
              borderTop: `3px solid ${C.green}`,
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
                color: C.green,
                marginBottom: 6,
              }}
            >
              Fix — {String(i + 1).padStart(2, "0")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <d.icon size={14} strokeWidth={1.8} style={{ color: C.green }} />
              <div style={{ fontFamily: FONT_MONO, fontSize: 15, fontWeight: 600, color: C.ink }}>
                {d.title}
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.55, marginBottom: 14 }}>{d.body}</p>
            <button
              onClick={() => run(d)}
              disabled={!sb}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: `1px solid ${C.green}`,
                background: results[d.key] ? C.greenTint : "transparent",
                color: C.green,
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
              <CheckCircle2 size={12} /> {results[d.key] ? "Vérifiée" : "Tester"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
