import React from "react";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import Badge from "../common/Badge.jsx";
import { COLORS as C, FONT_MONO } from "../../styles/theme.js";
import { formatDateTime } from "../../utils/helpers.js";
import { PageHeader, EmptyState } from "../dashboard/DashboardPage.jsx";

/**
 * Historique — matérialise la classe Commande. Rendu tableau papier avec
 * en-têtes mono en petites capitales et lignes fines.
 */
export default function HistoryPage({ commandes }) {
  return (
    <div style={{ padding: "28px 32px" }}>
      <PageHeader
        eyebrow="Section D"
        title="Journal d'exécutions"
        subtitle="Chaque commande exécutée dans une sandbox — horodatage, identifiant, résultat."
      />

      {commandes.length === 0 ? (
        <EmptyState text="Aucune commande enregistrée. Ouvrez un terminal pour commencer." />
      ) : (
        <div style={{ background: C.paperRaised, border: `1px solid ${C.border}`, boxShadow: C.shadowDossierSm }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: C.paperSoft }}>
                {["Heure", "Sandbox", "Mode", "Commande", "Résultat"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "11px 16px",
                      textAlign: "left",
                      fontFamily: FONT_MONO,
                      fontSize: 9.5,
                      fontWeight: 700,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: C.inkStrong,
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {commandes
                .slice()
                .reverse()
                .map((c) => (
                  <tr
                    key={c.id}
                    style={{ borderBottom: `1px solid ${C.borderSoft}` }}
                  >
                    <td style={{ padding: "10px 16px", fontFamily: FONT_MONO, color: C.inkSoft, fontSize: 11.5 }}>
                      {formatDateTime(c.dateExecution)}
                    </td>
                    <td style={{ padding: "10px 16px", fontFamily: FONT_MONO, color: C.ink, fontSize: 12 }}>
                      {c.sandboxNom}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <Badge tone={c.modeContexte === "attack" ? "rust" : "green"}>{c.modeContexte}</Badge>
                    </td>
                    <td style={{ padding: "10px 16px", fontFamily: FONT_MONO, color: C.ink, fontSize: 12 }}>
                      {c.texteInstruction}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      {c.statutExecution === "ok" && (
                        <span style={{ display: "flex", alignItems: "center", gap: 6, color: C.green, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
                          <CheckCircle2 size={13} /> ok
                        </span>
                      )}
                      {c.statutExecution === "rejected" && (
                        <span style={{ display: "flex", alignItems: "center", gap: 6, color: C.amber, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
                          <XCircle size={13} /> rejetée
                        </span>
                      )}
                      {c.statutExecution === "breach" && (
                        <span style={{ display: "flex", alignItems: "center", gap: 6, color: C.rust, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
                          <AlertTriangle size={13} /> faille
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
