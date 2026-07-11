import React from "react";
import { Box, Terminal, Activity, Fingerprint, Plus } from "lucide-react";
import StatCard from "./StatCard.jsx";
import SandboxCard from "./SandboxCard.jsx";
import { COLORS as C, FONT_MONO } from "../../styles/theme.js";
import { STATUT } from "../../data/constants.js";

export default function DashboardPage({ sandboxes, onSelect, onDestroy, onOpenCreate, commandes }) {
  const active = sandboxes.filter((s) => s.statut === STATUT.EN_COURS).length;

  return (
    <div style={{ padding: "28px 32px" }}>
      <PageHeader
        eyebrow="Section A"
        title="Tableau de bord"
        subtitle="État consolidé des environnements isolés provisionnés sur le nœud."
      />

      <div style={{ display: "flex", gap: 14, marginBottom: 32, flexWrap: "wrap" }}>
        <StatCard icon={Box} label="Sandboxes actives" value={String(active).padStart(2, "0")} />
        <StatCard icon={Terminal} label="Commandes exécutées" value={String(commandes.length).padStart(3, "0")} />
        <StatCard icon={Activity} label="Latence moyenne" value="86 ms" />
        <StatCard icon={Fingerprint} label="Dimensions" value="05" />
      </div>

      <SectionHeader title="Environnements isolés" onAction={onOpenCreate} actionLabel="Nouvelle" />

      {sandboxes.length === 0 ? (
        <EmptyState text="Aucun environnement provisionné. Créez votre premier isolat." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
          {sandboxes.map((sb) => (
            <SandboxCard key={sb.id} sb={sb} onSelect={onSelect} onDestroy={onDestroy} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle }) {
  return (
    <header style={{ marginBottom: 26 }}>
      {eyebrow && (
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: C.green,
            marginBottom: 8,
          }}
        >
          — {eyebrow}
        </div>
      )}
      <h2
        style={{
          fontFamily: FONT_MONO,
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: C.ink,
          margin: "0 0 6px",
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p style={{ margin: 0, color: C.inkSoft, fontSize: 13, maxWidth: 620, lineHeight: 1.55 }}>
          {subtitle}
        </p>
      )}
    </header>
  );
}

export function SectionHeader({ title, onAction, actionLabel }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
        paddingBottom: 10,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: C.inkStrong,
        }}
      >
        {title}
      </div>
      {onAction && (
        <button
          onClick={onAction}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: C.green,
            color: "#fff",
            border: "none",
            padding: "9px 14px",
            fontFamily: FONT_MONO,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          <Plus size={12} strokeWidth={2.5} /> {actionLabel || "Ajouter"}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ text }) {
  return (
    <div
      style={{
        border: `1px dashed ${C.borderStrong}`,
        padding: "56px 20px",
        textAlign: "center",
        color: C.inkFaint,
        fontFamily: FONT_MONO,
        fontSize: 11.5,
        letterSpacing: "0.06em",
        background: C.paperSoft,
      }}
    >
      {text}
    </div>
  );
}
