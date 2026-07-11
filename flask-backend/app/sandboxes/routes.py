"""Blueprint sandboxes : CRUD + historique commandes."""
from __future__ import annotations

import uuid
from flask import Blueprint, request, jsonify, g, current_app

from ..extensions import db
from ..models import Sandbox, Commande, StatutSandbox, TYPES_ISOLATION
from ..auth.security import login_required
from ..privilege.privilege_manager import spawn_sandbox, kill_sandbox

bp = Blueprint("sandboxes", __name__)


def _owned_or_404(sandbox_id: str) -> Sandbox | None:
    sb = Sandbox.query.get(sandbox_id)
    if not sb or sb.proprietaire_id != g.user_id:
        return None
    return sb


@bp.get("")
@login_required
def list_sandboxes():
    items = Sandbox.query.filter_by(proprietaire_id=g.user_id).all()
    return jsonify({"sandboxes": [s.to_dict() for s in items]})


@bp.post("")
@login_required
def create_sandbox():
    data = request.get_json(silent=True) or {}
    nom = (data.get("nomVirtuel") or f"sbx-{uuid.uuid4().hex[:6]}").strip()[:64]
    type_iso = (data.get("typeIsolation") or "MNT").upper()
    if type_iso not in TYPES_ISOLATION:
        return jsonify({"error": "invalid_type_isolation",
                        "detail": f"attendu: {TYPES_ISOLATION}"}), 400
    hostname = f"sbx-{uuid.uuid4().hex[:8]}"

    sb = Sandbox(
        nom_virtuel=nom,
        proprietaire_id=g.user_id,
        statut=StatutSandbox.ARRETEE,
        type_isolation=type_iso,
    )
    db.session.add(sb)
    db.session.flush()

    try:
        pid = spawn_sandbox(
            mode=current_app.config["SANDBOXMGR_MODE"],
            ns_type=type_iso.lower(),
            uid=g.user_uid,
            hostname=hostname,
        )
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("spawn_sandbox failed")
        return jsonify({"error": "spawn_failed", "detail": str(e)}), 500

    sb.pid_racine = pid
    sb.statut = StatutSandbox.EN_COURS
    db.session.commit()
    return jsonify({"sandbox": sb.to_dict()}), 201


@bp.delete("/<sandbox_id>")
@login_required
def delete_sandbox(sandbox_id):
    sb = _owned_or_404(sandbox_id)
    if not sb:
        return jsonify({"error": "not_found"}), 404
    if sb.pid_racine:
        kill_sandbox(sb.pid_racine)
    sb.statut = StatutSandbox.ARRETEE
    db.session.delete(sb)
    db.session.commit()
    return jsonify({"ok": True})


@bp.get("/<sandbox_id>/commands")
@login_required
def list_commands(sandbox_id):
    sb = _owned_or_404(sandbox_id)
    if not sb:
        return jsonify({"error": "not_found"}), 404
    return jsonify({"commands": [c.to_dict() for c in sb.commandes]})


@bp.get("/<sandbox_id>/commands/last")
@login_required
def last_command(sandbox_id):
    sb = _owned_or_404(sandbox_id)
    if not sb:
        return jsonify({"error": "not_found"}), 404
    last = (
        Commande.query.filter_by(sandbox_id=sb.id)
        .order_by(Commande.date_execution.desc())
        .first()
    )
    return jsonify({"command": last.to_dict() if last else None})
