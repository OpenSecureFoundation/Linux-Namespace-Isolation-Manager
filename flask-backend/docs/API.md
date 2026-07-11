# API — Web-based Linux Namespace Isolation Manager

Toutes les routes JSON sont préfixées par `/api`. Authentification par JWT
(`Authorization: Bearer <token>`) sauf `/api/auth/login`, `/api/auth/register`,
`/api/health`.

## Auth

### POST /api/auth/login
```json
{ "username": "alice", "password": "..." }
→ 200 { "token": "<jwt>", "user": { "id","nomSysteme","uidSysteme","dateDerniereConnexion" } }
→ 401 { "error": "invalid_credentials" }
```

### POST /api/auth/register
```json
{ "username": "alice", "password": "..." }  # >= 8 chars, alnum username
→ 201 { "user": {...} }
→ 409 { "error": "already_exists" }
```

### POST /api/auth/logout
`→ 200 { "ok": true }` (JWT stateless — le client jette le token).

### GET /api/auth/me
`→ 200 { "user": {...} }`

## Sandboxes

### GET /api/sandboxes
`→ 200 { "sandboxes": [ Sandbox, ... ] }` (uniquement celles du user connecté)

### POST /api/sandboxes
```json
{ "nomVirtuel": "ma-bulle" }   # optionnel
→ 201 { "sandbox": Sandbox }
→ 500 { "error": "spawn_failed", "detail": "..." }  # rollback effectué
```

### DELETE /api/sandboxes/:id
`→ 200 { "ok": true }` / `404 { "error": "not_found" }`

### GET /api/sandboxes/:id/commands
`→ 200 { "commands": [ Commande, ... ] }` (desc par date)

### GET /api/sandboxes/:id/commands/last
`→ 200 { "command": Commande | null }` (utilisé par la flèche ↑ du terminal)

## Terminal (WebSocket)

`GET wss://host/ws/sandboxes/:id/terminal?token=<jwt>`

Frames JSON :

| Sens        | Payload                                     |
|-------------|---------------------------------------------|
| client → sv | `{ "type": "cmd", "text": "ls -la" }`       |
| client → sv | `{ "type": "history_prev" }`                |
| sv → client | `{ "type": "stdout", "text": "..." }`       |
| sv → client | `{ "type": "exit", "ok": true }`            |
| sv → client | `{ "type": "history", "text": "ls" \| null }`|
| sv → client | `{ "type": "error", "message": "..." }`     |

Codes d'erreur WS : `missing_token`, `invalid_token`, `not_found`,
`sandbox_not_running`, `command_not_allowed` (mode DEFENSE seulement).

## Schémas

```
Sandbox   { id, nomVirtuel, pidRacine, dateCreation, statut, proprietaireId }
Commande  { id, texteInstruction, dateExecution, resultatSortie, estReussie, sandboxId }
Utilisateur { id, nomSysteme, uidSysteme, dateDerniereConnexion }
StatutSandbox ∈ { "EN_COURS", "ARRETEE", "EN_ERREUR" }
```
