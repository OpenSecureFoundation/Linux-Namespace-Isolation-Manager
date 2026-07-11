"""
privilege_manager — surface d'élévation ciblée.

Toute action privilégiée passe UNIQUEMENT par le binaire helper porteur
des capabilities (cap_setuid,cap_setgid,cap_sys_admin,cap_sys_ptrace+ep).
Le service Flask lui-même tourne en tant qu'utilisateur non-root `sandboxmgr`.

Sous-commandes exposées par le helper (voir helper/sandbox_helper.c) :
    useradd <username>                                (mot de passe lu sur stdin)
    spawn   <mode> <ns_type> <uid> <hostname>         -> imprime "PID <n>"
    exec    <uid> <sandbox_pid> <ns_type> <cmd...>
    kill    <sandbox_pid>
"""
from __future__ import annotations

import os
import pwd
import subprocess
from flask import current_app


NS_TYPES = ("mnt", "pid", "net", "uts")


def _helper() -> str:
    return current_app.config["HELPER_BIN"]


def _normalize_ns(ns_type: str) -> str:
    n = (ns_type or "mnt").lower()
    if n not in NS_TYPES:
        raise ValueError(f"invalid ns_type {ns_type!r} (attendu: {NS_TYPES})")
    return n


def get_uid(username: str) -> int | None:
    try:
        return pwd.getpwnam(username).pw_uid
    except KeyError:
        return None


def create_linux_user(username: str, password: str) -> int:
    proc = subprocess.run(
        [_helper(), "useradd", username],
        input=password.encode(),
        capture_output=True,
        timeout=10,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.decode(errors="replace"))
    uid = get_uid(username)
    if uid is None:
        raise RuntimeError("user created but not found in passwd")
    return uid


def spawn_sandbox(mode: str, ns_type: str, uid: int, hostname: str) -> int:
    """Lance l'init de la sandbox (persistant) et retourne son PID hôte.

    ``ns_type`` vaut ``mnt|pid|net|uts`` — un seul namespace applicatif est
    isolé (choisi par l'utilisateur dans l'UI). En mode defense, le helper
    ajoute automatiquement CLONE_NEWUSER pour dropper les privilèges.
    """
    assert mode in ("attack", "defense")
    ns = _normalize_ns(ns_type)
    proc = subprocess.run(
        [_helper(), "spawn", mode, ns, str(uid), hostname],
        capture_output=True,
        timeout=15,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            f"spawn failed (rc={proc.returncode}): "
            f"{proc.stderr.decode(errors='replace').strip()}"
        )
    line = proc.stdout.decode(errors="replace").strip().splitlines()[0] if proc.stdout else ""
    if not line.startswith("PID "):
        raise RuntimeError(f"spawn: unexpected output {line!r}")
    return int(line.split()[1])


def exec_in_sandbox(
    uid: int, sandbox_pid: int, ns_type: str, argv: list[str], timeout: int = 30
) -> tuple[str, bool]:
    """Exécute une commande DANS le namespace isolé de la sandbox."""
    ns = _normalize_ns(ns_type)
    cmd = [_helper(), "exec", str(uid), str(sandbox_pid), ns, *argv]
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return ("[timeout]", False)
    out = proc.stdout.decode(errors="replace") + proc.stderr.decode(errors="replace")
    return (out, proc.returncode == 0)


def kill_sandbox(pid: int) -> None:
    """Termine proprement l'init de la sandbox via le helper (SIGTERM)."""
    try:
        subprocess.run([_helper(), "kill", str(pid)], capture_output=True, timeout=5)
    except Exception:
        try:
            os.kill(pid, 15)
        except ProcessLookupError:
            pass
