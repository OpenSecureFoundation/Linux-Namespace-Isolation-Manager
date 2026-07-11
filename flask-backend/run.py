"""Dev entrypoint. En production, utiliser gunicorn via wsgi.py + systemd."""
import os
from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(
        host=os.environ.get("BIND_HOST", "127.0.0.1"),
        port=int(os.environ.get("BIND_PORT", 8443)),
        debug=False,
    )
