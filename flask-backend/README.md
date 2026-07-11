# Web-based Linux Namespace Isolation Manager — Backend (Flask)

Squelette du backend Python/Flask pour le projet pédagogique
**Web-based Linux Namespace Isolation Manager**.

> ⚠️ Ce backend doit tourner sur une **VM Linux dédiée** (Debian/Ubuntu conseillé).
> Il ne peut PAS être hébergé sur Lovable / Cloudflare Workers / Vercel :
> il crée de vrais comptes Linux, manipule PAM, `unshare`, des namespaces PID/UTS/NET/MNT/USER,
> et fait du `setuid` via `CAP_SETUID`. Il lui faut un vrai noyau Linux et de vraies capabilities.

---

## 1. Architecture

```text
flask-backend/
├── app/
│   ├── __init__.py            # create_app() — factory Flask
│   ├── config.py              # Config par mode: ATTACK / DEFENSE
│   ├── extensions.py          # db, sock (WebSocket), jwt
│   ├── models/                # SQLAlchemy: Utilisateur, Sandbox, Commande
│   ├── auth/                  # PAM login/logout/register (blueprint)
│   ├── sandboxes/             # CRUD sandboxes + historique (blueprint)
│   ├── ws/                    # WebSocket terminal interactif
│   └── privilege/             # privilege_manager.py — setuid ciblé
├── helper/
│   └── sandbox_helper.c       # petit binaire C, porte-drapeau CAP_SETUID / CAP_SYS_ADMIN
├── systemd/
│   ├── sandboxmgr-defense.service
│   └── sandboxmgr-attack.service
├── migrations/                # (alembic si tu ajoutes flask-migrate)
├── run.py                     # entrypoint dev
├── wsgi.py                    # entrypoint gunicorn
├── requirements.txt
└── .env.example
```

## 2. Installation sur la VM

```bash
# 1. Dépendances système
sudo apt update
sudo apt install -y python3-venv python3-pip libpam0g-dev build-essential util-linux

# 2. Compte système dédié pour le service (jamais root)
sudo useradd -r -m -s /bin/bash sandboxmgr

# 3. Récupérer le code
sudo -u sandboxmgr git clone <ton-repo> /home/sandboxmgr/app
cd /home/sandboxmgr/app/flask-backend
sudo -u sandboxmgr python3 -m venv .venv
sudo -u sandboxmgr .venv/bin/pip install -r requirements.txt

# 4. Compiler + capaciter le binaire helper (élévation ciblée)
gcc -O2 -Wall -o helper/sandbox_helper helper/sandbox_helper.c
sudo chown root:sandboxmgr helper/sandbox_helper
sudo chmod 750 helper/sandbox_helper
sudo setcap cap_setuid,cap_setgid,cap_sys_admin,cap_sys_chroot,cap_net_admin,cap_dac_override,cap_chown,cap_fowner,cap_sys_ptrace+ep helper/sandbox_helper

# 4bis. Autoriser /register — useradd et chpasswd exigent euid==0 (verrous
#      /etc/passwd et /etc/shadow) et les file capabilities NE SUFFISENT PAS.
#      On délègue à sudo avec une règle NOPASSWD ciblée sur ces 2 binaires.
sudo tee /etc/sudoers.d/sandboxmgr-useradd > /dev/null <<'EOF'
sandboxmgr ALL=(root) NOPASSWD: /usr/sbin/useradd, /usr/sbin/chpasswd
EOF
sudo chmod 440 /etc/sudoers.d/sandboxmgr-useradd
sudo visudo -c   # valider la syntaxe

# 5. Config + BD (migration douce auto au démarrage — colonne type_isolation)
cp .env.example .env
.venv/bin/python -c "from app import create_app; create_app()"

# 6. Lancer en dev
.venv/bin/python run.py
```

En production, utiliser gunicorn + systemd (voir `systemd/*.service`).

## 3. Sécurité — modèle de privilèges

- Le service Flask tourne sous l'utilisateur **`sandboxmgr`** (non-root).
- Toute opération qui exige un privilège (créer namespace, `setuid` vers l'UID de
  l'utilisateur connecté, créer un compte Linux) passe **uniquement** par le binaire
  `helper/sandbox_helper` porteur des capabilities `cap_setuid,cap_setgid,cap_sys_admin,cap_sys_ptrace+ep`.
- Le helper n'accepte qu'un jeu très restreint de sous-commandes (`spawn`, `exec`,
  `useradd`) et valide strictement ses arguments.
- Aucun `sudo NOPASSWD`, aucun SUID root sur l'interpréteur Python.
- Aucun mot de passe applicatif stocké en BD : authentification déléguée à **PAM**.

## 4. Modes ATTACK / DEFENSE

Deux unités systemd distinctes, deux ports, deux bases SQLite séparées,
même code base — le comportement est piloté par la variable
`SANDBOXMGR_MODE=attack|defense` (voir `app/config.py`).

| Aspect                  | DEFENSE (port 8443)                       | ATTACK (port 9443)                     |
|-------------------------|-------------------------------------------|----------------------------------------|
| User namespace          | Activé, root interne mappé → UID non-priv | Désactivé                              |
| Exécution commande      | `execve` argv[], jamais de shell          | `bash -c "<input>"` (injection)        |
| Whitelist               | Stricte, côté serveur                     | Aucune                                 |
| Mount namespace         | `pivot_root` vers rootfs minimal          | Aucun (voit `/` de l'hôte)             |
| Bannière UI attendue    | verte "DEFENSE"                           | rouge "ATTACK — DEMO ONLY"             |

## 5. API

Voir `docs/API.md` (ou les blueprints `app/auth`, `app/sandboxes`, `app/ws`).
