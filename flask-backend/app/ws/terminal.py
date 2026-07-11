"""WebSocket terminal interactif.

Protocole minimal JSON (frame texte) :
  client -> serveur : {"type": "cmd",  "text": "ls -la"}
                      {"type": "history_prev"}
  serveur -> client : {"type": "stdout", "text": "..."}
                      {"type": "exit", "ok": true}
                      {"type": "history", "text": "ls -la" | null}
                      {"type": "error", "message": "..."}
"""
from __future__ import annotations

import json
import shlex
from datetime import datetime
from flask import current_app, request

from ..extensions import db
from ..models import Sandbox, Commande, StatutSandbox
from ..auth.security import decode_token
from ..privilege.privilege_manager import exec_in_sandbox


def _auth(ws) -> tuple[int, str] | None:
    token = request.args.get("token") or request.headers.get("Sec-WebSocket-Protocol")
    if not token:
        ws.send(json.dumps({"type": "error", "message": "missing_token"}))
        return None
    try:
        claims = decode_token(token)
        return int(claims["uidSysteme"]), claims["sub"]
    except Exception:
        ws.send(json.dumps({"type": "error", "message": "invalid_token"}))
        return None


def register_ws(sock):
    @sock.route("/ws/sandboxes/<sandbox_id>/terminal")
    def terminal(ws, sandbox_id):
        auth = _auth(ws)
        if not auth:
            return
        uid, user_id = auth

        sb = Sandbox.query.get(sandbox_id)
        if not sb or sb.proprietaire_id != user_id:
            ws.send(json.dumps({"type": "error", "message": "not_found"}))
            return
        if sb.statut != StatutSandbox.EN_COURS or not sb.pid_racine:
            ws.send(json.dumps({"type": "error", "message": "sandbox_not_running"}))
            return

        whitelist = current_app.config["COMMAND_WHITELIST"]
        mode = current_app.config["SANDBOXMGR_MODE"]

        while True:
            raw = ws.receive()
            if raw is None:
                break
            try:
                msg = json.loads(raw)
            except Exception:
                ws.send(json.dumps({"type": "error", "message": "bad_json"}))
                continue

            t = msg.get("type")

            if t == "history_prev":
                last = (
                    Commande.query.filter_by(sandbox_id=sb.id)
                    .order_by(Commande.date_execution.desc())
                    .first()
                )
                ws.send(json.dumps({
                    "type": "history",
                    "text": last.texte_instruction if last else None,
                }))
                continue

            if t != "cmd":
                ws.send(json.dumps({"type": "error", "message": "unknown_type"}))
                continue

            text = (msg.get("text") or "").strip()
            if not text:
                continue

            # ---- DEFENSE : whitelist + argv[] (aucun shell) ----------------
            # ---- ATTACK  : bash -c "<text>" (démonstration injection) -------
            if mode == "defense":
                try:
                    argv = shlex.split(text)
                except ValueError as e:
                    ws.send(json.dumps({"type": "error", "message": f"parse: {e}"}))
                    continue
                if not argv or argv[0] not in whitelist:
                    ws.send(json.dumps({
                        "type": "error",
                        "message": f"command_not_allowed: {argv[0] if argv else ''}",
                    }))
                    db.session.add(Commande(
                        texte_instruction=text, resultat_sortie="command_not_allowed",
                        est_reussie=False, sandbox_id=sb.id,
                    ))
                    db.session.commit()
                    continue
            else:
                argv = ["/bin/bash", "-c", text]  # VULNÉRABLE — mode ATTACK

            out, ok = exec_in_sandbox(uid, sb.pid_racine, sb.type_isolation.lower(), argv)

            cmd = Commande(
                texte_instruction=text,
                resultat_sortie=out,
                est_reussie=ok,
                sandbox_id=sb.id,
                date_execution=datetime.utcnow(),
            )
            db.session.add(cmd)
            db.session.commit()

            ws.send(json.dumps({"type": "stdout", "text": out}))
            ws.send(json.dumps({"type": "exit", "ok": ok}))
