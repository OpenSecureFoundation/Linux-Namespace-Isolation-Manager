"""Blueprint auth : login/logout/register liés aux VRAIS comptes Linux via PAM."""
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, g
import pam

from ..extensions import db
from ..models import Utilisateur
from ..privilege.privilege_manager import create_linux_user, get_uid
from .security import issue_token, login_required

bp = Blueprint("auth", __name__)


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"error": "missing_credentials"}), 400

    # Authentification PAM — vérifie contre /etc/shadow via le module system-auth
    if not pam.pam().authenticate(username, password, service="login"):
        return jsonify({"error": "invalid_credentials"}), 401

    uid = get_uid(username)
    if uid is None:
        return jsonify({"error": "system_user_not_found"}), 500

    user = Utilisateur.query.filter_by(nom_systeme=username).first()
    if not user:
        user = Utilisateur(nom_systeme=username, uid_systeme=uid)
        db.session.add(user)
    user.uid_systeme = uid
    user.date_derniere_connexion = datetime.utcnow()
    db.session.commit()

    token = issue_token(user)
    return jsonify({"token": token, "user": user.to_dict()})


@bp.post("/logout")
@login_required
def logout():
    # JWT stateless : le frontend jette simplement le token.
    return jsonify({"ok": True})


@bp.post("/register")
def register():
    """Crée un vrai compte Linux via le helper, puis miroir en base."""
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username.isalnum() or not (2 <= len(username) <= 32):
        return jsonify({"error": "invalid_username"}), 400
    if len(password) < 8:
        return jsonify({"error": "weak_password"}), 400
    if Utilisateur.query.filter_by(nom_systeme=username).first():
        return jsonify({"error": "already_exists"}), 409

    try:
        uid = create_linux_user(username, password)
    except Exception as e:
        current_app.logger.exception("useradd failed")
        return jsonify({"error": "useradd_failed", "detail": str(e)}), 500

    user = Utilisateur(nom_systeme=username, uid_systeme=uid)
    db.session.add(user)
    db.session.commit()
    return jsonify({"user": user.to_dict()}), 201


@bp.get("/me")
@login_required
def me():
    user = Utilisateur.query.get(g.user_id)
    return jsonify({"user": user.to_dict() if user else None})
