import { WHITELIST } from "../data/constants.js";

/**
 * Simule l'exécution d'une commande dans une sandbox (UC4 / DS3).
 *
 * À REMPLACER par un échange WebSocket avec le backend Flask — le Cahier
 * de Conception (§2.2) précise que le terminal interactif communique en
 * WebSocket, pas en HTTP classique :
 *
 *   const ws = new WebSocket(`wss://.../ws/sandboxes/${sb.id}`);
 *   ws.send(JSON.stringify({ cmd, mode }));
 *   ws.onmessage = (evt) => { const { status, output } = JSON.parse(evt.data); ... };
 *
 * Le contrat de retour attendu par l'UI est : { status, output }
 * où status ∈ "ok" | "rejected" | "breach".
 */
export function simulate(cmd, mode, sb) {
  const trimmed = cmd.trim();
  if (!trimmed) return null;
  const head = trimmed.split(/\s+/)[0];

  if (mode === "defense" && !WHITELIST.includes(head)) {
    return { status: "rejected", output: `Commande non autorisée : « ${head} » n'est pas dans la whitelist.` };
  }

  const injection = /[;&|]|\/etc\/passwd|\/proc\/1\/root|--privileged/.test(trimmed);

  switch (head) {
    case "ls":
      return { status: "ok", output: "app.log   data/   tmp/   run.sh" };
    case "pwd":
      return { status: "ok", output: "/home/sandbox" };
    case "hostname":
      return { status: "ok", output: sb.hostname };
    case "whoami":
      return { status: "ok", output: mode === "attack" ? "root" : "sandbox_user" };
    case "id":
      return {
        status: "ok",
        output:
          mode === "attack"
            ? "uid=0(root) gid=0(root) groups=0(root)"
            : "uid=1000(sandbox_user) gid=1000(sandbox_user) groups=1000(sandbox_user)",
      };
    case "ps":
      return {
        status: "ok",
        output: `  PID TTY   CMD\n${sb.pidRacine ?? 1} pts/0 bash\n${(sb.pidRacine ?? 1) + sb.processusVisibles} pts/0 ps`,
      };
    case "uname":
      return { status: "ok", output: `Linux ${sb.hostname} 6.8.0-generic x86_64 GNU/Linux` };
    case "date":
      return { status: "ok", output: new Date().toString() };
    case "df":
      return { status: "ok", output: "Filesystem   Size  Used Avail  Mounted\noverlay      8.0G  1.1G  6.9G  /" };
    case "echo":
      return { status: "ok", output: trimmed.slice(5) };
    default:
      if (mode === "attack" && injection) {
        return {
          status: "breach",
          output:
            "⚠ Faille exploitée (démonstration académique) — la commande a franchi la frontière du sandbox et " +
            "atteint le système hôte. Aucune sanitisation, aucun user-namespace actif.",
        };
      }
      if (mode === "attack") {
        return { status: "ok", output: `bash: ${trimmed} — exécuté sans restriction (mode ATTACK, backend non sécurisé)` };
      }
      return { status: "rejected", output: `Commande non autorisée : « ${head} » n'est pas dans la whitelist.` };
  }
}
