import { Cpu, Network, Globe2, HardDrive, KeyRound, CheckCircle2, Shield } from "lucide-react";

// Les 5 dimensions d'isolation exigées par le Cahier d'Analyse (besoin A)
export const NS_DIMS = [
  { key: "PID", label: "Processus", icon: Cpu },
  { key: "NET", label: "Réseau", icon: Network },
  { key: "UTS", label: "Hostname", icon: Globe2 },
  { key: "MNT", label: "Fichiers", icon: HardDrive },
  { key: "USER", label: "Identifiants", icon: KeyRound },
];

/**
 * StatutSandbox — énumération du Cahier de Conception (§3.2) :
 * EN_COURS (active et utilisable), ARRETEE (détruite ou stoppée),
 * EN_ERREUR (échec de création ou d'exécution).
 *
 * CREATION et DESTRUCTION n'existent pas dans l'énumération officielle :
 * ce sont des états transitoires purement UI, utilisés le temps d'une
 * animation, avant que la sandbox ne se résolve vers un des 3 statuts
 * réels (voir DS1 et DS5 du Cahier de Conception).
 */
export const STATUT = {
  CREATION: "CREATION",     // transitoire UI uniquement
  EN_COURS: "EN_COURS",
  DESTRUCTION: "DESTRUCTION", // transitoire UI uniquement
  ARRETEE: "ARRETEE",
  EN_ERREUR: "EN_ERREUR",
};

// Commandes autorisées en mode DEFENSE (UC — besoin E : whitelist)
export const WHITELIST = ["ls", "pwd", "whoami", "id", "hostname", "ps", "date", "uname", "echo", "df"];

// Module ATTACK — les 3 vecteurs de vulnérabilité du Cahier d'Analyse
export const VULNS = [
  {
    key: "injection",
    title: "Injection de commande",
    body: "Absence de validation des entrées : un attaquant enchaîne des commandes via ; ou && pour exécuter du code arbitraire sur l'hôte.",
    payload: "ls; whoami",
  },
  {
    key: "host",
    title: "Accès aux ressources de l'hôte",
    body: "Un chroot ou pivot_root défaillant laisse un processus confiné lire des fichiers sensibles hors de sa racine virtuelle via /proc.",
    payload: "cat /proc/1/root/etc/passwd",
  },
  {
    key: "escape",
    title: "Escalade hors namespace",
    body: "Sans User Namespace, le root (UID 0) du sandbox est le root réel de l'hôte : évasion complète possible.",
    payload: "id --privileged",
  },
];

// Module DEFENSE — les 3 contre-mesures correspondantes
export const DEFENSES = [
  {
    key: "userns",
    title: "User Namespace",
    body: "Le root interne du sandbox est mappé vers un utilisateur standard sans privilège sur l'hôte.",
    icon: KeyRound,
    testPayload: "id --privileged",
  },
  {
    key: "whitelist",
    title: "Whitelist de commandes",
    body: "Le serveur valide chaque commande contre une liste stricte avant exécution.",
    icon: CheckCircle2,
    testPayload: "rm -rf /",
  },
  {
    key: "exec",
    title: "Exécution sécurisée",
    body: "Les commandes sont assemblées en tableaux d'arguments, sans passer par un shell — l'injection devient structurellement impossible.",
    icon: Shield,
    testPayload: "ls; whoami",
  },
];
