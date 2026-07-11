import React from "react";
import { LayoutDashboard, Box, Terminal, Swords, Shield, History, LogOut } from "lucide-react";
import NavItem from "./NavItem.jsx";
import { COLORS as C, FONT_MONO } from "../../styles/theme.js";

/**
 * Sidebar "Technical Dossier" — bandeau papier crème avec header status,
 * groupes de nav en petites capitales monospace, pied user + meta.
 */
export default function Sidebar({ page, setPage, username, onLogout, sandboxCount }) {
  return (
    <aside
      style={{
        width: 232,
        flexShrink: 0,
        background: C.paperSoft,
        borderRight: `1px solid ${C.border}`,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      {/* Status bar */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: C.paperRaised,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 10, height: 10, background: C.green, display: "inline-block" }} />
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: C.inkStrong,
            }}
          >
            NS.Manager
          </span>
        </div>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            letterSpacing: "0.1em",
            color: C.inkFaint,
          }}
        >
          v2.0
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "18px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        <SectionLabel>Espace de travail</SectionLabel>
        <NavItem icon={LayoutDashboard} label="Tableau de bord" active={page === "dashboard"} onClick={() => setPage("dashboard")} />
        <NavItem
          icon={Box}
          label="Sandboxes"
          badge={sandboxCount > 0 ? String(sandboxCount).padStart(2, "0") : null}
          active={page === "sandboxes"}
          onClick={() => setPage("sandboxes")}
        />
        <NavItem icon={Terminal} label="Terminal" active={page === "terminal"} onClick={() => setPage("terminal")} />

        <SectionLabel style={{ marginTop: 18 }}>Pédagogie</SectionLabel>
        <NavItem icon={Swords} label="Module ATTACK" active={page === "attack"} onClick={() => setPage("attack")} danger />
        <NavItem icon={Shield} label="Module DEFENSE" active={page === "defense"} onClick={() => setPage("defense")} />

        <SectionLabel style={{ marginTop: 18 }}>Traçabilité</SectionLabel>
        <NavItem icon={History} label="Historique" active={page === "history"} onClick={() => setPage("history")} />
      </nav>

      {/* Footer user */}
      <div
        style={{
          padding: "14px 14px 16px",
          borderTop: `1px solid ${C.border}`,
          background: C.paperRaised,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 4px",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              background: C.green,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT_MONO,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            {(username || "??").slice(0, 2).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11.5,
                color: C.ink,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {username}
            </div>
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 9,
                color: C.inkFaint,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Session active
            </div>
          </div>
        </div>
        <NavItem icon={LogOut} label="Fermer la session" onClick={onLogout} />
      </div>
    </aside>
  );
}

function SectionLabel({ children, style }) {
  return (
    <div
      style={{
        padding: "0 10px 6px",
        fontFamily: FONT_MONO,
        fontSize: 9.5,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: C.inkFaint,
        fontWeight: 700,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
