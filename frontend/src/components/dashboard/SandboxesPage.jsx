import React from "react";
import SandboxCard from "./SandboxCard.jsx";
import { PageHeader, SectionHeader, EmptyState } from "./DashboardPage.jsx";

export default function SandboxesPage({ sandboxes, onSelect, onDestroy, onOpenCreate }) {
  return (
    <div style={{ padding: "28px 32px" }}>
      <PageHeader
        eyebrow="Section B"
        title="Sandboxes"
        subtitle="Répertoire complet des environnements isolés — actifs, arrêtés, en erreur."
      />
      <SectionHeader title={`Registre · ${String(sandboxes.length).padStart(2, "0")} entrée${sandboxes.length > 1 ? "s" : ""}`} onAction={onOpenCreate} actionLabel="Nouvelle" />

      {sandboxes.length === 0 ? (
        <EmptyState text="Registre vide. Provisionnez un premier environnement pour commencer." />
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
