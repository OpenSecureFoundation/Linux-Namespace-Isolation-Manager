"""JWT helpers + décorateur @login_required."""
from __future__ import annotations

import time
from functools import wraps
from flask import current_app, request, jsonify, g
import jwt


def issue_token(user) -> str:
    now = int(time.time())
    payload = {
        "sub": user.id,
        "nomSysteme": user.nom_systeme,
        "uidSysteme": user.uid_systeme,
        "iat": now,
        "exp": now + current_app.config["JWT_EXP_SECONDS"],
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, current_app.config["JWT_SECRET"], algorithms=["HS256"])


def _extract_token() -> str | None:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return request.cookies.get("session")


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = _extract_token()
        if not token:
            return jsonify({"error": "unauthorized"}), 401
        try:
            claims = decode_token(token)
        except jwt.PyJWTError:
            return jsonify({"error": "invalid_token"}), 401
        g.user_id = claims["sub"]
        g.user_uid = claims["uidSysteme"]
        g.user_name = claims["nomSysteme"]
        return fn(*args, **kwargs)
    return wrapper
