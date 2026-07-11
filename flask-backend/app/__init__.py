"""Flask app factory."""
import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from .extensions import db, sock
from .config import load_config


def create_app() -> Flask:
    load_dotenv()
    app = Flask(__name__)
    app.config.update(load_config())

    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )

    db.init_app(app)
    sock.init_app(app)

    # Blueprints
    from .auth.routes import bp as auth_bp
    from .sandboxes.routes import bp as sandboxes_bp
    from .ws.terminal import register_ws

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(sandboxes_bp, url_prefix="/api/sandboxes")
    register_ws(sock)

    with app.app_context():
        db.create_all()
        _soft_migrate(db)

    @app.get("/api/health")
    def health():
        return {"status": "ok", "mode": app.config["SANDBOXMGR_MODE"]}

    return app


def _soft_migrate(db):
    """Migration douce SQLite : ajoute les colonnes manquantes sans casser
    les bases existantes. Alembic serait plus propre mais overkill ici."""
    from sqlalchemy import text, inspect
    insp = inspect(db.engine)
    if "sandbox" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("sandbox")}
        if "type_isolation" not in cols:
            with db.engine.begin() as conn:
                conn.execute(text(
                    "ALTER TABLE sandbox ADD COLUMN type_isolation "
                    "VARCHAR(8) NOT NULL DEFAULT 'MNT'"
                ))
