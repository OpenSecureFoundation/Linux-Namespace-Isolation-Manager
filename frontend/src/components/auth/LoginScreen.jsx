import React, { useState } from "react";
import { COLORS as C, FONT_MONO, FONT_SANS } from "../../styles/theme.js";
import { humanizeApiError } from "../../lib/auth.tsx";

/**
 * UC0 — Écran d'authentification (direction "Technical Dossier").
 * Deux onglets discrets Se connecter / Créer un compte, chrome papier
 * avec status bar en tête et meta protocole en pied.
 */
export default function LoginScreen({ onLogin, onRegister }) {
  const [tab, setTab] = useState("login");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!user.trim() || !pass.trim()) {
      setErr("Identifiant et mot de passe requis.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      if (tab === "register") await onRegister(user.trim(), pass);
      else await onLogin(user.trim(), pass);
    } catch (e2) {
      setErr(humanizeApiError(e2));
    } finally {
      setBusy(false);
    }
  }

  const labelStyle = {
    fontFamily: FONT_MONO,
    fontSize: 10.5,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    fontWeight: 700,
    color: C.inkStrong,
    display: "block",
    marginBottom: 8,
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    background: C.paperSoft,
    border: `1px solid ${C.border}`,
    padding: "11px 14px",
    fontFamily: FONT_MONO,
    fontSize: 13,
    color: C.ink,
    outline: "none",
    borderRadius: 0,
  };

  const tabBtn = (id, label) => (
    <button
      type="button"
      onClick={() => { setTab(id); setErr(""); }}
      style={{
        flex: 1,
        padding: "10px 0",
        background: "transparent",
        border: "none",
        borderBottom: tab === id ? `2px solid ${C.green}` : `2px solid transparent`,
        color: tab === id ? C.ink : C.inkFaint,
        fontFamily: FONT_MONO,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: FONT_SANS,
      }}
    >
      <div
        className="dossier-in"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 460,
          background: C.paperRaised,
          border: `1px solid ${C.border}`,
          boxShadow: C.shadowDossier,
        }}
      >
        {/* Status bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 18px",
            borderBottom: `1px solid ${C.border}`,
            background: C.paperSoft,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 10, height: 10, background: C.green, display: "inline-block" }} />
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: C.inkStrong,
              }}
            >
              System.Portal &nbsp;//&nbsp; V2.0
            </span>
          </div>
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 9.5,
              letterSpacing: "0.12em",
              color: C.inkFaint,
              textTransform: "uppercase",
            }}
          >
            [ {busy ? "auth_in_progress" : "auth_pending"} ]
          </span>
        </div>

        {/* Contenu */}
        <div style={{ padding: "36px 44px 28px" }}>
          <header style={{ marginBottom: 30 }}>
            <h1
              style={{
                fontFamily: FONT_MONO,
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: C.ink,
                margin: "0 0 10px",
              }}
            >
              Accès Laboratoire
            </h1>
            <p style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.6, margin: 0 }}>
              Institut Universitaire Saint Jean<br />
              <span style={{ opacity: 0.7 }}>Gestionnaire d'isolation de namespaces Linux.</span>
            </p>
          </header>

          <div style={{ display: "flex", marginBottom: 22, borderBottom: `1px solid ${C.borderSoft}` }}>
            {tabBtn("login", "Se connecter")}
            {tabBtn("register", "Créer un accès")}
          </div>

          <form onSubmit={submit}>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Identifiant</label>
              <input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                autoComplete="username"
                placeholder="ex. admin_root"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={labelStyle}>Mot de passe</label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete={tab === "register" ? "new-password" : "current-password"}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>

            {err && (
              <div
                style={{
                  marginBottom: 18,
                  padding: "8px 12px",
                  border: `1px solid ${C.rust}`,
                  background: C.rustTint,
                  color: C.rust,
                  fontFamily: FONT_MONO,
                  fontSize: 11.5,
                  letterSpacing: "0.02em",
                }}
              >
                ERR &gt; {err}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              style={{
                width: "100%",
                padding: "14px 18px",
                background: busy ? C.greenDeep : C.green,
                color: "#fff",
                border: "none",
                fontFamily: FONT_MONO,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: busy ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              {busy
                ? (tab === "register" ? "Création…" : "Authentification…")
                : (tab === "register" ? "Créer le compte" : "Exécuter l'authentification")}
              {!busy && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </form>
        </div>

        {/* Footer meta */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 18px",
            background: C.paperSoft,
            borderTop: `1px solid ${C.border}`,
            fontFamily: FONT_MONO,
            fontSize: 9,
            letterSpacing: "0.12em",
            color: C.inkFaint,
            textTransform: "uppercase",
          }}
        >
          <span>Sec-Protocol: JWT / HS256</span>
          <span>Loc: ST_JEAN_LAB_01</span>
        </div>
      </div>
    </div>
  );
}
