import { STATUT } from "../data/constants.js";

export function randHex(n) {
  const chars = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * 16)];
  return s;
}

/** id : UUID — tel que typé dans le diagramme de classes (Utilisateur.id, Sandbox.id) */
export function uuidLike() {
  return `${randHex(8)}-${randHex(4)}-${randHex(4)}-${randHex(4)}-${randHex(12)}`;
}

export function nowStamp() {
  const d = new Date();
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatDateTime(d) {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/**
 * Utilisateur — référence un compte Linux existant sur la machine hôte
 * (Cahier de Conception §3.2). Ne stocke jamais de mot de passe.
 * Attributs : id (UUID) · nomSysteme (String) · uidSysteme (Integer) ·
 * dateDerniereConnexion (DateTime)
 */
export function makeUtilisateur(nomSysteme) {
  return {
    id: uuidLike(),
    nomSysteme,
    uidSysteme: 1000 + Math.floor(Math.random() * 9000),
    dateDerniereConnexion: new Date(),
  };
}

/**
 * Sandbox — Cahier de Conception §3.2.
 * Attributs du diagramme de classes : id (UUID) · nomVirtuel (String) ·
 * pidRacine (Integer) · dateCreation (DateTime) · statut (StatutSandbox) ·
 * proprietaireId (UUID).
 *
 * Champs supplémentaires (hostname, netIf, processusVisibles, history,
 * lines) : hors diagramme de classes, purement UI — ils servent à
 * matérialiser "l'isolation visible et vérifiable" exigée par le Cahier
 * d'Analyse (hostname distinct, interfaces réseau, processus visibles)
 * et à faire fonctionner le terminal côté client.
 *
 * pidRacine n'est attribué qu'à la résolution réussie de démarrer()
 * (voir DS1) : il vaut null tant que la sandbox est en statut CREATION.
 */
export function makeSandbox(nomVirtuel, proprietaireId) {
  const id = uuidLike();
  const short = id.slice(0, 6);
  return {
    id,
    nomVirtuel: nomVirtuel && nomVirtuel.trim() ? nomVirtuel.trim() : `sbx-${short}`,
    pidRacine: null,
    dateCreation: new Date(),
    statut: STATUT.CREATION,
    proprietaireId,

    // Supplémentaires — UI uniquement, hors diagramme de classes
    hostname: `ns-${short}`,
    netIf: `veth${id.slice(0, 3)}`,
    processusVisibles: 2 + Math.floor(Math.random() * 3),
    history: [],
    lines: [{ type: "sys", text: "Initialisation des namespaces (PID · NET · UTS · MNT · USER)…" }],
  };
}

/**
 * Commande — Cahier de Conception §3.2.
 * Attributs du diagramme de classes : id (Integer) · texteInstruction (String) ·
 * dateExécution (DateTime) · résultatSortie (String) · estRéussie (Boolean).
 *
 * sandboxId et modeContexte sont des champs supplémentaires UI (traçabilité
 * de l'historique global et badge ATTACK/DEFENSE), absents du diagramme.
 */
export function makeCommande({ id, sandboxId, texteInstruction, resultatSortie, estReussie, statutExecution, modeContexte, sandboxNom }) {
  return {
    id,
    sandboxId,
    texteInstruction,
    dateExecution: new Date(),
    resultatSortie,
    estReussie,
    statutExecution, // "ok" | "rejected" | "breach" — nuance UI au-delà du simple booléen estReussie
    modeContexte,
    sandboxNom,
  };
}
