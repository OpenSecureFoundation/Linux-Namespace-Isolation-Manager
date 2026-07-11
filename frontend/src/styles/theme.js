/**
 * Design tokens — direction "Technical Dossier".
 * Papier crème, ombre décalée dure, JetBrains Mono en libellés/titres,
 * Work Sans pour le corps. Vert forêt de l'Institut Saint Jean en accent
 * primaire, tons chauds neutres autour. Angles nets (radius 0-2px), pas
 * de gradient ni de glassmorphism.
 */
export const COLORS = {
  // Papier
  paper: "#F7F5F2",
  paperRaised: "#FFFFFF",
  paperSoft: "#FDFCFB",

  // Encre
  ink: "#1A1A1A",
  inkStrong: "#4A4A48",
  inkSoft: "#6B6B66",
  inkFaint: "#A09D96",

  // Filets
  border: "#D1CEC7",
  borderSoft: "#EAE8E4",
  borderStrong: "#B8B4AB",

  // Accent primaire (vert Institut)
  green: "#1F7A4C",
  greenDeep: "#165a38",
  greenTint: "rgba(31,122,76,0.08)",
  greenTintStrong: "rgba(31,122,76,0.14)",
  greenLine: "#1F7A4C",

  // Accents secondaires — pas de bleu SaaS. Rouille pour ATTACK, ambre pour warn.
  rust: "#B84A2E",
  rustTint: "rgba(184,74,46,0.08)",
  amber: "#B8801F",
  amberTint: "rgba(184,128,31,0.10)",

  // Aliases hérités pour ne pas casser les composants qui les référencent
  blue: "#B84A2E",
  blueTint: "rgba(184,74,46,0.08)",
  blueSoft: "#8C6A3E",
  blueSoftTint: "rgba(140,106,62,0.10)",

  // Terminal (élément signature, reste sombre)
  term: "#0F0F0E",
  termRaised: "#141412",
  termLine: "#2A2A26",
  termInk: "#DCE6DF",
  termBlue: "#E39A7A",
  phosphor: "#7CE3A6",
  phosphorDim: "#4C8F6A",

  // Ombre signature "dossier posé"
  shadowDossier: "8px 8px 0px 0px rgba(209,206,199,0.55)",
  shadowDossierSm: "4px 4px 0px 0px rgba(209,206,199,0.55)",
};

export const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";
export const FONT_DISPLAY = "'JetBrains Mono', ui-monospace, monospace";
export const FONT_SANS = "'Work Sans', system-ui, sans-serif";
