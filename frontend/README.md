# Linux Namespace Isolation Manager — Frontend

Interface web React du projet **Web-based Linux Namespace Isolation Manager**
(Institut Universitaire Saint Jean — Université de Yaoundé I).

Ce dépôt contient **uniquement le frontend**. Le backend (Flask) est un projet
séparé ; ce frontend fonctionne pour l'instant en mode simulé (voir plus bas)
pour être testé et présenté sans backend.

## Aperçu

- Palette reprise de la page de garde du Cahier d'Analyse : fond papier blanc,
  encre presque noire, vert de l'institut, filet vert fin.
- Élément signature : chaque sandbox est représentée comme une **fenêtre de
  terminal vivante** (hostname, PID, interface réseau visibles en direct),
  pour rendre l'isolation "visible et vérifiable" comme l'exige le cahier.
- Bascule globale **ATTACK / DEFENSE** avec couleur et label distincts (rouge
  terracotta vs vert), comme demandé dans les besoins non fonctionnels.

## Prérequis

- [Node.js](https://nodejs.org/) 18 ou plus récent
- npm (fourni avec Node.js)

## Installation

```bash
npm install
```

## Lancer en développement

```bash
npm run dev
```

L'application est servie sur **http://localhost:5173**.

## Générer le build de production

```bash
npm run build
```

Le résultat est généré dans `dist/`. Vous pouvez le prévisualiser avec :

```bash
npm run preview
```

## Arborescence du projet

```
nsiso-frontend/
├── index.html                     Point d'entrée HTML (Vite)
├── package.json                   Dépendances et scripts npm
├── vite.config.js                 Configuration Vite + proxy /api vers Flask
├── src/
│   ├── main.jsx                   Point d'entrée React
│   ├── App.jsx                    Composant racine : état global, navigation
│   ├── styles/
│   │   ├── theme.js                Jetons de design (couleurs, polices)
│   │   └── global.css              Import des polices, resets, animations
│   ├── data/
│   │   └── constants.js            Dimensions de namespace, whitelist, vulnérabilités, défenses
│   ├── utils/
│   │   ├── helpers.js              Génération d'ID, timestamps, fabrique de sandbox
│   │   └── simulate.js             Simulateur de commandes (À REMPLACER par l'appel au backend)
│   └── components/
│       ├── common/                 Badge, Dot (statut), TermWindow (fenêtre terminal)
│       ├── layout/                 Sidebar, NavItem, TopBar
│       ├── auth/                   LoginScreen (UC0 — s'authentifier)
│       ├── dashboard/               StatCard, SandboxCard, CreateModal, DashboardPage, SandboxesPage
│       │                            (UC1, UC2, UC3 — créer / lister / détruire une sandbox)
│       ├── terminal/
│       │   └── TerminalPage.jsx     UC4, UC5 — exécuter une commande, rappeler l'historique
│       ├── security/
│       │   ├── AttackPage.jsx       Module ATTACK — démonstration des 3 vulnérabilités
│       │   └── DefensePage.jsx      Module DEFENSE — vérification des 3 contre-mesures
│       └── history/
│           └── HistoryPage.jsx      Journal de traçabilité des commandes
```

## Modèle de données — aligné sur le Cahier de Conception

`src/utils/helpers.js` implémente exactement les classes du diagramme de
classes (§3 du Cahier de Conception) :

- **Utilisateur** — `id` (UUID) · `nomSysteme` · `uidSysteme` · `dateDerniereConnexion`
- **Sandbox** — `id` (UUID) · `nomVirtuel` · `pidRacine` · `dateCreation` · `statut` · `proprietaireId`
- **Commande** — `id` (Integer) · `texteInstruction` · `dateExecution` · `resultatSortie` · `estReussie`
- **StatutSandbox** (`src/data/constants.js`) — `EN_COURS` / `ARRETEE` / `EN_ERREUR`
  (+ `CREATION` / `DESTRUCTION`, deux états transitoires purement UI pour les
  animations, absents de l'énumération officielle)

Quelques champs supplémentaires (`hostname`, `netIf`, `processusVisibles`,
`history`, `lines`, `modeContexte`, `statutExecution`) n'existent pas dans le
diagramme de classes : ce sont des besoins d'affichage propres au frontend
(preuve d'isolation visible, transcript du terminal, badge ATTACK/DEFENSE).
Ils sont documentés comme tels directement dans le code.

### DS1 — Créer une sandbox (3 issues simulées)

`App.handleCreate` reproduit les trois branches du diagramme de séquence DS1 :
succès complet, succès partiel (bulle créée mais le terminal ne démarre pas →
nettoyage automatique), ou échec dès la création de la bulle. Dans les deux
cas d'échec, la sandbox n'apparaît jamais dans la liste et un message
d'échec s'affiche (`ToastStack`). Pour présenter les trois issues sans
dépendre du tirage aléatoire, nommez la sandbox avec « erreur » ou « fail ».

### DS5 — Supprimer une sandbox (2 branches simulées)

`App.handleDestroy` distingue le cas où le terminal racine a déjà servi
(au moins une commande exécutée → arrêt du terminal puis destruction de la
bulle) du cas où il n'a jamais été utilisé (nettoyage immédiat, mise à jour
directe du statut), conformément au diagramme de séquence DS5.

## Mode simulé → branchement au backend Flask

Tant que le backend n'est pas prêt, toute la logique métier est simulée côté
client dans **`src/utils/simulate.js`** et **`src/App.jsx`**. Pour brancher le
vrai backend Flask, il suffit de remplacer ces points d'entrée par des appels
réseau :

| Fonction actuelle (simulée)       | À remplacer par                                    | Cas d'utilisation |
|------------------------------------|------------------------------------------------------|--------------------|
| `LoginScreen.onLogin`             | `POST /api/auth/login`                                | UC0 / DS0 |
| `App.handleCreate`                | `POST /api/sandboxes`                                 | UC1 / DS1 |
| `App.handleDestroy`               | `DELETE /api/sandboxes/:id`                           | UC3 / DS5 |
| `App.handleRun` → `simulate()`    | WebSocket `wss://.../ws/sandboxes/:id` (voir §2.2 du Cahier de Conception) | UC4 / DS3 |
| liste initiale (`useState`)       | `GET /api/sandboxes`                                  | UC2 / DS2 |
| `commandes` (état local)          | `GET /api/history`                                    | Traçabilité |

Le Cahier de Conception précise que le terminal interactif communique en
**WebSocket**, pas en HTTP classique — c'est le seul canal qui diffère d'un
simple `fetch`. Un proxy de développement vers `http://localhost:5000` est
déjà configuré dans `vite.config.js` (préfixe `/api`) — ajustez l'URL et
ajoutez un proxy WebSocket si votre backend Flask écoute sur un autre port.

## Technologies

- [React 18](https://react.dev/)
- [Vite](https://vitejs.dev/) — bundler et serveur de développement
- [lucide-react](https://lucide.dev/) — icônes
- Polices : [Fraunces](https://fonts.google.com/specimen/Fraunces) (titres),
  [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) (terminal),
  [Inter](https://fonts.google.com/specimen/Inter) (interface)

## Auteurs

TCHINDA Florelle Ecladore · PAYONG Brice Valery · ZOUA HOULI Abraham
Sous la supervision de M. NGUIMBUS Emmanuel — Institut Universitaire Saint Jean,
Année académique 2025-2026.
