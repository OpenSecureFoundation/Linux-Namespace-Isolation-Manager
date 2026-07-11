import { useCallback, useEffect, useRef, useState } from "react";
import { WS_BASE_URL, getToken } from "../lib/api";

export type TerminalLine = {
  type: "cmd" | "stdout" | "sys" | "error";
  text: string;
};

type ServerFrame =
  | { type: "stdout"; text: string }
  | { type: "exit"; ok: boolean }
  | { type: "history"; text: string | null }
  | { type: "error"; message: string };

type UseSandboxTerminal = {
  lines: TerminalLine[];
  connected: boolean;
  error: string | null;
  sendCommand: (text: string) => void;
  requestHistoryPrev: () => void;
  historySuggestion: string | null;
  clearHistorySuggestion: () => void;
  resetLines: () => void;
};

const BACKOFF_MS = [1000, 2000, 5000];

export function useSandboxTerminal(sandboxId: string | null): UseSandboxTerminal {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historySuggestion, setHistorySuggestion] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const closedByUserRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);

  const append = useCallback((line: TerminalLine) => {
    setLines((ls) => [...ls, line]);
  }, []);

  const connect = useCallback(() => {
    if (!sandboxId) return;
    const token = getToken();
    if (!token) {
      setError("Session expirée.");
      return;
    }

    const url = `${WS_BASE_URL}/ws/sandboxes/${sandboxId}/terminal?token=${encodeURIComponent(token)}`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      attemptRef.current = 0;
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (evt) => {
      let frame: ServerFrame;
      try {
        frame = JSON.parse(evt.data) as ServerFrame;
      } catch {
        return;
      }
      switch (frame.type) {
        case "stdout":
          append({ type: "stdout", text: frame.text });
          break;
        case "exit":
          append({ type: "sys", text: frame.ok ? "" : "[commande terminée avec erreur]" });
          break;
        case "history":
          setHistorySuggestion(frame.text);
          break;
        case "error":
          append({ type: "error", text: frame.message });
          setError(frame.message);
          break;
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      if (closedByUserRef.current) return;
      const delay = BACKOFF_MS[attemptRef.current];
      if (delay !== undefined) {
        attemptRef.current += 1;
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      } else {
        setError("Connexion au terminal perdue.");
      }
    };

    ws.onerror = () => {
      // onclose gérera la reconnexion.
    };
  }, [sandboxId, append]);

  useEffect(() => {
    if (!sandboxId) return;
    closedByUserRef.current = false;
    attemptRef.current = 0;
    setLines([]);
    setError(null);
    connect();
    return () => {
      closedByUserRef.current = true;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
    };
  }, [sandboxId, connect]);

  const sendCommand = useCallback(
    (text: string) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        setError("Terminal déconnecté.");
        return;
      }
      append({ type: "cmd", text });
      ws.send(JSON.stringify({ type: "cmd", text }));
    },
    [append]
  );

  const requestHistoryPrev = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "history_prev" }));
  }, []);

  return {
    lines,
    connected,
    error,
    sendCommand,
    requestHistoryPrev,
    historySuggestion,
    clearHistorySuggestion: () => setHistorySuggestion(null),
    resetLines: () => setLines([]),
  };
}
