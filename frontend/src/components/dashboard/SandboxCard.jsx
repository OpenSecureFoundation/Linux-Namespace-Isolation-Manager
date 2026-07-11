import React from "react";
import { Trash2, ArrowRight } from "lucide-react";
import Dot from "../common/Dot.jsx";
import { COLORS as C, FONT_MONO, FONT_SANS } from "../../styles/theme.js";
import { STATUT } from "../../data/constants.js";
import { formatDateTime } from "../../utils/helpers.js";

const STATUT_LABEL = {
  [STATUT.CREATION]: "création",
  [STATUT.EN_COURS]: "en cours",
  [STATUT.DESTRUCTION]: "destruction",
  [STATUT.ARRETEE]: "arrêtée",
  [STATUT.EN_ERREUR]: "en erreur",
};

/**
 * Carte sandbox — dossier technique : chrome papier, tampon statut,
 * lignes de meta en mono, actions discrètes en pied.
 */
export default function SandboxCard({ sb, onSelect, onDestroy }) {
  const active = sb.statut === STATUT.EN_COURS;
  const meta = (label, value) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "4px 0" }}>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 9.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: C.inkFaint,
          fontWeight: 700,
          width: 68,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.ink, wordBreak: "break-all" }}>
        {value}
      </span>
    </div>
  );

  return (
    <div
      className="dossier-in"
      style={{
        background: C.paperRaised,
        border: `1px solid ${C.border}`,
        boxShadow: C.shadowDossierSm,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header dossier */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: `1px solid ${C.border}`,
          background: C.paperSoft,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <Dot statut={sb.statut} />
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 12,
              fontWeight: 600,
              color: C.ink,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {sb.nomVirtuel}
          </span>
        </div>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: active ? C.green : sb.statut === STATUT.EN_ERREUR ? C.rust : C.inkFaint,
            border: `1px solid ${active ? C.green : sb.statut === STATUT.EN_ERREUR ? C.rust : C.borderStrong}`,
            padding: "2px 6px",
          }}
        >
          {STATUT_LABEL[sb.statut] || sb.statut}
        </span>
      </div>

      {/* Corps meta */}
      <div style={{ padding: "14px 16px" }}>
        {meta("Réf", sb.id ? sb.id.slice(0, 8).toUpperCase() : "—")}
        {meta("PID racine", sb.pidRacine ?? "—")}
        {meta("Créée le", sb.dateCreation ? formatDateTime(sb.dateCreation) : "—")}
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          borderTop: `1px solid ${C.border}`,
          background: C.paperSoft,
        }}
      >
        <button
          onClick={() => active && onSelect(sb.id)}
          disabled={!active}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "10px 12px",
            background: "transparent",
            border: "none",
            borderRight: `1px solid ${C.border}`,
            fontFamily: FONT_MONO,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: active ? C.green : C.inkFaint,
            cursor: active ? "pointer" : "not-allowed",
          }}
        >
          Ouvrir <ArrowRight size={12} strokeWidth={2.2} />
        </button>
        <button
          onClick={() => onDestroy(sb.id)}
          style={{
            padding: "10px 14px",
            background: "transparent",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: FONT_MONO,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: C.rust,
            cursor: "pointer",
          }}
        >
          <Trash2 size={12} /> Détruire
        </button>
      </div>
    </div>
  );
}
