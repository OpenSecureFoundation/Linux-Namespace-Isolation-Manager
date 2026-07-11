import os

# Racine du projet flask-backend/ (parent de app/) — sert de base portable
# pour localiser le binaire helper sans dépendre d'un chemin d'install fixe.
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DEFAULT_HELPER_BIN = os.path.join(_BACKEND_ROOT, "helper", "sandbox_helper")


def load_config() -> dict:
    mode = os.environ.get("SANDBOXMGR_MODE", "defense").lower()
    if mode not in ("attack", "defense"):
        raise RuntimeError(f"Invalid SANDBOXMGR_MODE={mode!r}")

    return {
        "SANDBOXMGR_MODE": mode,
        "SECRET_KEY": os.environ["FLASK_SECRET_KEY"],
        "JWT_SECRET": os.environ["JWT_SECRET"],
        "JWT_EXP_SECONDS": 60 * 60 * 8,
        "SQLALCHEMY_DATABASE_URI": os.environ.get(
            "DATABASE_URL", "sqlite:///sandboxmgr.db"
        ),
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        "HELPER_BIN": os.environ.get("HELPER_BIN", _DEFAULT_HELPER_BIN),
        "CORS_ORIGINS": os.environ.get("CORS_ORIGINS", "*").split(","),
        # Whitelist commandes en mode DEFENSE
        "COMMAND_WHITELIST": {
            "ls", "pwd", "whoami", "id", "cat", "echo", "hostname", "ps", "cd" , "mkdir"
        },
    }
