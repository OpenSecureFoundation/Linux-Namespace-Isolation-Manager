# Cahier de conception — Web-based Linux Namespace Isolation Manager

> Document pédagogique. Il explique **comment est construite l'application**,
> module par module, du bouton cliqué dans le navigateur jusqu'au processus
> Linux réellement isolé sur la machine. Aucun prérequis n'est nécessaire :
> chaque terme technique est expliqué à sa première apparition.

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture générale](#2-architecture-générale)
3. [Modèle de données](#3-modèle-de-données)
4. [Module d'authentification](#4-module-dauthentification)
5. [Module de gestion des sandboxes](#5-module-de-gestion-des-sandboxes)
6. [Exécution des commandes (terminal WebSocket)](#6-exécution-des-commandes-terminal-websocket)
7. [Le helper C — cœur de l'isolation](#7-le-helper-c--cœur-de-lisolation)
8. [Configuration et gestion des droits](#8-configuration-et-gestion-des-droits)
9. [Modes ATTACK vs DEFENSE](#9-modes-attack-vs-defense)
10. [Cycle de vie complet d'une requête](#10-cycle-de-vie-complet-dune-requête)

---

## 1. Vue d'ensemble

### 1.1 Que fait l'application ?

L'application permet à un utilisateur, depuis un navigateur web, de :

- **s'inscrire** (créer un compte qui correspond à un vrai utilisateur Linux) ;
- **se connecter** (authentification vérifiée par le noyau Linux via PAM) ;
- **créer une « sandbox »** (une bulle isolée qui ressemble à une mini-machine) ;
- **exécuter des commandes shell** (`ls`, `pwd`, `ps`, …) dans cette bulle ;
- **conserver l'historique** des commandes exécutées ;
- **supprimer** la sandbox quand il a fini.

Le mot **sandbox** (« bac à sable ») désigne un environnement où un processus
tourne comme s'il était seul sur la machine : il a son propre nom d'hôte, sa
propre vue des processus, sa propre pile réseau, etc. Contrairement à une
machine virtuelle, il n'y a **pas de deuxième noyau** : c'est le même Linux qui
présente des vues différentes à des groupes de processus différents grâce aux
**namespaces**.

### 1.2 Pourquoi c'est intéressant

- **Pédagogique** : on manipule directement les primitives du noyau
  (`clone`, `setns`, `unshare`, `uid_map`, capabilities…) que Docker/Podman/LXC
  utilisent en interne.
- **Sécurité** : deux modes coexistent, `DEFENSE` (verrouillé, correct) et
  `ATTACK` (volontairement vulnérable pour démontrer les injections shell).
- **Réaliste** : il n'y a **aucun `sudo`**, aucun mot de passe applicatif stocké
  en base, aucun binaire SUID root. Tout privilège est encapsulé dans un unique
  petit programme C porteur de *capabilities* Linux ciblées.

---

## 2. Architecture générale

### 2.1 Trois couches

```text
┌────────────────────────────────────────────────────────────────────┐
│  1. FRONTEND — React + Vite  (poste du développeur, navigateur)   │
│     • src/lib/api.ts        → client HTTP (fetch + JWT)           │
│     • src/lib/auth.tsx      → contexte React d'authentification   │
│     • src/hooks/useSandboxTerminal.ts → WebSocket temps réel      │
│     • src/components/**     → pages, cartes, terminal xterm-like  │
└────────────────────────────────────────────────────────────────────┘
                    │ HTTPS/HTTP + JWT   │ WebSocket + JWT (query)
                    ▼                    ▼
┌────────────────────────────────────────────────────────────────────┐
│  2. BACKEND — Flask (Python)  — tourne sous user 'sandboxmgr'     │
│     • app/auth      → PAM login, register, JWT                    │
│     • app/sandboxes → CRUD (POST /api/sandboxes …)                │
│     • app/ws        → WebSocket /ws/sandboxes/:id/terminal        │
│     • app/privilege → wrapper Python qui appelle le helper C      │
│     • app/models    → SQLAlchemy (Utilisateur, Sandbox, Commande) │
└────────────────────────────────────────────────────────────────────┘
                    │ subprocess.run(["/opt/…/sandbox_helper", …])
                    ▼
┌────────────────────────────────────────────────────────────────────┐
│  3. HELPER C — /opt/sandboxmgr/helper/sandbox_helper              │
│     • porteur de capabilities cap_setuid, cap_sys_admin, …        │
│     • quatre sous-commandes : useradd, spawn, exec, kill          │
│     • parle directement au noyau : clone(), setns(), mount(),     │
│       setuid(), uid_map, gid_map                                  │
└────────────────────────────────────────────────────────────────────┘
                    │ appels système
                    ▼
             ┌──────────────────────────────┐
             │   Noyau Linux (namespaces)   │
             └──────────────────────────────┘
```

### 2.2 Pourquoi couper en trois ?

- **Le frontend** n'a aucun privilège : c'est du HTML/JS dans un navigateur.
  Il ne fait qu'appeler des URLs et afficher les réponses.
- **Le backend Flask** tourne en tant qu'utilisateur `sandboxmgr` (non-root).
  Il connaît la base de données, les JWT, la logique métier — mais il **ne peut
  pas** créer un namespace ni faire `setuid` par lui-même.
- **Le helper C** est la seule pièce autorisée à toucher au noyau pour ces
  opérations privilégiées. Il est petit (~300 lignes), auditable, valide
  strictement ses arguments, et n'accepte que 4 sous-commandes.

Cette séparation applique le principe du **moindre privilège** : si un bug
existe dans Flask, l'attaquant n'obtient pas root — il ne peut que demander au
helper les 4 opérations que celui-ci sait faire.

---

## 3. Modèle de données

Trois tables SQLite (voir `app/models/__init__.py`).

### 3.1 `Utilisateur`

| Champ                     | Type       | Rôle                                                                  |
|---------------------------|------------|-----------------------------------------------------------------------|
| `id`                      | UUID       | identifiant applicatif (mis dans le JWT sous `sub`)                   |
| `nom_systeme`             | string     | nom d'utilisateur Linux réel (`alice`, `bob`…)                        |
| `uid_systeme`             | int        | UID Linux (ex : 1001) — utilisé pour `setuid()` dans la sandbox       |
| `date_derniere_connexion` | datetime   | mise à jour à chaque login                                            |

> **Aucun mot de passe n'est stocké.** L'authentification est déléguée à PAM
> qui consulte `/etc/shadow` — géré par le système d'exploitation.

### 3.2 `Sandbox`

| Champ            | Type   | Rôle                                                            |
|------------------|--------|-----------------------------------------------------------------|
| `id`             | UUID   | identifiant applicatif                                          |
| `nom_virtuel`    | string | nom lisible choisi par l'utilisateur (« ma-bulle »)             |
| `pid_racine`     | int    | PID hôte du processus `init` de la sandbox (retourné par `clone`) |
| `statut`         | enum   | `EN_COURS`, `ARRETEE`, `EN_ERREUR`                              |
| `proprietaire_id`| UUID   | clé étrangère vers `Utilisateur.id`                             |

Le `pid_racine` est la clé qui relie la ligne en base au processus vivant dans
le noyau : c'est via `/proc/<pid_racine>/ns/*` qu'on rejoindra les namespaces
lors d'un `exec`.

### 3.3 `Commande`

Un journal append-only : chaque commande tapée dans le terminal produit une
ligne avec `texte_instruction`, `resultat_sortie`, `est_reussie`,
`date_execution`. Sert à l'onglet « Historique » côté frontend.

---

## 4. Module d'authentification

### 4.1 Deux principes clés

1. **On ne réinvente pas la gestion des mots de passe.** L'application délègue
   à **PAM** (*Pluggable Authentication Modules*), la brique standard Linux qui
   sait comparer un mot de passe saisi au hash de `/etc/shadow`. Résultat :
   même politique de mots de passe que le système, même gestion du verrouillage
   après trop d'échecs, aucun secret applicatif à protéger.
2. **Après login, on émet un JWT** (*JSON Web Token*). C'est une chaîne signée
   qui contient l'ID utilisateur et l'UID Linux. Le frontend le stocke dans
   `localStorage` et le renvoie à chaque requête dans l'entête HTTP
   `Authorization: Bearer <jwt>`.

### 4.2 Frontend

- `src/lib/api.ts` — fonction `login(username, password)` : `POST /api/auth/login`,
  reçoit `{ token, user }`, laisse `AuthProvider` sauvegarder dans localStorage.
- `src/lib/auth.tsx` — contexte React `AuthProvider` + hook `useAuth()`. Expose
  `user`, `token`, `login()`, `logout()`. Sur `logout()`, purge localStorage,
  remet à zéro tout le state React (les sandboxes du user précédent
  disparaissent immédiatement).
- Sur toute réponse `401`, `api.ts` purge la session et redirige vers l'écran de
  login. Ça évite l'affichage fantôme après expiration du JWT.

### 4.3 Backend — `POST /api/auth/register`

```text
utilisateur envoie { username, password }
       │
       ▼
Flask valide format username (alphanumérique 2–32) et password (≥ 8)
       │
       ▼
privilege_manager.create_linux_user(username, password)
       │
       ▼
subprocess.run([helper, "useradd", username], input=password)
       │
       ▼
helper : execl("/usr/sbin/useradd", "-m", "-s", "/bin/bash", username)
         puis execl("/usr/sbin/chpasswd") pour poser le mot de passe
       │
       ▼
Flask lit l'UID via getpwnam(username), insère l'Utilisateur en base
```

Le mot de passe n'est jamais logué ni stocké : il transite sur `stdin` d'un
sous-processus puis est oublié.

### 4.4 Backend — `POST /api/auth/login`

```python
if not pam.pam().authenticate(username, password, service="login"):
    return 401
uid  = get_uid(username)                 # via getpwnam
user = get_or_create_utilisateur(...)     # miroir applicatif
token = jwt.encode({"sub": user.id, "uidSysteme": uid, "exp": now+8h}, SECRET)
```

Le JWT contient `uidSysteme` : plus tard, quand l'utilisateur exécute une
commande, on lit cet UID directement dans le token — pas besoin de re-consulter
`/etc/passwd`.

### 4.5 Décorateur `@login_required`

Chaque route protégée fait :

```python
token = request.headers["Authorization"][7:]          # après "Bearer "
claims = jwt.decode(token, JWT_SECRET, ["HS256"])     # vérifie signature + exp
g.user_id   = claims["sub"]
g.user_uid  = claims["uidSysteme"]
g.user_name = claims["nomSysteme"]
```

Un token expiré ou falsifié lève une exception → réponse 401.

---

## 5. Module de gestion des sandboxes

Trois opérations : **créer**, **lister**, **supprimer**. Le blueprint
`app/sandboxes/routes.py` implémente tout ça en ~90 lignes très linéaires.

### 5.1 Création — `POST /api/sandboxes`

1. Le frontend appelle `createSandbox("ma-bulle")` (`src/lib/api.ts`).
2. Flask crée une ligne `Sandbox` en statut `ARRETEE` (`db.session.flush()` :
   la ligne existe en mémoire, pas encore committée).
3. Flask appelle `privilege_manager.spawn_sandbox(mode, uid, hostname)` qui
   invoque le helper : `subprocess.run([helper, "spawn", mode, uid, hostname])`.
4. Le helper `clone()` un vrai processus init dans les nouveaux namespaces et
   imprime `PID <n>` sur stdout, puis se termine. **L'init reste vivant** et
   devient PID 1 dans son propre PID namespace.
5. Flask parse `PID <n>`, écrit `pid_racine = n`, passe le statut à `EN_COURS`,
   commit.
6. Réponse `201 { "sandbox": {...} }`.

Si le helper échoue, on **rollback** — pas de sandbox fantôme en base.

### 5.2 Listing — `GET /api/sandboxes`

```python
items = Sandbox.query.filter_by(proprietaire_id=g.user_id).all()
```

Filtrage **côté serveur uniquement** : le frontend ne re-filtre jamais. Ainsi
un JWT ne peut lister que ses propres sandboxes, même en forgeant les requêtes.

### 5.3 Suppression — `DELETE /api/sandboxes/:id`

1. Vérifie que le user courant est propriétaire (sinon 404 pour ne pas révéler
   l'existence).
2. Appelle `kill_sandbox(pid_racine)` → helper `kill` → `SIGTERM` sur l'init.
   Le noyau nettoie automatiquement tous les namespaces quand le dernier
   processus qui les référence disparaît.
3. `db.session.delete(sb); commit()` — `cascade="all, delete-orphan"` sur
   `commandes` supprime l'historique lié en même temps.

---

## 6. Exécution des commandes (terminal WebSocket)

### 6.1 Pourquoi WebSocket ?

Un terminal, c'est de la latence perçue : on veut voir la sortie **au fil de
l'eau**. Une requête HTTP classique paierait le coût d'un handshake par
commande. Le WebSocket ouvre un tuyau bidirectionnel une seule fois, réutilisé
pour toutes les commandes de la session.

### 6.2 Ouverture de la connexion

Frontend — `src/hooks/useSandboxTerminal.ts` :

```ts
const url = `${WS_BASE_URL}/ws/sandboxes/${sandboxId}/terminal?token=${jwt}`;
const ws  = new WebSocket(url);
```

Le JWT est passé en **query string** car un navigateur n'a pas d'API pour
ajouter un header HTTP sur `new WebSocket(...)`. Reconnexion automatique avec
backoff `1s → 2s → 5s → stop`.

Backend — `app/ws/terminal.py` :

```python
@sock.route("/ws/sandboxes/<sandbox_id>/terminal")
def terminal(ws, sandbox_id):
    uid, user_id = _auth(ws)              # décode le JWT depuis ?token=
    sb = Sandbox.query.get(sandbox_id)
    if sb.proprietaire_id != user_id: return  # 403 silencieux
    ...
```

### 6.3 Protocole JSON

| Sens        | Payload                                     | Rôle                          |
|-------------|---------------------------------------------|-------------------------------|
| client → sv | `{"type":"cmd","text":"ls -la"}`            | commande à exécuter           |
| client → sv | `{"type":"history_prev"}`                   | flèche ↑ dans le terminal     |
| sv → client | `{"type":"stdout","text":"..."}`            | sortie de la commande         |
| sv → client | `{"type":"exit","ok":true}`                 | fin de commande               |
| sv → client | `{"type":"history","text":"ls" \| null}`    | réponse à `history_prev`      |
| sv → client | `{"type":"error","message":"..."}`          | erreur métier                 |

### 6.4 Traitement côté serveur

Boucle principale (mode DEFENSE) :

```python
while True:
    raw = ws.receive()
    msg = json.loads(raw)
    if msg["type"] == "cmd":
        argv = shlex.split(msg["text"])         # split shell-safe
        if argv[0] not in WHITELIST:            # ls, pwd, whoami, cat, …
            ws.send({"type":"error","message":"command_not_allowed"})
            continue
        out, ok = exec_in_sandbox(uid, sb.pid_racine, argv)
        db.session.add(Commande(texte=..., resultat=out, est_reussie=ok, ...))
        db.session.commit()
        ws.send({"type":"stdout","text":out})
        ws.send({"type":"exit","ok":ok})
```

- **`shlex.split`** = parse la ligne comme le shell, mais sans exécuter de shell.
  Pas d'expansion `$VAR`, pas d'injection possible via `; rm -rf /`.
- **Whitelist stricte** en DEFENSE : seule une petite liste (`ls`, `pwd`,
  `whoami`, `id`, `cat`, `echo`, `hostname`, `ps`, `uname`, `date`, `env`) est
  autorisée. Toute autre commande est refusée avant même d'atteindre le helper.

En mode ATTACK, on remplace tout ça par `argv = ["/bin/bash", "-c", text]` —
volontairement vulnérable pour la démo.

### 6.5 `exec_in_sandbox` (Python)

```python
subprocess.run([helper, "exec", str(uid), str(pid_racine), *argv],
               capture_output=True, timeout=30)
```

C'est tout. Toute la magie namespace/PID/UID est dans le helper.

---

## 7. Le helper C — cœur de l'isolation

### 7.1 Pourquoi un binaire séparé en C ?

Python ne peut pas détenir de **capability** Linux fiablement (l'interpréteur
est partagé, chargé de plugins, etc. — un SUID Python serait un désastre de
sécurité). Le helper C, lui, est un binaire minuscule, isolé, à qui on colle
exactement les droits nécessaires via `setcap`.

C'est le seul chemin d'élévation dans toute l'application.

### 7.2 Les quatre sous-commandes

| Commande       | Rôle                                                      | Retour                     |
|----------------|-----------------------------------------------------------|----------------------------|
| `useradd USER` | crée un compte Linux, pose le mot de passe (lu sur stdin) | rc=0 succès                |
| `spawn MODE UID HOSTNAME` | crée l'init d'une sandbox dans de nouveaux namespaces | imprime `PID <n>`  |
| `exec UID PID ARGV…` | exécute une commande dans les namespaces de `PID`     | rc = code sortie           |
| `kill PID`     | envoie SIGTERM à l'init                                   | rc=0                       |

### 7.3 `spawn` — création d'une bulle

C'est l'opération la plus technique. Squelette :

```c
int flags = SIGCHLD
          | CLONE_NEWNS | CLONE_NEWUTS | CLONE_NEWPID
          | CLONE_NEWNET | CLONE_NEWIPC;
if (defense) flags |= CLONE_NEWUSER;

pid_t pid = clone(sandbox_init, stack + STACK_SIZE, flags, &ctx);
```

Chaque `CLONE_NEW*` crée un **namespace** distinct :

| Namespace | Ce qu'il isole                                                        |
|-----------|-----------------------------------------------------------------------|
| `NEWNS`   | mounts (`/`, `/proc`, …) — la sandbox verra son propre arbre de mount |
| `NEWUTS`  | hostname (`sethostname`)                                              |
| `NEWPID`  | table des processus — l'init cloné sera PID 1 dans la sandbox         |
| `NEWNET`  | interfaces réseau, tables de routage (isolé de l'hôte)                |
| `NEWIPC`  | files de messages, sémaphores SysV                                    |
| `NEWUSER` | table de mapping UID/GID — permet à un UID interne 0 (root sandbox)   |
|           | de correspondre à un UID hôte non-privilégié                          |

Après `clone()`, on est dans la course : le fils tourne dans les nouveaux
namespaces mais **il faut écrire `uid_map`/`gid_map` depuis le parent** (le
noyau interdit au fils d'écrire son propre mapping s'il n'a pas la capability
adéquate dans le user namespace parent). Deux pipes servent de rendez-vous :

```text
parent                                fils (init sandbox)
──────                                ───────────────────
clone(...)                            → démarre sandbox_init()
                                      read(ready_r)  ← bloque
write /proc/<pid>/setgroups "deny"
write /proc/<pid>/uid_map  "0 UID 1"
write /proc/<pid>/gid_map  "0 UID 1"
write(ready_w, "1")                   ← débloque
                                      sethostname(...)
                                      mount("/", MS_PRIVATE)
                                      umount2("/proc", MNT_DETACH)
                                      mount("proc", "/proc", "proc", ...)
                                      write(ack_w, "1")
read(ack_r)                           ← attend l'ack
printf("PID %d\n", pid)               dup2(devnull, {0,1,2})  ← libère les pipes
exit(0)                               for (;;) pause();
```

Deux détails cruciaux qu'on a dû corriger en cours de projet :

1. **`dup2(devnull, 0/1/2)`** dans l'init. Sans ça, l'init hérite des pipes
   stdout/stderr du helper → `subprocess.run(capture_output=True)` côté Flask
   attend un EOF qui n'arrive jamais → timeout 15 s.
2. **`umount2("/proc", MNT_DETACH)` avant `mount("proc")`**. Sans ça, le mount
   échoue avec `EBUSY` car `/proc` est déjà monté dans la vue héritée.

### 7.4 `exec` — rejoindre une bulle existante

`docker exec` en 30 lignes de C :

```c
const char *order[] = { "ipc", "uts", "net", "pid", "mnt" };
for (i=0; i<5; i++) fds[i] = open("/proc/<sandbox_pid>/ns/<name>", O_RDONLY);
for (i=0; i<5; i++) setns(fds[i], 0);

pid_t child = fork();                 // OBLIGATOIRE après setns(pid)
if (child == 0) {
    umount2("/proc", MNT_DETACH);
    mount("proc", "/proc", "proc", ...);
    struct passwd *pw = getpwuid(uid);
    initgroups(pw->pw_name, pw->pw_gid);
    setgid(pw->pw_gid);
    setuid(uid);                      // laisse tomber les capabilities
    execvp(argv[0], argv);
}
waitpid(child, &st, 0);
return WEXITSTATUS(st);
```

Points subtils :

- **On ne fait PAS `setns(user)`.** Les noyaux modernes le refusent
  (`EPERM`) même avec `CAP_SYS_ADMIN` si le user ns a été créé par un autre
  process. On hérite implicitement du user ns via les autres namespaces —
  c'est ce que fait aussi Docker/Podman.
- **`fork()` obligatoire** après `setns` sur le PID namespace. Le noyau
  n'applique le nouveau PID ns qu'aux **enfants** du process, jamais au
  process lui-même.
- **`setuid(uid)` en dernier** : ça abandonne toutes les capabilities.
  Le processus qui va exécuter la commande de l'utilisateur ne peut plus
  rien de privilégié — même si `argv[0]` est malveillant.

### 7.5 Isolement des inputs

Toutes les entrées du helper sont **strictement validées** :

- `username` : `[a-z0-9]{2,32}` (regex simplifiée dans `is_valid_username`) ;
- `uid` : entier ≥ 1000 et ≤ 65535 (jamais root, jamais un UID système) ;
- `mode` : `attack` | `defense` uniquement ;
- `sandbox_pid` : entier ≥ 2.

Aucun argument n'est passé à un shell. Toutes les exécutions se font par
`execl`/`execvp` avec des `argv[]` explicites — donc pas d'injection possible.

---

## 8. Configuration et gestion des droits

### 8.1 Trois utilisateurs Linux impliqués

| Utilisateur     | Rôle                                                       | Peut-il devenir root ? |
|-----------------|------------------------------------------------------------|------------------------|
| `root`          | propriétaire du binaire helper, installe les capabilities  | oui                    |
| `sandboxmgr`    | exécute Flask, écoute sur le port 5000/8443/9443           | **non**                |
| `alice`, `bob`…  | utilisateurs finaux, créés via `/api/auth/register`        | non                    |

Flask **jamais** ne tourne en root. Il est démarré via `systemd` sous l'user
`sandboxmgr` (voir `flask-backend/systemd/*.service`).

### 8.2 Les capabilities sur le helper

Les *capabilities* Linux permettent d'accorder **une sous-partie précise** de
ce que fait root, sans donner root complet. On les colle au binaire une fois
à l'installation :

```bash
sudo chown root:sandboxmgr helper/sandbox_helper
sudo chmod 750 helper/sandbox_helper           # exécutable UNIQUEMENT par
                                               # root et le groupe sandboxmgr
sudo setcap cap_setuid,cap_setgid,\
            cap_sys_admin,cap_sys_chroot,\
            cap_net_admin,cap_dac_override,\
            cap_chown,cap_fowner+ep helper/sandbox_helper
```

Détail de chaque capability :

| Capability          | Ce qu'elle autorise                                            | Utilisée par     |
|---------------------|----------------------------------------------------------------|------------------|
| `cap_setuid`        | `setuid()` vers n'importe quel UID                             | `exec`           |
| `cap_setgid`        | `setgid()` + `setgroups()`                                     | `exec`           |
| `cap_sys_admin`     | `clone(CLONE_NEW*)`, `setns()`, `mount()`, `sethostname()`     | `spawn`, `exec`  |
| `cap_sys_chroot`    | `chroot()` — utile si tu ajoutes plus tard un `pivot_root`     | `spawn` (futur)  |
| `cap_net_admin`     | manipuler interfaces réseau (utile pour un veth pair futur)    | `spawn` (futur)  |
| `cap_dac_override`  | écrire dans `/proc/<pid>/uid_map` même sans être propriétaire  | `spawn`          |
| `cap_chown`, `cap_fowner` | `useradd -m` crée un home avec `chown` du nouveau user   | `useradd`        |

Le `+ep` signifie **effective + permitted** : les capabilities sont actives
dès le démarrage du binaire et disponibles pour l'exec de programmes fils.

### 8.3 Pré-requis système

- `sandboxmgr` doit avoir une plage de sous-UID/sous-GID dans `/etc/subuid`
  et `/etc/subgid` — nécessaire pour `CLONE_NEWUSER` :
  ```bash
  sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 sandboxmgr
  ```
- `libpam0g-dev` installé, module Python `python-pam` disponible pour l'auth.
- SQLite pour la persistance (aucun serveur à installer).

### 8.4 Variables d'environnement (`.env`)

| Variable                 | Rôle                                                              |
|--------------------------|-------------------------------------------------------------------|
| `SANDBOXMGR_MODE`        | `defense` ou `attack`                                             |
| `FLASK_SECRET_KEY`       | secret Flask (sessions/cookies)                                   |
| `JWT_SECRET`             | clé HMAC pour signer les JWT                                      |
| `HELPER_BIN`             | chemin absolu vers `sandbox_helper`                               |
| `DATABASE_URL`           | ex : `sqlite:///sandboxmgr.db`                                    |
| `CORS_ORIGINS`           | liste d'origines autorisées pour le frontend                      |

Coté frontend (`.env.local` à la racine) :

| Variable       | Rôle                          | Défaut                  |
|----------------|-------------------------------|-------------------------|
| `VITE_API_URL` | base URL REST                 | `http://127.0.0.1:5000` |
| `VITE_WS_URL`  | base URL WebSocket            | `ws://127.0.0.1:5000`   |

---

## 9. Modes ATTACK vs DEFENSE

Deux services systemd distincts, deux ports, deux bases séparées, **même
code**. Le comportement change en lisant `SANDBOXMGR_MODE`.

| Aspect                       | DEFENSE (port 8443)                            | ATTACK (port 9443)                |
|------------------------------|------------------------------------------------|-----------------------------------|
| User namespace               | Activé (`CLONE_NEWUSER`)                       | Désactivé                         |
| Mapping root sandbox → hôte  | UID 0 interne → UID user, unique               | (pas de mapping)                  |
| Exécution des commandes      | `execvp(argv[])` — pas de shell                | `bash -c "<input>"` (INJECTION)   |
| Whitelist                    | Stricte, appliquée serveur                     | Aucune                            |
| Bannière UI                  | verte "DEFENSE"                                | rouge "ATTACK — DEMO ONLY"        |

Le mode ATTACK n'est là **que pour la démo pédagogique** : il montre pourquoi
concaténer `bash -c $INPUT` est catastrophique. Il ne doit jamais tourner sur
une machine exposée au réseau.

---

## 10. Cycle de vie complet d'une requête

Prenons le cas le plus riche : Alice tape `ls -la` dans le terminal d'une
sandbox déjà créée.

```text
 ┌───────────────────────────────────────────────────────────────────────┐
 │ 1. Navigateur (React)                                                 │
 │    xterm émet "ls -la\n"                                              │
 │    useSandboxTerminal.sendCommand("ls -la")                           │
 │    ws.send('{"type":"cmd","text":"ls -la"}')                          │
 └───────────────────────────────────────────────────────────────────────┘
                                    │ WebSocket frame
                                    ▼
 ┌───────────────────────────────────────────────────────────────────────┐
 │ 2. Flask — app/ws/terminal.py                                         │
 │    - décode le JWT (query ?token=…)                                   │
 │    - vérifie sb.proprietaire_id == user_id                            │
 │    - shlex.split("ls -la") → ["ls", "-la"]                            │
 │    - "ls" ∈ WHITELIST ✅                                              │
 │    - appelle exec_in_sandbox(uid=1001, pid=26404, ["ls","-la"])       │
 └───────────────────────────────────────────────────────────────────────┘
                                    │ subprocess.run
                                    ▼
 ┌───────────────────────────────────────────────────────────────────────┐
 │ 3. Helper C — cmd_exec                                                │
 │    open /proc/26404/ns/{ipc,uts,net,pid,mnt}                          │
 │    setns() sur chacun (hérite du user ns via mnt/pid)                 │
 │    fork() ─┐                                                          │
 │            │                                                          │
 │            ▼                                                          │
 │    ┌─────────────────────────────────────────────────────────┐        │
 │    │ Enfant — dans TOUS les namespaces de la sandbox         │        │
 │    │   umount2("/proc"); mount("proc")   ← ps voit uniquement│        │
 │    │                                       les PIDs sandbox  │        │
 │    │   getpwuid(1001) → initgroups + setgid                  │        │
 │    │   setuid(1001)   ← abandonne les capabilities           │        │
 │    │   execvp("ls", ["ls","-la"])                            │        │
 │    └─────────────────────────────────────────────────────────┘        │
 │    waitpid(child) → rc=0, capture stdout                              │
 └───────────────────────────────────────────────────────────────────────┘
                                    │ stdout capturé
                                    ▼
 ┌───────────────────────────────────────────────────────────────────────┐
 │ 4. Flask                                                              │
 │    - insère une Commande (texte, sortie, est_reussie=True)            │
 │    - ws.send('{"type":"stdout","text":"total 12\ndrwx..."}')          │
 │    - ws.send('{"type":"exit","ok":true}')                             │
 └───────────────────────────────────────────────────────────────────────┘
                                    │ WebSocket frames
                                    ▼
 ┌───────────────────────────────────────────────────────────────────────┐
 │ 5. Navigateur                                                         │
 │    useSandboxTerminal.onmessage → append({type:"stdout", ...})        │
 │    xterm affiche la sortie                                            │
 └───────────────────────────────────────────────────────────────────────┘
```

Le tout prend typiquement moins de 50 ms sur une VM Linux moderne.

---

## Annexe A — Où trouver quoi dans le code

| Sujet                              | Fichier                                                |
|------------------------------------|--------------------------------------------------------|
| Configuration / modes              | `flask-backend/app/config.py`                          |
| Modèles SQLAlchemy                 | `flask-backend/app/models/__init__.py`                 |
| JWT + `@login_required`            | `flask-backend/app/auth/security.py`                   |
| Auth PAM, register, login          | `flask-backend/app/auth/routes.py`                     |
| CRUD sandboxes                     | `flask-backend/app/sandboxes/routes.py`                |
| WebSocket terminal                 | `flask-backend/app/ws/terminal.py`                     |
| Wrapper vers le helper             | `flask-backend/app/privilege/privilege_manager.py`     |
| **Helper C (isolation namespaces)**| `flask-backend/helper/sandbox_helper.c`                |
| Services systemd (attack/defense)  | `flask-backend/systemd/*.service`                      |
| Client HTTP typé (fetch + JWT)     | `src/lib/api.ts`                                       |
| Contexte React auth                | `src/lib/auth.tsx`                                     |
| Hook WebSocket terminal            | `src/hooks/useSandboxTerminal.ts`                      |
| Pages React (dashboard, terminal…) | `src/components/**`                                    |

## Annexe B — Glossaire minimal

- **Namespace** : cloison du noyau qui isole une ressource (PID, réseau,
  mounts, hostname, IPC, users) pour un groupe de processus.
- **Capability** : sous-permission de root. Ex. `CAP_SETUID` = « peut changer
  d'UID », sans devoir être root pour le reste.
- **`clone()`** : appel système comme `fork()`, mais avec des flags pour créer
  de nouveaux namespaces au passage.
- **`setns()`** : « rejoindre » un namespace existant en ouvrant
  `/proc/<pid>/ns/<name>`.
- **PAM** : *Pluggable Authentication Modules*, framework Linux d'auth
  (vérifie les mots de passe contre `/etc/shadow`, gère 2FA, lockout…).
- **JWT** : token signé (HMAC ici) que le client renvoie à chaque requête pour
  prouver qu'il est authentifié. Contient l'ID user + l'UID Linux.
- **WebSocket** : canal bidirectionnel persistant sur HTTP, utilisé ici pour
  le terminal en temps réel.
- **`uid_map` / `gid_map`** : fichiers dans `/proc/<pid>/` où l'on déclare la
  correspondance « UID interne → UID hôte » dans un user namespace.
