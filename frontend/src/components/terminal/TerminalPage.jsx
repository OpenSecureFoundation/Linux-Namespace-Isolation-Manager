import React, { useEffect, useRef, useState } from "react";
import TermWindow from "../common/TermWindow.jsx";
import Dot from "../common/Dot.jsx";
import { COLORS as C, FONT_MONO } from "../../styles/theme.js";
import { STATUT } from "../../data/constants.js";
import { useSandboxTerminal } from "../../hooks/useSandboxTerminal.ts";
import { PageHeader } from "../dashboard/DashboardPage.jsx";

export default function TerminalPage({ sandboxes, selectedId, setSelectedId, mode, onError }) {
  const sb = sandboxes.find((s) => s.id === selectedId) || sandboxes.find((s) => s.statut === STATUT.EN_COURS);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  const {
    lines,
    connected,
    error,
    sendCommand,
    requestHistoryPrev,
    historySuggestion,
    clearHistorySuggestion,
  } = useSandboxTerminal(sb ? sb.id : null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines.length]);

  useEffect(() => {
    if (historySuggestion !== null) {
      setInput(historySuggestion);
      clearHistorySuggestion();
    }
  }, [historySuggestion, clearHistorySuggestion]);

  useEffect(() => {
    if (error && onError) onError(error);
  }, [error, onError]);

  if (!sb) {
    return (
      <div style={{ padding: "28px 32px" }}>
        <PageHeader eyebrow="Section C" title="Terminal interactif" subtitle="Session WebSocket vers le backend d'exécution." />
        <div
          style={{
            border: `1px dashed ${C.borderStrong}`,
            padding: "56px 20px",
            textAlign: "center",
            color: C.inkFaint,
            fontFamily: FONT_MONO,
            fontSize: 11.5,
            background: C.paperSoft,
          }}
        >
          Aucune sandbox active. Provisionnez un environnement pour ouvrir un terminal.
        </div>
      </div>
    );
  }

  function submit(e) {
    e.preventDefault();
    if (!input.trim()) return;
    sendCommand(input);
    setInput("");
  }
  function onKeyDown(e) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      requestHistoryPrev();
    }
  }

  return (
    <div style={{ padding: "28px 32px" }}>
      <PageHeader eyebrow="Section C" title="Terminal interactif" subtitle="Session WebSocket vers le backend — chaque commande est journalisée." />

      <div style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
        {/* Registre latéral */}
        <div style={{ width: 230, flexShrink: 0 }}>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: C.inkStrong,
              marginBottom: 10,
              paddingBottom: 8,
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            Registre
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {sandboxes.filter((s) => s.statut !== STATUT.ARRETEE).map((s) => {
              const isActive = s.id === sb.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  disabled={s.statut !== STATUT.EN_COURS}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    textAlign: "left",
                    padding: "9px 10px",
                    background: isActive ? C.greenTint : C.paperRaised,
                    border: `1px solid ${isActive ? C.green : C.border}`,
                    cursor: s.statut === STATUT.EN_COURS ? "pointer" : "not-allowed",
                    opacity: s.statut === STATUT.EN_COURS ? 1 : 0.55,
                  }}
                >
                  <Dot statut={s.statut} />
                  <span style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.nomVirtuel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Terminal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <TermWindow
            title={`${sb.nomVirtuel} · ${sb.id.slice(0, 8)}`}
            accent={mode === "attack" ? C.rust : C.green}
          >
            <div
              ref={scrollRef}
              style={{
                height: 340,
                overflowY: "auto",
                fontFamily: FONT_MONO,
                fontSize: 12.5,
                lineHeight: 1.75,
              }}
            >
              <div style={{ color: C.phosphorDim, whiteSpace: "pre-wrap", marginBottom: 4 }}>
                {connected ? "» session établie. tapez une commande." : "» tentative de connexion au backend…"}
              </div>
              {lines.map((l, i) => (
                <div
                  key={i}
                  style={{
                    color:
                      l.type === "cmd"
                        ? "#DCE6DF"
                        : l.type === "error"
                        ? "#E39A7A"
                        : l.type === "sys"
                        ? C.phosphorDim
                        : C.phosphor,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {l.type === "cmd" ? `$ ${l.text}` : l.text}
                </div>
              ))}
              {connected && <span className="term-cursor" />}
            </div>

            <form
              onSubmit={submit}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 12,
                borderTop: `1px solid ${C.termLine}`,
                paddingTop: 12,
              }}
            >
              <span style={{ color: mode === "attack" ? "#E39A7A" : C.phosphor, fontFamily: FONT_MONO, fontSize: 13 }}>$</span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={!connected}
                placeholder={connected ? "tapez une commande… (↑ pour l'historique)" : "connexion en cours…"}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#DCE6DF",
                  fontFamily: FONT_MONO,
                  fontSize: 13,
                }}
              />
            </form>
          </TermWindow>

          <div
            style={{
              marginTop: 12,
              padding: "8px 14px",
              background: C.paperSoft,
              border: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.inkFaint,
            }}
          >
            <span>Statut &gt; {connected ? "[ ws_open ]" : "[ ws_pending ]"}</span>
            <span>Mode &gt; {mode === "attack" ? "attack / unrestricted" : "defense / whitelist"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
