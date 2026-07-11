import React, { useCallback, useEffect, useState } from "react";

import LoginScreen from "./components/auth/LoginScreen.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";
import TopBar from "./components/layout/TopBar.jsx";
import DashboardPage from "./components/dashboard/DashboardPage.jsx";
import SandboxesPage from "./components/dashboard/SandboxesPage.jsx";
import CreateModal from "./components/dashboard/CreateModal.jsx";
import TerminalPage from "./components/terminal/TerminalPage.jsx";
import AttackPage from "./components/security/AttackPage.jsx";
import DefensePage from "./components/security/DefensePage.jsx";
import HistoryPage from "./components/history/HistoryPage.jsx";
import ToastStack from "./components/common/Toast.jsx";

import { COLORS as C, FONT_SANS } from "./styles/theme.js";
import { STATUT } from "./data/constants.js";
import { uuidLike } from "./utils/helpers.js";
import { useAuth, humanizeApiError } from "./lib/auth.tsx";
import {
  listSandboxes,
  createSandbox,
  deleteSandbox,
  listCommands,
} from "./lib/api.ts";

const PAGE_TITLES = {
  dashboard: "Tableau de bord",
  sandboxes: "Sandboxes",
  terminal: "Terminal web",
  attack: "Module ATTACK",
  defense: "Module DEFENSE",
  history: "Historique",
};

export default function App() {
  const { user, isAuthenticated, login, register, logout } = useAuth();

  const [page, setPage] = useState("dashboard");
  const [mode, setMode] = useState("defense");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [sandboxes, setSandboxes] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((tone, text) => {
    const id = uuidLike();
    setToasts((t) => [...t, { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const refreshSandboxes = useCallback(async () => {
    try {
      const { sandboxes: list } = await listSandboxes();
      setSandboxes(list);
      return list;
    } catch (e) {
      pushToast("error", humanizeApiError(e));
      return [];
    }
  }, [pushToast]);

  // Charge la liste au login et vide tout au logout — évite les fuites
  // de données entre utilisateurs successifs.
  useEffect(() => {
    if (!isAuthenticated) {
      setSandboxes([]);
      setCommandes([]);
      setSelectedId(null);
      setPage("dashboard");
      return;
    }
    refreshSandboxes();
  }, [isAuthenticated, refreshSandboxes]);

  useEffect(() => {
    if (!selectedId && sandboxes.length > 0) {
      const first = sandboxes.find((s) => s.statut === STATUT.EN_COURS) || sandboxes[0];
      if (first) setSelectedId(first.id);
    }
  }, [sandboxes, selectedId]);

  // UC1 — Créer une sandbox via le backend
  async function handleCreate(name) {
    setShowCreate(false);
    try {
      const { sandbox } = await createSandbox(name || undefined);
      await refreshSandboxes();
      setSelectedId(sandbox.id);
      pushToast("success", `Sandbox « ${sandbox.nomVirtuel} » créée avec succès.`);
    } catch (e) {
      pushToast("error", humanizeApiError(e));
    }
  }

  // UC3 — Détruire une sandbox via le backend
  async function handleDestroy(id) {
    const sb = sandboxes.find((s) => s.id === id);
    try {
      await deleteSandbox(id);
      await refreshSandboxes();
      setSelectedId((cur) => (cur === id ? null : cur));
      pushToast("success", `Sandbox « ${sb?.nomVirtuel || id} » détruite.`);
    } catch (e) {
      pushToast("error", humanizeApiError(e));
    }
  }

  // Utilisé UNIQUEMENT par les pages Attack/Defense (démonstrations
  // pédagogiques locales). Le vrai terminal passe par le WebSocket, cf.
  // useSandboxTerminal.
  function handleRun() {
    pushToast(
      "error",
      "Utilisez le terminal interactif pour exécuter cette commande sur le backend."
    );
  }

  async function refreshHistory() {
    const flat = [];
    for (const sb of sandboxes) {
      try {
        const { commands } = await listCommands(sb.id);
        for (const c of commands) {
          flat.push({
            ...c,
            sandboxNom: sb.nomVirtuel,
            statutExecution: c.estReussie ? "ok" : "rejected",
            modeContexte: mode,
          });
        }
      } catch {
        /* on ignore les sandboxes qui répondent 404 */
      }
    }
    flat.sort((a, b) => (a.dateExecution < b.dateExecution ? -1 : 1));
    setCommandes(flat);
  }

  useEffect(() => {
    if (page === "history" && isAuthenticated) {
      refreshHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, isAuthenticated, sandboxes.length]);

  async function handleLogin(username, password) {
    await login(username, password);
    setPage("sandboxes");
  }

  async function handleRegister(username, password) {
    await register(username, password);
    setPage("sandboxes");
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      /* best effort */
    }
  }

  if (!isAuthenticated || !user) {
    return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.paper, fontFamily: FONT_SANS }}>
      <Sidebar
        page={page}
        setPage={setPage}
        username={user.nomSysteme}
        onLogout={handleLogout}
        sandboxCount={sandboxes.length}
      />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopBar title={PAGE_TITLES[page]} mode={mode} setMode={setMode} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          {page === "dashboard" && (
            <DashboardPage
              sandboxes={sandboxes}
              onSelect={(id) => { setSelectedId(id); setPage("terminal"); }}
              onDestroy={handleDestroy}
              onOpenCreate={() => setShowCreate(true)}
              commandes={commandes}
            />
          )}
          {page === "sandboxes" && (
            <SandboxesPage
              sandboxes={sandboxes}
              onSelect={(id) => { setSelectedId(id); setPage("terminal"); }}
              onDestroy={handleDestroy}
              onOpenCreate={() => setShowCreate(true)}
            />
          )}
          {page === "terminal" && (
            <TerminalPage
              sandboxes={sandboxes}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              mode={mode}
              onError={(msg) => pushToast("error", msg)}
            />
          )}
          {page === "attack" && <AttackPage sandboxes={sandboxes} onRun={handleRun} />}
          {page === "defense" && <DefensePage sandboxes={sandboxes} onRun={handleRun} />}
          {page === "history" && <HistoryPage commandes={commandes} />}
        </div>
      </div>

      {showCreate && <CreateModal onCreate={handleCreate} onClose={() => setShowCreate(false)} />}
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
